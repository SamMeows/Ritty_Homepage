const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
const { NextRequest } = require('next/server')

function load(file, imports = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', code)(name => name in imports ? imports[name] : name.startsWith('.') ? load(path.resolve(path.dirname(file),name)+'.ts') : require(name), module, module.exports)
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
  const { middleware } = load('middleware.ts', {
    './lib/ad-variants': load('lib/ad-variants.ts'),
  })
  const request = path => new NextRequest(`https://ritty.sam-meows.com${path}`)
  assert.equal(middleware(request('/en')).headers.get('x-middleware-request-x-ritty-language'), 'en')
  assert.equal(middleware(request('/')).headers.get('x-middleware-request-x-ritty-language'), 'ko')
  const spoofed = new NextRequest('https://ritty.sam-meows.com/', { headers: { 'x-ritty-language': 'en' } })
  assert.equal(middleware(spoofed).headers.get('x-middleware-request-x-ritty-language'), 'ko')
  for (const [from, to] of [['/kr', '/'], ['/kr/news?utm_source=test', '/news?utm_source=test']]) {
    const response = middleware(request(from))
    assert.equal(response.status, 301)
    assert.equal(response.headers.get('location'), `https://ritty.sam-meows.com${to}`)
  }

  for(const url of ['/en/news','/ja/news','/en/news/abc','/ja/news/abc']) assert.equal(middleware(request(url)).headers.get('location'),null)

  const article = {
    id: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', title: '새로운 섬 이야기', date: '2026-10-24',
    blocks: [{ type: 'heading_1', text: '중복 제목' }, { type: 'toggle', text: '자세히', children: [{ type: 'paragraph', text: '작물을 키우고 요리해요.' }] }],
  }
  const description = seo.newsDescription(article)
  assert.equal(description, '작물을 키우고 요리해요.')
  const structured = seo.newsStructuredData(article, description)
  assert.equal(structured['@graph'][0].url, `https://ritty.sam-meows.com/news/${article.id}`)
  assert.equal(structured['@graph'][1].itemListElement[2].item, structured['@graph'][0].url)
  assert.deepEqual(structured['@graph'][0].about['@type'], ['VideoGame', 'MobileApplication'])
  const hostile = { title: '</script><script>alert(1)</script>' }
  const encoded = seo.serializeJsonLd(hostile)
  assert(!encoded.includes('</script>'))
  assert.deepEqual(JSON.parse(encoded), hostile)
  assert.match(seo.newsDescription({ ...article, blocks: [] }), /힐링 게임/)

  let calls = 0
  const sitemap = load('app/sitemap.ts', {
    '@/lib/news-languages': load('lib/news-languages.ts'),
    '@/lib/news': { getNewsAlternates: async () => ({}), getNews: async (cursor, locale) => {
      calls++
      const prefix=locale==='kr'?'':locale+'-'; const language=locale==='en'?'EN':locale==='ja'?'JA':'KO';
      return cursor ? { items: [{id:prefix+'a',language}, {id:prefix+'b',language,modifiedAt:'2026-10-24T07:00:00.000Z'}],cursor:'next'} : {items:[{id:prefix+'a',language}],cursor:'next'}
    } },
  })
  const entries = await sitemap.default()
  assert.equal(sitemap.dynamic, 'force-dynamic', 'Notion must not be queried during static build')
  const unavailableSitemap = load('app/sitemap.ts', {
    '@/lib/news-languages': load('lib/news-languages.ts'),
    '@/lib/news': { getNews: async () => ({ items: [], cursor: null, unavailable: true }) },
  })
  await assert.rejects(unavailableSitemap.default(), /News sitemap source unavailable/)

  assert.equal(calls, 6, 'Repeated cursors must not loop forever')
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length)
  assert(entries.some(entry => entry.url.endsWith('/news/b')), 'Older news must be discoverable')
  assert.equal(entries.find(entry => entry.url.endsWith('/news/b')).lastModified, '2026-10-24T07:00:00.000Z')
  assert(entries.some(entry => entry.url.includes('/en/news/en-b')))
  assert(entries.some(entry => entry.url.includes('/ja/news/ja-b')))
  assert(!entries.some(entry => entry.url.includes('/ad/')))
  assert.equal(entries[0].alternates.languages['x-default'], 'https://ritty.sam-meows.com')

  for (const language of ['kr', 'en']) {
    const { meta } = JSON.parse(fs.readFileSync(`lib/i18n/dictionaries/${language}.json`, 'utf8'))
    assert.equal(meta.title, meta.ogTitle)
    assert(!/삼냥이즈|SamMeows|Sam-Meows/.test(meta.title + meta.description))
  }

  for (const phase of ['pre-register', 'store']) {
    const landing = load('app/[locale]/page.tsx', {
      '@/components/landing/RittyLanding': { default: () => null },
      '@/lib/i18n/dictionaries': { getDictionary: async locale => JSON.parse(fs.readFileSync(`lib/i18n/dictionaries/${locale}.json`, 'utf8')) },
      '@/lib/launch': { LAUNCH_PHASE: phase },
      '@/lib/seo': seo,
    })
    for (const locale of ['kr', 'en', 'ja', 'zh-tw']) {
      const page = await landing.default({ params: Promise.resolve({ locale }) })
      const blocks = page.props.children.filter(node => node.type === 'script').map(node => JSON.parse(node.props.dangerouslySetInnerHTML.__html))
      const game = blocks.find(block => [].concat(block['@type']).includes('MobileApplication'))
      assert.deepEqual(game['@type'], ['VideoGame', 'MobileApplication'])
      assert(game.sameAs.includes('https://apps.apple.com/app/id6743311040'))
      assert(game.sameAs.includes('https://play.google.com/store/apps/details?id=com.sammeows.ritty'))
      assert.equal('downloadUrl' in game, phase === 'store', 'Identity links must not advertise pre-registration as an available download')
      assert.equal('installUrl' in game, phase === 'store')
      assert.equal(blocks.find(block => block['@type'] === 'WebPage').mainEntity['@id'], game['@id'])
      assert.equal(blocks.find(block => block['@type'] === 'WebSite').about['@id'], game['@id'])
    }
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
      const game = blocks.find(block => [].concat(block['@type']).includes('MobileApplication'))
      assert(game && game.description === expected.description)
      assert([].concat(game['@type']).includes('VideoGame'))
      assert(game.sameAs.includes('https://apps.apple.com/app/id6743311040'))
      assert(game.sameAs.includes('https://play.google.com/store/apps/details?id=com.sammeows.ritty'))
      assert(blocks.some(block => block['@type'] === 'WebPage'))
    }
    assert.equal((await fetch(`${base}/en/news`, { redirect: 'manual' })).status, 200)
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
