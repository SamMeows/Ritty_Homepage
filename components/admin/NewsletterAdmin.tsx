'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { NewsItem } from '@/lib/news'
import type { NewsletterConfiguration, NewsletterJobView, NewsletterLocale, NewsletterPreview } from '@/lib/newsletter-types'
import './newsletter-admin.css'

type Overview = { configuration: NewsletterConfiguration; articles: NewsItem[]; jobs: NewsletterJobView[] }
type Session = { authenticated: boolean; email?: string }
type Activity = 'preview' | 'send' | 'retry' | 'logout' | null
const ROOT = '/api/admin/newsletter'
const localeNames = { kr: '한국어', en: 'English', ja: '日本語' }
const statusNames = { queued: '발송 대기', sending: '발송 중', completed: '처리 완료', attention: '확인 필요', duplicate: '이미 요청한 글' }
const messages: Record<string, string> = {
  unauthorized: '로그인이 만료됐어요. 다시 로그인해 주세요.', forbidden: '등록된 관리자 계정으로 로그인해 주세요.',
  auth_not_configured: '관리자 로그인 연결 설정이 필요합니다.', invalid_origin: '요청을 확인할 수 없어요. 이 페이지를 새로고침해 주세요.',
  preview_expired: '미리보기 유효 시간이 지났어요. 다시 만들어 주세요.', invalid_approval: '미리보기를 다시 만든 뒤 발송해 주세요.',
  invalid_approval_token: '미리보기를 다시 만든 뒤 발송해 주세요.', newsletter_disabled: '아직 실제 발송이 활성화되지 않았어요.',
  invalid_locale: '메일 언어를 다시 선택해 주세요.', invalid_id: '개발일지를 다시 선택해 주세요.', invalid_text: '제목과 소개의 길이와 내용을 확인해 주세요.',
  invalid_cover_url: '대표 이미지에는 계속 열리는 공개 HTTPS 주소를 사용해 주세요. 노션 임시 주소는 사용할 수 없어요.',
  article_not_available: '이 글을 불러올 수 없어요. 노션 공개 상태와 선택한 언어를 확인해 주세요.',
  article_revision_unavailable: '글의 최신 수정 정보를 확인할 수 없어요. 잠시 후 다시 미리보기를 만들어 주세요.',
  articles_unavailable: '개발일지 목록을 불러오지 못했어요. 잠시 후 새로고침해 주세요.',
  recipients_changed: '수신 대상이 달라졌어요. 미리보기를 다시 만든 뒤 확인해 주세요.', no_recipients: '현재 발송 가능한 수신 동의자가 없어요.',
  too_many_recipients: '발송 후보가 한 번에 처리할 수 있는 범위를 넘었어요. 발송 설정을 확인해 주세요.',
  newsletter_not_configured: '발송 연결 설정을 완료한 뒤 다시 시도해 주세요.', article_changed: '개발일지가 수정됐어요. 최신 내용으로 미리보기를 다시 만들어 주세요.',
  campaign_needs_review: '기존 발송 기록을 먼저 확인해 주세요.', nothing_retryable: '현재 이어 보내거나 재시도할 수 있는 건이 없어요.',
}

class ApiError extends Error {
  constructor(public status: number, public code: string) { super(messages[code] || '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.') }
}

