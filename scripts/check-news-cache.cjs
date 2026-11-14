// Exercise Next's real unstable_cache with an in-memory Data Cache backend.
// All CMS traffic is mocked; no credentials or live writes are involved.
const assert = require('node:assert/strict')
global.AsyncLocalStorage = require('node:async_hooks').AsyncLocalStorage
const { load } = require('./load-typescript.cjs')
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external')
const nextCache = require('next/cache')
const entries = new Map()
let now = 0
global.__incrementalCache = {
  generateSimpleCacheKey: async key => key,
  get: async key => {
    const entry = entries.get(key)
    return entry ? { value: entry.value, isStale: now - entry.time >= entry.value.revalidate * 1000 } : null
  },
  set: async (key, value) => { entries.set(key, { value, time: now }) },
}
async function request(fn) {
  const store = { route: '/test', nextFetchId: 1 }
  const result = await workAsyncStorage.run(store, fn)
  await Promise.all(Object.values(store.pendingRevalidates || {}))
  return result
}
process.env.NOTION_NEWS_TOKEN = 'mock'
process.env.NOTION_NEWS_DATA_SOURCE_ID = 'b'.repeat(32)
let calls = 0, fail = false, title = 'First title'
global.fetch = async () => {
  calls++
  if (fail) return new Response('', { status: 503 })
  return Response.json({ results: [{ id: 'a'.repeat(32), properties: {
    '공개': { checkbox: true }, '제목': { title: [{ plain_text: title }] },
    '게시일': { date: { start: '2026-01-01' } },
  } }], has_more: false })
}

async function main() {
  const news = load('lib/news.ts', { 'next/cache': nextCache })
  const first = await request(() => news.getNews())
  assert.equal(first.items[0].title, 'First title')
  await request(() => news.getNews())
  assert.equal(calls, 1, 'Repeated public reads must use the Data Cache')
  await request(() => news.getNews(undefined, 'en'))
  await request(() => news.getNews('page-two'))
  assert.equal(calls, 3, 'Locale and cursor must have separate cache entries')
  await news.newsRequest('admin-fresh-read')
  await news.newsRequest('admin-fresh-read')
  assert.equal(calls, 5, 'Uncached operations must remain fresh')
  now += 301000
  fail = true
  const originalError = console.error
  let refreshErrors = 0
  console.error = () => { refreshErrors++ }
  try {
    assert.deepEqual(await request(() => news.getNews()), first)
    assert(refreshErrors > 0, 'A failed refresh must preserve the prior result')
    assert.equal((await request(() => news.getNews('cold-failure'))).unavailable, true)
  } finally { console.error = originalError }
  fail = false
  title = 'Updated title'
  await request(() => news.getNews())
  assert.equal((await request(() => news.getNews())).items[0].title, title)

  entries.clear()
  let unavailable = false, sitemapCalls = 0
  const sitemap = load('app/sitemap.ts', {
    'next/cache': nextCache,
    '@/lib/news': { getNews: async (_cursor, locale) => {
      sitemapCalls++
      if (unavailable && locale === 'ja') return { items: [], cursor: null, unavailable: true }
      const id = { kr: '1', en: '2', ja: '3', 'zh-tw': '4' }[locale].repeat(32)
      return { items: [{ id, language: { kr: 'KO', en: 'EN', ja: 'JA', 'zh-tw': 'ZH-TW' }[locale],
        originalId: locale === 'kr' ? undefined : '1'.repeat(32),
        translationIds: locale === 'kr' ? ['2', '3', '4'].map(id => id.repeat(32)) : undefined,
      }], cursor: null }
    } },
  })
  const snapshot = await request(() => sitemap.default())
  assert.equal(snapshot.length, 12)
  const articles = snapshot.filter(entry => /news\//.test(entry.url))
  assert(articles.every(entry => Object.keys(entry.alternates.languages).length === 4), 'All translations must have reciprocal alternates')
  await request(() => sitemap.default())
  assert.equal(sitemapCalls, 4, 'A cached sitemap must not query Notion again')
  now += 301000
  unavailable = true
  console.error = () => {}
  try {
    assert.deepEqual(await request(() => sitemap.default()), snapshot, 'A partial failure must retain every previous URL')
    entries.clear()
    await assert.rejects(request(() => sitemap.default()), /source unavailable/, 'Cold failures must not publish partial sitemaps')
  } finally { console.error = originalError }
  unavailable = false
  assert.deepEqual(await request(() => sitemap.default()), snapshot, 'Recovery must generate a complete snapshot')
  console.log('Passed: real Next Data Cache hits, locale/cursor isolation, uncached reads, stale retention, recovery, reciprocal sitemap alternates and cold failure behavior.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
