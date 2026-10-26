import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { localizeNewsArticle } = require('./load-typescript.cjs').load('lib/i18n/news-articles.ts')
import { run, eligible, payload, STATE, CATEGORY } from './discord-news.mjs'
const source = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const makePage = (id = 'a'.repeat(32)) => ({ id, parent: { data_source_id: source }, properties: {
  '공개': { checkbox: true }, '분류': { select: { name: CATEGORY } }, '언어': { select: { name: 'KO' } },
  '게시일': { date: { start: '2026-01-01' } }, '제목': { title: [{ plain_text: '개발일지' }] },
  [STATE]: { rich_text: [] },
} })
function fixture(pages = [makePage()], options = {}) {
  let posts = 0, patches = 0, queries = 0
  const deliveries = [], websiteCalls = []
  const env = { NOTION_NEWS_TOKEN: 'secret', NOTION_NEWS_DATA_SOURCE_ID: source,
    DISCORD_NEWS_ENABLED: 'true', DISCORD_WEBHOOK_URL_KO: 'https://discord.com/api/webhooks/123/testsecret', DISCORD_WEBHOOK_URL_EN: 'https://discord.com/api/webhooks/456/englishsecret' }
  const fetcher = async (url, init = {}) => {
    url = String(url)
    if (url.includes('discord.com')) {
      posts++
      deliveries.push({ url, body: JSON.parse(init.body) })
      assert.equal(new URL(url).searchParams.get('wait'), 'true')
      assert.deepEqual(JSON.parse(init.body).allowed_mentions, { parse: [] })
      if (options.timeout) throw new Error(env.DISCORD_WEBHOOK_URL_KO)
      return options.discordStatus ? new Response('', { status: options.discordStatus }) : Response.json({ id: '123456789' })
    }
    if (url.includes('ritty.sam-meows.com')) {
      websiteCalls.push(url)
      if (options.websiteStatus) return new Response('', { status: options.websiteStatus })
      if (!url.includes('/api/')) return new Response('article')
      const p = pages.find(p => url.includes(p.id))
      return Response.json(localizeNewsArticle({ id: p.id, title: p.properties['제목'].title[0].plain_text, category: options.responseCategory || CATEGORY, language: options.responseLanguage || p.properties['언어'].select?.name || 'KO', blocks: [{ type: 'paragraph', text: '소식' }] }, new URL(url).searchParams.get('locale') || 'kr'))
    }
    if (url.endsWith(`/data_sources/${source}`)) return Response.json({ properties: Object.fromEntries([
      ['공개', 'checkbox'], ['분류', 'select'], ['언어', 'select'], ['게시일', 'date'], ['제목', 'title'], [STATE, 'rich_text'],
    ].map(([name, type]) => [name, { type, ...(name === '분류' ? { select: { options: [{ name: CATEGORY }] } } : {}) }])) })
    if (url.endsWith('/query')) {
      queries++
      const second = JSON.parse(init.body).start_cursor
      return Response.json(options.paginate ? { results: second ? pages.slice(1) : pages.slice(0, 1), has_more: !second, next_cursor: second ? null : 'next' } : { results: pages, has_more: false })
    }
    const p = pages.find(p => url.endsWith('/' + p.id))
    assert.ok(p, url)
    if (init.method === 'PATCH') {
      patches++
      const value = JSON.parse(init.body).properties[STATE]
      if (options.failSave && value.rich_text[0]?.text.content.startsWith('sent:')) return new Response('', { status: 503 })
      p.properties[STATE] = value
    }
    return Response.json(p)
  }
  return { pages, options, env, deliveries, websiteCalls, stats: () => ({ posts, patches, queries }), execute: mode => run({ mode, env, fetcher, log() {} }) }
}
test('filters publication, exact category, original language, future and archived pages', () => {
  assert.equal(eligible(makePage()), true)
  for (const mutate of [p => p.properties['공개'].checkbox = false,
    p => p.properties['분류'].select.name = '공지사항', p => p.properties['언어'].select.name = 'JA',
    p => p.properties['게시일'].date.start = '2999-01-01', p => p.archived = true,
    p => p.in_trash = true, p => p.properties['제목'].title = []]) {
    const p = makePage(); mutate(p)
    assert.equal(eligible(p), false)
  }
  const p = makePage(); p.properties['언어'].select = null; assert.equal(eligible(p), true)
})
test('preview has no mutations; initialization excludes all existing public categories and languages', async () => {
  const pages = [makePage(), makePage('c'.repeat(32)), makePage('d'.repeat(32))]
  pages[1].properties['분류'].select.name = '공지사항'
  pages[2].properties['언어'].select.name = 'JA'
  const f = fixture(pages, { paginate: true })
  assert.equal(await f.execute('preview'), 1); assert.equal(f.stats().patches, 0)
  assert.equal(await f.execute('initialize'), 3)
  assert.equal(await f.execute('send'), 0); assert.equal(f.stats().posts, 0)
  assert.equal(await f.execute('initialize'), 0)
})
test('sends only once and persists message ID', async () => {
  const f = fixture(); assert.equal(await f.execute('send'), 1)
  assert.equal(f.pages[0].properties[STATE].rich_text[0].text.content, 'sent:123456789')
  assert.equal(await f.execute('send'), 0); assert.equal(f.stats().posts, 1)
})
test('website unavailable retries later without Discord post or state mutation', async () => {
  const f = fixture(undefined, { websiteStatus: 404 })
  await assert.rejects(f.execute('send'), /Website article HTTP 404/)
  assert.equal(f.stats().posts, 0); assert.equal(f.stats().patches, 0)
  delete f.options.websiteStatus; assert.equal(await f.execute('send'), 1)
})
test('explicit Discord rejection clears intent for a later retry', async () => {
  const f = fixture(undefined, { discordStatus: 429 })
  await assert.rejects(f.execute('send'), /Discord HTTP 429/)
  assert.deepEqual(f.pages[0].properties[STATE].rich_text, [])
  delete f.options.discordStatus; assert.equal(await f.execute('send'), 1)
})
for (const options of [{ timeout: true }, { failSave: true }, { discordStatus: 503 }]) {
  test(`ambiguous delivery remains pending and cannot resend: ${JSON.stringify(options)}`, async () => {
    const f = fixture(undefined, options)
    await assert.rejects(f.execute('send'), error => !error.message.includes('testsecret'))
    await assert.rejects(f.execute('send'), /pending/)
    assert.equal(f.stats().posts, 1)
  })
}
test('caps a batch at five and drains the remainder on next run', async () => {
  const f = fixture(Array.from({ length: 7 }, (_, i) => makePage(String(i).repeat(32))))
  assert.equal(await f.execute('send'), 5); assert.equal(await f.execute('send'), 2)
})
test('card limits text, includes website URL and cover, drops unsafe image', () => {
  const a = { id: 'a'.repeat(32), title: 't'.repeat(300), cover: 'https://example.com/image.png', blocks: [{ type: 'paragraph', text: 'x'.repeat(900) }] }
  const p = payload(a); assert.equal(p.embeds[0].title.length, 256)
  assert.match(p.embeds[0].url, /\/news\/a{32}$/); assert.ok(p.embeds[0].description.length < 600)
  assert.ok(p.embeds[0].image); a.cover = 'javascript:alert(1)'; assert.equal(payload(a).embeds[0].image, undefined)
})
test('routes Korean and English posts to their own webhooks, URLs and card language', async () => {
  const ko = makePage(), en = makePage('e'.repeat(32)), ja = makePage('f'.repeat(32))
  en.properties['언어'].select.name = 'EN'
  en.properties['제목'].title = [{ plain_text: 'A bigger home' }]
  ja.properties['언어'].select.name = 'JA'
  const f = fixture([ko, en, ja])
  assert.equal(await f.execute('send'), 2)
  assert.equal(f.deliveries.length, 2)
  assert.match(f.deliveries[0].url, /webhooks\/123\//)
  assert.match(f.deliveries[1].url, /webhooks\/456\//)
  const koCard = f.deliveries[0].body.embeds[0], enCard = f.deliveries[1].body.embeds[0]
  assert.equal(koCard.url, `https://ritty.sam-meows.com/news/${ko.id}`)
  assert.equal(enCard.url, `https://ritty.sam-meows.com/en/news/${en.id}`)
  assert.equal(enCard.title, 'A bigger home')
  assert.match(koCard.description, /개발일지 읽기/)
  assert.match(enCard.description, /Read the devlog/)
  assert.equal(f.deliveries[1].body.username, 'Ritty News')
  assert.ok(f.websiteCalls.includes(`https://ritty.sam-meows.com/api/news/${en.id}?locale=en`))
  assert.ok(f.websiteCalls.includes(enCard.url))
  assert.equal(await f.execute('send'), 0)
  assert.deepEqual(ja.properties[STATE].rich_text, [])
})
test('later published English translation sends independently without repeating Korean', async () => {
  const ko = makePage(), en = makePage('e'.repeat(32))
  en.properties['언어'].select.name = 'EN'
  en.properties['공개'].checkbox = false
  const f = fixture([ko, en])
  assert.equal(await f.execute('send'), 1)
  en.properties['공개'].checkbox = true
  assert.equal(await f.execute('send'), 1)
  assert.equal(f.deliveries.filter(d => d.url.includes('/123/')).length, 1)
  assert.equal(f.deliveries.filter(d => d.url.includes('/456/')).length, 1)
})
test('refuses wrong-language website response without posting or recording intent', async () => {
  const en = makePage(); en.properties['언어'].select.name = 'EN'
  const f = fixture([en], { responseLanguage: 'KO' })
  await assert.rejects(f.execute('send'), /does not match/)
  assert.equal(f.stats().posts, 0); assert.equal(f.stats().patches, 0)
})
test('requires both webhook secrets before sending', async () => {
  const f = fixture(); delete f.env.DISCORD_WEBHOOK_URL_EN
  await assert.rejects(f.execute('send'), /DISCORD_WEBHOOK_URL_EN/)
  assert.equal(f.stats().posts, 0)
})
test('English card fallback and footer are localized', () => {
  const card = payload({ id: 'e'.repeat(32), language: 'EN', title: 'New update', blocks: [] }).embeds[0]
  assert.match(card.description, /Discover the latest Ritty/)
  assert.equal(card.footer.text, 'Ritty · Development Updates')
  assert.throws(() => payload({ language: 'JA' }), /Unsupported/)
})
for (const language of ['KO', 'EN']) {
  test(`rejects a localized announcement instead of a development post: ${language}`, async () => {
    const p = makePage(); p.properties['언어'].select.name = language
    const f = fixture([p], { responseCategory: '공지사항' })
    await assert.rejects(f.execute('send'), /does not match/)
    assert.equal(f.stats().posts, 0)
    assert.equal(f.stats().patches, 0)
  })
}
