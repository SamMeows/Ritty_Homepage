'use client'

import { trackRegistrationFunnel } from '@/lib/analytics'

import NewsLanguageLinks from './NewsLanguageLinks'
import { useEffect, useRef, useState } from 'react'
import type { NewsArticle as Article } from '@/lib/news'
import NewsArticle from './NewsArticle'
import type { Locale } from '@/lib/i18n/dictionaries'
import { newsCopy } from '@/lib/i18n/news-copy'

export default function NewsModal({id, onClose, locale = 'kr'}: {id: string; onClose: () => void; locale?:Locale}) {
  const t = (text:string) => newsCopy(locale, text)
  const dialog = useRef<HTMLDialogElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [currentId, setCurrentId] = useState(id)

  useEffect(() => {
    const element = dialog.current!
    const previousOverflow = document.body.style.overflow
    const previousPadding = document.body.style.paddingRight
    const gap = innerWidth - document.documentElement.clientWidth
    document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gap}px`
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPadding
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setArticle(null); setError('')
    viewport.current?.scrollTo(0, 0)
    fetch('/api/news/' + encodeURIComponent(currentId) + '?locale=' + locale, {signal: controller.signal})
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 404 ? newsCopy(locale, '이 소식은 공개되지 않았거나 삭제되었어요.') : newsCopy(locale, '소식을 불러오지 못했어요.'))
        return response.json() as Promise<Article>
      })
      .then(article => { if (!controller.signal.aborted) { setArticle(article); trackRegistrationFunnel('news_load_success', locale, { article_id: currentId }) } })
      .catch(reason => { if (!controller.signal.aborted) { trackRegistrationFunnel('news_load_error', locale, { article_id: currentId }); setError(reason.message || newsCopy(locale, '소식을 불러오지 못했어요.')) } })
    return () => controller.abort()
  }, [currentId, retry, locale])

  return <dialog ref={dialog} className="news-modal" aria-label={t('리티 소식')} onClose={onClose}
    onClick={event => {
      if (event.target === event.currentTarget) {
        const bounds = event.currentTarget.getBoundingClientRect()
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.currentTarget.close()
      }
    }}>
    <div className="news-modal-bar"><span>{t('Ritty 소식')}</span><button type="button" aria-label={t('소식 닫기')} onClick={() => dialog.current?.close()}>×</button></div>
    {article && <NewsLanguageLinks locale={locale} alternatePaths={article.alternatePaths}/>}
    <div ref={viewport} className="news-modal-scroll" onClick={event => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      const next = link?.getAttribute('href')?.match(/^\/(?:en\/|ja\/|zh-tw\/)?news\/([a-f\d-]+)$/i)
      const destinationLocale = link?.getAttribute('href')?.startsWith('/en/') ? 'en' : link?.getAttribute('href')?.startsWith('/ja/') ? 'ja' : 'kr'
      if (next && (destinationLocale === locale || (locale === 'zh-tw' && destinationLocale === 'kr')) && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); setCurrentId(next[1]) }
    }}>
      {article ? <NewsArticle article={article}/> : error ? <div className="news-modal-state" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>{t('다시 불러오기')}</button></div> : <p className="news-modal-state" role="status">{t('소식을 불러오는 중이에요…')}</p>}
    </div>
  </dialog>
}
