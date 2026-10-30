const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const SITE = 'https://ritty.example.test'
const ADMIN = 'admin@example.test'
const ARTICLE = 'a'.repeat(32)
const PAGE = n => n.toString(16).padStart(32, '0')
const ORIGINAL_ENV = { ...process.env }
const originalFetch = global.fetch
const seen = { auth: [], news: [], lookup: [], create: [], retries: [], dispatch: [] }
let article, candidates, pages, jobs, authenticated, storageFailure, dispatchMode

function fixture() {
  process.env.NOTION_TOKEN = 'offline-notion-secret'
  process.env.NOTION_PRE_REGISTER_DB_ID = 'b'.repeat(32)
  process.env.NEWSLETTER_QUEUE_PAGE_ID = 'c'.repeat(32)
  process.env.MARKETING_UNSUBSCRIBE_SECRET = 'offline-stable-secret-'.repeat(3)
  process.env.NEWSLETTER_FROM_EMAIL = 'news@example.test'
  process.env.NEWSLETTER_COMPANY_ADDRESS = 'Test company address'
  process.env.NEWSLETTER_GITHUB_TOKEN = 'offline-github-secret'
  process.env.NEXT_PUBLIC_SITE_URL = SITE
  process.env.NEWSLETTER_ENABLED = 'true'
  delete process.env.GOOGLE_REFRESH_TOKEN
  delete process.env.NEWSLETTER_GITHUB_REPOSITORY
  delete process.env.NEWSLETTER_GITHUB_REF
  for (const values of Object.values(seen)) values.length = 0
  article = { id: ARTICLE, title: '개발일지 <img src=x onerror=alert(1)>', category: '개발 소식', date: '2026-10-25', language: 'KO',
    modifiedAt: '2026-10-25T01:02:03.000Z', cover: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/image.png?X-Amz-Signature=secret',
    blocks: [{ type: 'paragraph', text: '오늘의 개발 소식 <script>alert(1)</script>' }, { type: 'image', text: 'Ignored caption' }, { type: 'paragraph', text: '다음 주에도 만나요.' }] }
  candidates = [
    { pageId: PAGE(1), email: 'Person@EXAMPLE.test', locale: 'kr' },
    { pageId: PAGE(2), email: ' person@example.test ', locale: 'kr' },
    { pageId: PAGE(3), email: 'another@example.test', locale: 'kr' },
  ]
  pages = [{ items: [article], cursor: null }]
  jobs = new Map()
  authenticated = true
  storageFailure = false
  dispatchMode = 204
}

