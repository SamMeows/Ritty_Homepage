const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const { NextRequest } = require('next/server')

function load(file, imports = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name in imports ? imports[name] : require(name), module, module.exports)
  return module.exports
}

async function main() {
  const seo = load('lib/seo.ts')
  const dictionaries = load('lib/i18n/dictionaries.ts', {
    'server-only': {},
    'next/navigation': { notFound() { throw new Error('not-found') } },
  })
  await assert.rejects(dictionaries.getDictionary('not-a-real-page'), /not-found/)
  await assert.rejects(dictionaries.getDictionary('toString'), /not-found/)
  const { middleware } = load('middleware.ts')
  const request = path => new NextRequest(`https://ritty.sam-meows.com${path}`)
  assert.equal(middleware(request('/en')).headers.get('x-middleware-request-x-ritty-language'), 'en')
  assert.equal(middleware(request('/')).headers.get('x-middleware-request-x-ritty-language'), 'ko')
  const spoofed = new NextRequest('https://ritty.sam-meows.com/', { headers: { 'x-ritty-language': 'en' } })
  assert.equal(middleware(spoofed).headers.get('x-middleware-request-x-ritty-language'), 'ko')
  for (const [from, to] of [['/kr', '/'], ['/kr/news?utm_source=test', '/news?utm_source=test'], ['/en/news', '/news'], ['/en/news/abc', '/news/abc']]) {
    const response = middleware(request(from))
    assert.equal(response.status, 301)
    assert.equal(response.headers.get('location'), `https://ritty.sam-meows.com${to}`)
  }

  const article = {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', title: '새로운 섬 이야기', date: '2026-10-24',
    blocks: [{ type: 'heading_1', text: '중복 제목' }, { type: 'toggle', text: '자세히', children: [{ type: 'paragraph', text: '작물을 키우고 요리해요.' }] }],
  }
  const description = seo.newsDescription(article)
  assert.equal(description, '작물을 키우고 요리해요.')
  const structured = seo.newsStructuredData(article, description)
  assert.equal(structured['@graph'][0].url, `https://ritty.sam-meows.com/news/${article.id}`)
  assert.equal(structured['@graph'][1].itemListElement[2].item, structured['@graph'][0].url)
  const hostile = { title: '</script><script>alert(1)</script>' }
  const encoded = seo.serializeJsonLd(hostile)
  assert(!encoded.includes('</script>'))
  assert.deepEqual(JSON.parse(encoded), hostile)
  assert.match(seo.newsDescription({ ...article, blocks: [] }), /힐링 게임/)

  let calls = 0
  const sitemap = load('app/sitemap.ts', {
    '@/lib/news': { getNews: async cursor => {
      calls++
      return cursor ? { items: [{ id: 'a' }, { id: 'b' }], cursor: 'next' } : { items: [{ id: 'a' }], cursor: 'next' }
    } },
  })
  const entries = await sitemap.default()
  assert.equal(calls, 2, 'Repeated cursors must not loop forever')
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length)
  assert(entries.some(entry => entry.url.endsWith('/news/b')), 'Older news must be discoverable')
  assert(!entries.some(entry => entry.url.includes('/en/news') || entry.url.includes('/ad/')))
  assert.equal(entries[0].alternates.languages['x-default'], 'https://ritty.sam-meows.com')

  for (const language of ['kr', 'en']) {
    const { meta } = JSON.parse(fs.readFileSync(`lib/i18n/dictionaries/${language}.json`, 'utf8'))
    assert.equal(meta.title, meta.ogTitle)
    assert(!/삼냥이즈|SamMeows|Sam-Meows/.test(meta.title + meta.description))
  }

  const base = process.argv[2]
  if (base) {
    for (const [path, lang] of [['/', 'ko'], ['/en', 'en']]) {
      const response = await fetch(`${base}${path}`, { headers: { 'user-agent': 'Googlebot' } })
      assert.equal(response.status, 200)
      const html = await response.text()
      assert(html.includes(`<html lang="${lang}"`))
      assert(html.includes('max-image-preview:large'))
      assert(html.includes('/icons/favicon-96.png'))
      const expected = JSON.parse(fs.readFileSync(`lib/i18n/dictionaries/${lang === 'ko' ? 'kr' : 'en'}.json`, 'utf8')).meta
      assert(html.includes(`<title>${expected.title}</title>`))
      const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]))
      assert(blocks.some(block => block['@type'] === 'MobileApplication' && block.description === expected.description))
      assert(blocks.some(block => block['@type'] === 'WebPage'))
    }
    assert.equal((await fetch(`${base}/en/news`, { redirect: 'manual' })).status, 301)
    assert.equal((await fetch(`${base}/not-a-real-page`)).status, 404)
    const ad = await fetch(`${base}/ad/cozy-life`)
    assert.equal(ad.status, 200)
    assert((await ad.text()).includes('noindex'))
    assert.equal((await fetch(`${base}/api/news`)).headers.get('x-robots-tag'), 'noindex, nofollow, nosnippet')
    const xml = await (await fetch(`${base}/sitemap.xml`)).text()
    assert(xml.includes('/news</loc>'))
    assert(xml.includes('hreflang="x-default"'))
  }
  console.log('Passed: document language, canonical redirects, game search copy, safe structured data, sitemap pagination and' + (base ? ' live production responses.' : ' public URL discovery.'))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