async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(ROOT + path, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, typeof data.error === 'string' ? data.error : 'request_failed')
  return data as T
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NewsletterAdmin() {
  const [session, setSession] = useState<Session | null>(null)
  const [loginUnavailable, setLoginUnavailable] = useState(false)
  const [locale, setLocale] = useState<NewsletterLocale>('kr')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(false)
  const [articleId, setArticleId] = useState('')
  const [subject, setSubject] = useState('')
  const [summary, setSummary] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [preview, setPreview] = useState<NewsletterPreview | null>(null)
  const [job, setJob] = useState<NewsletterJobView | null>(null)
  const [activity, setActivity] = useState<Activity>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [clock, setClock] = useState(Date.now())
  const busy = useRef(false)
  const selectedJob = useRef<string | null>(null)
  const authenticated = session?.authenticated === true

  const handleError = useCallback((failure: unknown) => {
    if (failure instanceof DOMException && failure.name === 'AbortError') return
    if (failure instanceof ApiError && (failure.status === 401 || failure.status === 403)) {
      setSession({ authenticated: false }); setOverview(null); setPreview(null); setJob(null); selectedJob.current = null
    }
    setError(failure instanceof Error ? failure.message : '요청을 처리하지 못했어요. 다시 시도해 주세요.')
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    const authError = new URL(window.location.href).searchParams.get('auth_error')
    if (authError) {
      setError(({ forbidden: '등록된 관리자 Google 계정만 접속할 수 있어요.', expired: '로그인 시간이 지났어요. 다시 로그인해 주세요.', cancelled: '로그인이 취소됐어요.', failed: 'Google 로그인에 실패했어요. 다시 시도해 주세요.' } as Record<string, string>)[authError] || '다시 로그인해 주세요.')
      window.history.replaceState(null, '', '/admin/newsletter')
    }
    api<Session>('/auth/session', undefined, abort.signal).then(setSession).catch(failure => {
      if (abort.signal.aborted) return
      setSession({ authenticated: false }); setLoginUnavailable(failure instanceof ApiError && failure.status === 503); handleError(failure)
    })
    return () => abort.abort()
  }, [handleError])

  useEffect(() => {
    if (!authenticated) return
    const abort = new AbortController()
    setLoading(true); setOverview(null); setArticleId(''); setSubject(''); setSummary(''); setCoverUrl(''); setPreview(null)
    api<Overview>('?locale=' + locale, undefined, abort.signal).then(data => {
      if (!abort.signal.aborted) setOverview(data)
    }).catch(handleError).finally(() => { if (!abort.signal.aborted) setLoading(false) })
    return () => abort.abort()
  }, [authenticated, locale, handleError])

  const rememberJob = useCallback((next: NewsletterJobView) => {
    selectedJob.current = next.id; setJob(next)
    setOverview(current => current ? { ...current, jobs: [next, ...current.jobs.filter(item => item.id !== next.id)] } : current)
  }, [])

  useEffect(() => {
    if (!authenticated || !job || !['queued', 'sending'].includes(job.status)) return
    const id = job.id
    const abort = new AbortController()
    let inFlight = false
    const timer = window.setInterval(() => {
      if (inFlight) return
      inFlight = true
      api<{ job: NewsletterJobView }>('/jobs?id=' + encodeURIComponent(id), undefined, abort.signal)
        .then(data => { if (!abort.signal.aborted && selectedJob.current === id) rememberJob(data.job) }).catch(handleError).finally(() => { inFlight = false })
    }, 10000)
    return () => { abort.abort(); window.clearInterval(timer) }
  }, [authenticated, job?.id, job?.status, rememberJob, handleError])

  useEffect(() => {
    if (!preview) return
    setClock(Date.now())
    const timer = window.setInterval(() => setClock(Date.now()), 15000)
    return () => window.clearInterval(timer)
  }, [preview])

  function invalidatePreview() { setPreview(null); setNotice('') }
  function selectArticle(id: string) {
    setArticleId(id); setSubject(''); setSummary(''); setCoverUrl(''); invalidatePreview(); setError('')
  }
  async function act(kind: Exclude<Activity, null>, task: () => Promise<void>) {
    if (busy.current) return
    busy.current = true; setActivity(kind); setError(''); setNotice('')
    try { await task() } catch (failure) { handleError(failure) }
    finally { busy.current = false; setActivity(null) }
  }
  const makePreview = () => act('preview', async () => {
    setPreview(null)
    const next = await api<NewsletterPreview>('/preview', { articleId, locale, subject: subject.trim() || undefined, summary: summary.trim() || undefined, coverUrl: coverUrl.trim() || undefined })
    setPreview(next); setSubject(next.draft.subject); setSummary(next.draft.summary); setCoverUrl(next.draft.coverUrl || '')
  })
  const send = () => {
    if (!preview) return
    void act('send', async () => {
      const result = await api<{ job: NewsletterJobView; dispatched: boolean; reused?: boolean }>('/send', { approvalToken: preview.approvalToken })
      rememberJob(result.job); setPreview(null)
      setNotice(result.reused ? '이미 발송 요청한 글이에요. 기존 발송 기록을 표시합니다.' : result.dispatched ? '발송을 요청했어요. 아래에서 진행 상태를 확인할 수 있습니다.' : '발송 요청이 저장됐어요. 백그라운드 작업이 시작되면 진행 상태가 갱신됩니다.')
    })
  }
  const retry = () => {
    if (!job) return
    const id = job.id
    void act('retry', async () => {
      const result = await api<{ dispatched: boolean }>('/retry', { id })
      const current = await api<{ job: NewsletterJobView }>('/jobs?id=' + encodeURIComponent(id))
      rememberJob(current.job)
      setNotice(result.dispatched ? '남은 대기 건과 재시도 가능한 실패 건의 처리를 요청했어요.' : '재개 요청이 저장됐어요. 백그라운드 작업이 순서대로 처리합니다.')
    })
  }
  const logout = () => void act('logout', async () => {
    await api<Session>('/auth/logout', {}); setSession({ authenticated: false }); setOverview(null); setPreview(null); setJob(null); selectedJob.current = null
    setArticleId(''); setSubject(''); setSummary(''); setCoverUrl('')
  })
  const refreshJob = async (id: string) => {
    selectedJob.current = id; setError('')
    try {
      const data = await api<{ job: NewsletterJobView }>('/jobs?id=' + encodeURIComponent(id))
      if (selectedJob.current === id) rememberJob(data.job)
    } catch (failure) { handleError(failure) }
  }
  const expired = preview ? new Date(preview.expiresAt).getTime() <= clock : false
  const canSend = !!preview && !expired && preview.candidateCount > 0 && overview?.configuration.ready && overview.configuration.enabled
  const selected = overview?.articles.find(article => article.id === articleId)
  const retryable = job?.status === 'attention' && (!job.prepared || job.counts.pending > 0 || job.failures.some(item => item.status === 'failed' && item.retryable))

  return <main className="newsletter-admin">
    <div className="newsletter-admin__inner">
      <header className="newsletter-admin__topbar">
        <a className="newsletter-admin__brand" href="/kr">Ritty<span>개발일지 메일</span></a>
        {authenticated && <div className="newsletter-admin__account"><span>{session.email}</span><button className="newsletter-admin__text-button" onClick={logout} disabled={activity !== null}>로그아웃</button></div>}
      </header>
      <div className="newsletter-admin__intro"><span className="newsletter-admin__eyebrow">RITTY POST OFFICE</span><h1>개발 이야기를 전해요.</h1><p>노션에 쓴 개발일지를 확인하고, 수신에 동의한 사람들에게 보내세요.</p></div>
      {error && <div className="newsletter-admin__message newsletter-admin__message--error" role="alert">{error}</div>}
      {notice && <div className="newsletter-admin__message" role="status">{notice}</div>}

      {session === null ? <section className="newsletter-admin__card" aria-busy="true"><p>로그인 상태를 확인하고 있어요…</p></section>
        : !authenticated ? <section className="newsletter-admin__card newsletter-admin__login">
          <div className="newsletter-admin__stamp" aria-hidden="true">✉</div><h2>관리자 전용 공간이에요.</h2><p>등록된 Google 계정으로 로그인하면<br />개발일지 미리보기와 발송 내역을 볼 수 있어요.</p>
          {loginUnavailable ? <button disabled className="newsletter-admin__primary">로그인 연결 설정 필요</button> : <a className="newsletter-admin__primary" href={ROOT + '/auth/login'}>Google 계정으로 로그인</a>}
          <p className="newsletter-admin__hint">로그인은 계정 확인에만 사용해요. 관리자 로그인에서 Gmail 읽기 권한을 요청하지 않습니다.</p>
        </section> : <>
          <div className="newsletter-admin__toolbar"><label htmlFor="newsletter-locale">메일 언어</label><select id="newsletter-locale" value={locale} onChange={event => { setLocale(event.target.value as NewsletterLocale); setError(''); setNotice('') }} disabled={activity !== null}>
            {Object.entries(localeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select><span className="newsletter-admin__hint">선택한 언어의 개발일지와 수신 대상에 적용됩니다.</span></div>
          {loading && <div className="newsletter-admin__card" aria-busy="true">개발일지를 불러오고 있어요…</div>}
          {overview && <>
            {(!overview.configuration.ready || !overview.configuration.enabled) && <aside className="newsletter-admin__message newsletter-admin__message--setup">
              <strong>{!overview.configuration.enabled ? '실제 발송이 꺼져 있어요.' : '발송 연결 설정이 필요해요.'}</strong><p>설정을 완료하면 미리보기를 확인하고 전체 발송할 수 있습니다.</p>
              {!!overview.configuration.missing.length && <details><summary>필요한 설정 보기</summary><ul>{overview.configuration.missing.map(item => <li key={item}><code>{item}</code></li>)}</ul></details>}
            </aside>}
            <div className="newsletter-admin__workspace">
              <section className="newsletter-admin__card newsletter-admin__editor"><div className="newsletter-admin__section-heading"><span>01</span><h2>이번 개발일지</h2></div>
                <label htmlFor="newsletter-article">노션에서 공개한 글</label><select id="newsletter-article" value={articleId} onChange={event => selectArticle(event.target.value)} disabled={activity !== null}>
                  <option value="">개발일지를 선택해 주세요</option>{overview.articles.map(article => <option key={article.id} value={article.id}>{article.title}</option>)}
                </select>
                {!overview.articles.length && <p className="newsletter-admin__hint">이 언어로 공개된 개발일지가 아직 없어요.</p>}
                {selected && <p className="newsletter-admin__hint">{selected.date} · {selected.category}</p>}
                <label htmlFor="newsletter-subject">메일 제목</label><input id="newsletter-subject" value={subject} maxLength={200} placeholder="비워 두면 개발일지 제목으로 만들어요" disabled={activity !== null || !articleId} onChange={event => { setSubject(event.target.value); invalidatePreview() }} />
                <label htmlFor="newsletter-summary">짧은 소개</label><textarea id="newsletter-summary" rows={7} value={summary} maxLength={4000} placeholder="비워 두면 글의 내용에서 소개를 준비해요" disabled={activity !== null || !articleId} onChange={event => { setSummary(event.target.value); invalidatePreview() }} />
                <label htmlFor="newsletter-cover">대표 이미지 주소 <span className="newsletter-admin__optional">선택</span></label><input id="newsletter-cover" type="url" value={coverUrl} maxLength={2048} placeholder="https://…" disabled={activity !== null || !articleId} onChange={event => { setCoverUrl(event.target.value); invalidatePreview() }} />
                <p className="newsletter-admin__hint">메일에서도 계속 열리는 공개 HTTPS 이미지를 사용해 주세요. 노션 임시 이미지 주소는 사용할 수 없어요.</p>
                <button className="newsletter-admin__secondary" disabled={!articleId || activity !== null} onClick={() => void makePreview()}>{activity === 'preview' ? '미리보기 만드는 중…' : '미리보기 만들기'}</button>
              </section>
              <section className="newsletter-admin__card newsletter-admin__preview"><div className="newsletter-admin__section-heading"><span>02</span><h2>확인하고 보내기</h2></div>
                {preview ? <>
                  <div className="newsletter-admin__preview-info"><p><span>보내는 주소</span><strong>{overview.configuration.sender || '설정 필요'}</strong></p><p><span>메일 제목</span><strong>{preview.draft.subject}</strong></p></div>
                  <iframe title="개발일지 이메일 미리보기" srcDoc={preview.html} sandbox="" referrerPolicy="no-referrer" />
                  <div className="newsletter-admin__send-area"><div><strong>발송 후보 {preview.candidateCount.toLocaleString('ko-KR')}명</strong><p className="newsletter-admin__hint">수신거부·차단 상태는 발송 직전에 다시 확인해요.</p></div><button className="newsletter-admin__primary" onClick={send} disabled={!canSend || activity !== null}>{activity === 'send' ? '요청 저장 중…' : '전체 발송'}</button></div>
                  {expired && <p className="newsletter-admin__warning">미리보기 유효 시간이 지났어요. 다시 만든 뒤 발송해 주세요.</p>}
                  <p className="newsletter-admin__hint">버튼을 한 번 누르면 각 수신자에게 개별 메일로 발송해요. 발송은 백그라운드에서 계속됩니다.</p>
                </> : <div className="newsletter-admin__empty"><span aria-hidden="true">↗</span><h3>먼저 미리보기를 만들어 주세요.</h3><p>메일 내용과 수신 대상을 확인한 뒤<br />한 번에 발송할 수 있어요.</p></div>}
              </section>
            </div>
            <section className="newsletter-admin__card newsletter-admin__history"><div className="newsletter-admin__section-heading"><span>03</span><h2>발송 기록</h2></div>
              {job && <div className="newsletter-admin__progress" aria-live="polite"><div className="newsletter-admin__job-title"><div><span className="newsletter-admin__badge">{statusNames[job.status]}</span><h3>{job.draft.subject}</h3><p className="newsletter-admin__hint">{dateLabel(job.createdAt)} · {localeNames[job.draft.locale]}</p></div><button className="newsletter-admin__text-button" onClick={() => void refreshJob(job.id)}>상태 새로고침</button></div>
                <dl className="newsletter-admin__counts">{([['submitted', 'Gmail 접수'], ['pending', '대기'], ['sending', '처리 중'], ['skipped', '제외'], ['failed', '실패'], ['unknown', '확인 필요']] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{job.counts[key]}</dd></div>)}</dl>
                <p className="newsletter-admin__hint">Gmail 접수는 Google이 발송 요청을 받은 상태이며, 최종 도착을 의미하지는 않아요.</p>
                {job.error && <p className="newsletter-admin__warning">{job.error}</p>}
                {job.counts.unknown > 0 && <p className="newsletter-admin__warning">결과를 확인할 수 없는 건은 중복 발송을 막기 위해 자동 재시도하지 않아요. 발신함과 발송 기록을 먼저 확인해 주세요.</p>}
                {!!job.failures.length && <details><summary>확인이 필요한 내역 {job.failures.length}건</summary><ul className="newsletter-admin__failures">{job.failures.map((failure, index) => <li key={failure.email + index}><strong>{failure.email}</strong><span>{failure.status === 'unknown' ? '결과 확인 필요' : '실패'}{failure.status === 'failed' && failure.retryable ? ' · 재시도 가능' : ''}</span>{failure.error && <p>{failure.error}</p>}</li>)}</ul></details>}
                {retryable && <button className="newsletter-admin__secondary" disabled={activity !== null} onClick={retry}>{activity === 'retry' ? '재개 요청 중…' : '대기·재시도 가능한 건 이어 보내기'}</button>}
              </div>}
              {overview.jobs.length ? <ul className="newsletter-admin__jobs">{overview.jobs.map(item => <li key={item.id}><button aria-pressed={job?.id === item.id} onClick={() => void refreshJob(item.id)}><span><strong>{item.draft.title}</strong><small>{dateLabel(item.createdAt)} · {localeNames[item.draft.locale]}</small></span><span className="newsletter-admin__badge">{statusNames[item.status]}</span></button></li>)}</ul> : <p className="newsletter-admin__hint">아직 발송 요청이 없어요. 첫 개발일지를 보내면 여기에 기록됩니다.</p>}
            </section>
          </>}
        </>}
      <footer className="newsletter-admin__footer">Ritty · 관리자 전용</footer>
    </div>
  </main>
}