const mockedAuth = {
  async requireNewsletterAdmin(request, mutation = false) {
    seen.auth.push({ mutation, url: request.url })
    if (!authenticated) throw Object.assign(new Error('unauthorized'), { mockAuthStatus: 401 })
    if (mutation && request.headers.get('origin') !== SITE) throw Object.assign(new Error('invalid_origin'), { mockAuthStatus: 403 })
    return { email: ADMIN }
  },
  newsletterAuthResponse(error) {
    return error.mockAuthStatus ? Response.json({ error: error.message }, { status: error.mockAuthStatus, headers: { 'Cache-Control': 'private, no-store' } }) : null
  },
}
function view(details) {
  const counts = { pending: 0, sending: 0, submitted: 0, failed: 0, unknown: 0, skipped: 0 }
  for (const { value } of details.deliveries) counts[value.status]++
  return { ...details.job, approvalToken: '', counts, total: details.deliveries.length,
    failures: details.deliveries.filter(({ value }) => ['unknown', 'failed'].includes(value.status)).map(({ value }) => ({ email: value.email, status: value.status, retryable: value.retryable })) }
}
const mocks = {
  'lib/news.ts': {
    async getNews(cursor, locale) { seen.news.push({ cursor, locale }); return pages[Number(cursor || 0)] || { items: [], cursor: null } },
    async getNewsArticle(id, locale) { seen.news.push({ id, locale }); return article },
  },
  'lib/marketing-subscription.ts': { async listMarketingCandidates() { return candidates } },
  'lib/newsletter-auth.ts': mockedAuth,
  'lib/newsletter-store.ts': {
    async listNewsletterJobIds(key) { seen.lookup.push(key); return [...jobs].filter(([, details]) => !key || details.job.key === key).map(([id]) => id) },
    async readNewsletterJob(id) { if (storageFailure) throw new Error('internal-notion-response-secret'); return structuredClone(jobs.get(id)) },
    async createNewsletterJob(job) {
      seen.create.push(structuredClone(job))
      if (storageFailure) throw new Error('internal-notion-response-secret')
      const id = PAGE(100 + jobs.size)
      const created = { ...job, id }
      jobs.set(id, { job: created, metadataBlock: PAGE(200), deliveries: [], retries: [] })
      return created
    },
    async requestNewsletterRetry(id) { seen.retries.push(id); jobs.get(id).retries.push({ blockId: PAGE(201), value: { requestedAt: new Date().toISOString(), handled: false } }) },
    newsletterJobView: view,
  },
}
const cache = new Map()
function load(relative) {
  relative = path.relative(process.cwd(), path.resolve(relative)).replaceAll(path.sep, '/')
  if (mocks[relative]) return mocks[relative]
  if (cache.has(relative)) return cache.get(relative).exports
  const module = { exports: {} }
  cache.set(relative, module)
  const source = ts.transpileModule(fs.readFileSync(relative, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
  const localRequire = name => {
    if (name === 'server-only') return {}
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    if (name.startsWith('.')) return load(path.resolve(path.dirname(relative), name) + '.ts')
    return require(name)
  }
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports)
  return module.exports
}
const service = load('lib/newsletter-service.ts')
const approval = load('lib/newsletter-approval.ts')
const routes = {
  overview: load('app/api/admin/newsletter/route.ts'),
  preview: load('app/api/admin/newsletter/preview/route.ts'),
  send: load('app/api/admin/newsletter/send/route.ts'),
  jobs: load('app/api/admin/newsletter/jobs/route.ts'),
  retry: load('app/api/admin/newsletter/retry/route.ts'),
}
global.fetch = async (url, options) => {
  assert.equal(url, 'https://api.github.com/repos/SamMeows/Ritty_Homepage/actions/workflows/gmail-newsletter.yml/dispatches')
  assert.equal(options.redirect, 'error')
  assert.equal(options.cache, 'no-store')
  assert.equal(options.method, 'POST')
  seen.dispatch.push(JSON.parse(options.body))
  if (dispatchMode === 'network') throw new Error('upstream-secret-error')
  return new Response(null, { status: dispatchMode })
}
function request(endpoint, body, extra = {}) {
  return new Request(SITE + '/api/admin/newsletter' + endpoint, body === undefined ? extra : {
    method: 'POST', headers: { origin: SITE, 'content-type': 'application/json', ...extra.headers }, body: JSON.stringify(body),
  })
}
const fails = (promise, code) => assert.rejects(promise, error => error instanceof service.NewsletterServiceError && error.code === code)
const makePreview = (extra = {}) => service.previewNewsletter({ articleId: ARTICLE, locale: 'kr', ...extra })
async function createJob() {
  const preview = await makePreview()
  const result = await service.sendApprovedNewsletter({ approvalToken: preview.approvalToken }, ADMIN)
  return jobs.get(result.job.id)
}
function delivery(status, retryable) { return { blockId: PAGE(300), value: { key: 'one', pageIds: [PAGE(1)], email: 'person@example.test', locale: 'kr', status, updatedAt: new Date().toISOString(), retryable } } }

async function main() {
  fixture()
  article.language = 'ZH-TW'
  article.title = 'Ritty 開發消息'
  article.blocks = [{ type: 'paragraph', text: '一起看看最新的開發進度。' }]
  candidates[0].locale = 'zh-tw'
  assert.equal(service.newsletterLocale('zh-tw'), 'zh-tw')
  assert.equal((await service.listNewsletterArticles('zh-tw')).length, 1)
  const chinesePreview = await makePreview({ locale: 'zh-tw' })
  assert.equal(chinesePreview.candidateCount, 1, 'only Traditional Chinese subscribers are included')
  assert.equal(chinesePreview.draft.articleUrl, SITE + '/zh-tw/news/' + ARTICLE)
  assert.ok(chinesePreview.html.includes('lang="zh-TW"'))
  assert.ok(chinesePreview.html.includes('/unsubscribe?lang=zh-tw'))
  assert.ok(chinesePreview.html.includes('取消訂閱'))
  assert.deepEqual(approval.verifyNewsletterApproval(chinesePreview.approvalToken).recipients.map(row => row.pageId), [PAGE(1)])
  const chineseJob = await service.sendApprovedNewsletter({ approvalToken: chinesePreview.approvalToken }, ADMIN)
  assert.equal(chineseJob.job.draft.locale, 'zh-tw')
  article.language = 'KO'
  await fails(makePreview({ locale: 'zh-tw' }), 'article_not_available')

  fixture()
  const preview = await makePreview()
  assert.equal(preview.candidateCount, 2)
  assert.equal(preview.draft.articleUrl, SITE + '/news/' + ARTICLE)
  assert.equal(preview.draft.coverUrl, undefined)
  assert.ok(preview.draft.subject.startsWith('(광고) '))
  assert.equal((preview.draft.subject.match(/\(광고\)/g) || []).length, 1)
  assert.ok(preview.html.includes('&lt;script&gt;'))
  assert.ok(!preview.html.includes('<script>'))
  assert.ok(!preview.html.includes('Ignored caption'))
  assert.ok(!JSON.stringify(preview).includes('person@example.test'))
  const frozen = approval.verifyNewsletterApproval(preview.approvalToken)
  assert.equal(frozen.recipients.length, 3)
  assert.equal(frozen.recipients[0].emailHash, frozen.recipients[1].emailHash)
  assert.deepEqual(frozen.draft, JSON.parse(JSON.stringify(preview.draft)))
  assert.equal(new Date(preview.expiresAt).getTime() - frozen.issuedAt, 30 * 60_000)
  assert.equal(seen.dispatch.length, 0)

  for (const unsafe of ['http://cdn.example.test/cover.png', 'javascript:alert(1)', 'https://user:password@cdn.example.test/a.png', 'https://cdn.example.test/a.png?X-Amz-Signature=secret',
    'https://cdn.example.test/a.png?Expires=123', 'https://cdn.example.test/a.png?token=secret', 'https://secure.notion-static.com/a.png', 'https://www.notion.so/image/a.png', 'https://file.notionusercontent.com/a.png',
    'https://s3-us-west-2.amazonaws.com/secure.notion-static.com/a.png', 'https://127.0.0.1/a.png', 'https://[::1]/a.png']) {
    assert.equal(service.persistentNewsletterCover(unsafe), undefined, unsafe)
  }
  assert.equal(service.persistentNewsletterCover('https://cdn.example.test/a.png?width=800'), 'https://cdn.example.test/a.png?width=800')
  await fails(makePreview({ coverUrl: 'https://cdn.example.test/a.png?sig=secret' }), 'invalid_cover_url')
  await fails(makePreview({ subject: 'hello\r\nBcc: someone@example.test' }), 'invalid_text')
  await fails(makePreview({ summary: 'x'.repeat(4001) }), 'invalid_text')
  await fails(makePreview({ articleUrl: 'https://attacker.example.test/' }), 'invalid_request')
  await fails(makePreview({ locale: 'zh-cn' }), 'invalid_locale')
  await fails(makePreview({ articleId: '../pages' }), 'invalid_id')
  const prefixed = await makePreview({ subject: '(광고) (광고) 제목' })
  assert.equal(prefixed.draft.subject, '(광고) 제목')
  const savedTitle = article.title
  article.title = '🐾'.repeat(200)
  const unicode = await makePreview()
  assert.ok(unicode.draft.subject.length <= 200)
  assert.ok(!/[\ud800-\udbff]$/.test(unicode.draft.subject))
  article.title = savedTitle

  for (const change of [{ category: '팀 레터' }, { language: 'EN' }, { id: PAGE(99) }]) {
    fixture(); Object.assign(article, change)
    await fails(makePreview(), 'article_not_available')
  }
  fixture(); article.modifiedAt = undefined
  await fails(makePreview(), 'article_revision_unavailable')
  fixture(); candidates = []
  await fails(makePreview(), 'no_recipients')
  fixture(); candidates = Array.from({ length: 501 }, (_, n) => ({ pageId: PAGE(n), email: `person${n}@example.test`, locale: 'kr' }))
  await fails(makePreview(), 'too_many_recipients')
  fixture(); candidates.push({ ...candidates[0], email: 'changed@example.test' })
  await fails(makePreview(), 'recipients_changed')

  fixture()
  pages = [{ items: [{ ...article, category: '공지사항' }, article], cursor: '1' }, { items: [article, { ...article, id: PAGE(10), language: 'EN' }], cursor: null }]
  const overview = await service.getNewsletterOverview('kr')
  assert.equal(overview.articles.length, 1)
  assert.equal(overview.articles[0].cover, undefined)
  assert.equal(overview.configuration.ready, true)
  assert.ok(!overview.configuration.missing.includes('GOOGLE_REFRESH_TOKEN'))
  assert.equal(process.env.GOOGLE_REFRESH_TOKEN, undefined)
  assert.equal(seen.news.length, 2)
  fixture(); pages = [{ items: [], cursor: null, unavailable: true }]
  await fails(service.getNewsletterOverview('kr'), 'articles_unavailable')

  fixture()
  const ready = await makePreview()
  const sent = await service.sendApprovedNewsletter({ approvalToken: ready.approvalToken }, ADMIN)
  assert.equal(sent.reused, false)
  assert.equal(sent.dispatched, true)
  assert.equal(sent.job.approvalToken, '')
  assert.equal(sent.job.key, ARTICLE + ':kr')
  assert.equal(sent.job.approvedBy, ADMIN)
  assert.deepEqual(seen.dispatch, [{ ref: 'master' }])
  assert.equal(seen.create.length, 1)
  assert.equal(seen.create[0].approvalToken, ready.approvalToken)
  assert.deepEqual(seen.lookup, [ARTICLE + ':kr'])
  const changedPreview = await makePreview({ summary: 'A different draft cannot create a second campaign.' })
  const reused = await service.sendApprovedNewsletter({ approvalToken: changedPreview.approvalToken }, ADMIN)
  assert.equal(reused.reused, true)
  assert.equal(reused.job.id, sent.job.id)
  assert.equal(reused.job.draft.summary, sent.job.draft.summary)
  assert.equal(seen.create.length, 1)
  const before = seen.dispatch.length
  jobs.get(sent.job.id).job.status = 'completed'
  await service.sendApprovedNewsletter({ approvalToken: changedPreview.approvalToken }, ADMIN)
  assert.equal(seen.dispatch.length, before)

  await fails(service.sendApprovedNewsletter({ approvalToken: ready.approvalToken + 'x' }, ADMIN), 'invalid_approval')
  const expired = approval.approveNewsletter(ready.draft, frozen.recipients, Date.now() - 31 * 60_000)
  await fails(service.sendApprovedNewsletter({ approvalToken: expired.token }, ADMIN), 'invalid_approval')
  article.modifiedAt = '2026-10-26T00:00:00.000Z'
  await fails(service.sendApprovedNewsletter({ approvalToken: ready.approvalToken }, ADMIN), 'article_changed')
  process.env.NEWSLETTER_ENABLED = 'false'
  await fails(service.sendApprovedNewsletter({ approvalToken: ready.approvalToken }, ADMIN), 'newsletter_disabled')
  assert.equal(seen.create.length, 1)

  for (const mode of [401, 500, 'network']) {
    fixture(); dispatchMode = mode
    const result = await createJob()
    assert.equal(result.job.status, 'queued')
    assert.equal(jobs.size, 1)
    assert.equal(seen.dispatch.length, 1)
  }

  fixture()
  let details = await createJob()
  details.job.status = 'attention'; details.job.prepared = true
  details.deliveries = [delivery('unknown')]
  await fails(service.retryNewsletterJob({ id: details.job.id }), 'nothing_retryable')
  assert.equal(seen.retries.length, 0)
  details.deliveries.push(delivery('pending'))
  const states = details.deliveries.map(item => item.value.status)
  await service.retryNewsletterJob({ id: details.job.id })
  await service.retryNewsletterJob({ id: details.job.id })
  assert.equal(seen.retries.length, 1)
  assert.deepEqual(details.deliveries.map(item => item.value.status), states)
  for (const row of [delivery('failed', false), delivery('submitted'), delivery('sending')]) {
    details.deliveries = [row]
    await fails(service.retryNewsletterJob({ id: details.job.id }), 'nothing_retryable')
  }
  details.deliveries = [delivery('failed', true)]
  await service.retryNewsletterJob({ id: details.job.id })
  details.deliveries = []; details.job.prepared = false
  await service.retryNewsletterJob({ id: details.job.id })
  details.job.status = 'completed'
  await fails(service.retryNewsletterJob({ id: details.job.id }), 'nothing_retryable')

  for (const [name, endpoint, method] of [['overview', '', 'GET'], ['preview', '/preview', 'POST'], ['send', '/send', 'POST'], ['jobs', '/jobs', 'GET'], ['retry', '/retry', 'POST']]) {
    fixture(); authenticated = false
    const response = await routes[name][method](request(endpoint, method === 'POST' ? {} : undefined))
    assert.equal(response.status, 401, name)
    assert.match(response.headers.get('cache-control'), /private.*no-store/)
    assert.equal(seen.news.length + seen.lookup.length + seen.create.length + seen.dispatch.length + seen.retries.length, 0)
    assert.equal(seen.auth[0].mutation, method === 'POST', name)
  }

  fixture()
  for (const name of ['preview', 'send', 'retry']) {
    const response = await routes[name].POST(request('/' + name, {}, { headers: { origin: 'https://attacker.example.test' } }))
    assert.equal(response.status, 403)
  }
  let response = await routes.preview.POST(request('/preview', { articleId: ARTICLE, locale: 'kr' }))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /private.*no-store/)
  const apiPreview = await response.json()
  response = await routes.send.POST(request('/send', { approvalToken: apiPreview.approvalToken, approvedBy: 'attacker@example.test' }))
  assert.equal(response.status, 400)
  assert.equal(seen.create.length, 0)
  response = await routes.send.POST(request('/send', { approvalToken: apiPreview.approvalToken }))
  assert.equal(response.status, 202)
  const apiJob = (await response.json()).job
  assert.equal(apiJob.approvedBy, ADMIN)
  response = await routes.jobs.GET(request('/jobs?id=' + apiJob.id))
  assert.equal((await response.json()).job.id, apiJob.id)
  response = await routes.jobs.GET(request('/jobs'))
  assert.equal((await response.json()).jobs.length, 1)
  response = await routes.jobs.GET(request('/jobs?id=invalid'))
  assert.equal(response.status, 400)

  response = await routes.preview.POST(new Request(SITE + '/api/admin/newsletter/preview', { method: 'POST', headers: { origin: SITE, 'content-type': 'application/json' }, body: '{' }))
  assert.equal(response.status, 400)
  response = await routes.preview.POST(request('/preview', { padding: 'x'.repeat(200_000) }))
  assert.equal(response.status, 413)
  response = await routes.preview.POST(request('/preview', {}, { headers: { 'content-type': 'text/plain' } }))
  assert.equal(response.status, 415)
  storageFailure = true
  response = await routes.jobs.GET(request('/jobs?id=' + apiJob.id))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'request_failed' })

  fixture(); storageFailure = true
  const failPreview = await makePreview()
  response = await routes.send.POST(request('/send', { approvalToken: failPreview.approvalToken }))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: 'request_failed' })
  assert.equal(seen.dispatch.length, 0)

  console.log('Newsletter service/API checks passed (offline; no Google, Notion or GitHub requests sent).')
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  global.fetch = originalFetch
  for (const key of Object.keys(process.env)) if (!(key in ORIGINAL_ENV)) delete process.env[key]
  Object.assign(process.env, ORIGINAL_ENV)
})
