const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const cache = new Map()
function load(file) {
  file = path.resolve(file)
  if (cache.has(file)) return cache.get(file).exports
  const module = { exports: {} }; cache.set(file, module)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name.endsWith('.css') || name === 'server-only') return {}
    if (name === './NewsModal') return { __esModule: true, default: () => null }
    if (name.startsWith('.') || name.startsWith('@/')) {
      const base = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(file), name)
      return load(['.ts', '.tsx', ''].map(ext => base + ext).find(candidate => fs.existsSync(candidate)))
    }
    return require(name)
  }, module, module.exports)
  return module.exports
}

const { newsPreviewMarkup } = load('lib/news-preview.ts')
const NewsFeed = load('components/news/NewsFeed.tsx').default
const items = [
  { id: 'a'.repeat(32), title: '리티 소개 <script>alert(1)</script> & "고양이" $&', category: '팀 레터', date: '2026-10-24', cover: 'https://example.com/cover.png?a=1&b=2' },
  { id: 'b'.repeat(32), title: '개발 소식', category: '개발 소식', date: '2026-10-23' },
]
for (const locale of ['kr', 'en', 'ja', 'zh-tw']) for (const initial of [
  { items: [], cursor: null }, { items: [], cursor: null, unavailable: true },
  { items: items.slice(0, 1), cursor: null }, { items, cursor: 'next' },
  { items: [{ ...items[0], cover: undefined }], cursor: null },
]) {
  // Byte-for-byte equality covers visible copy, order, links, attributes and
  // failure states as well as HTML escaping of CMS content.
  assert.equal(newsPreviewMarkup(initial, locale), renderToStaticMarkup(React.createElement(NewsFeed, { initial, locale })))
}
const { decorateLandingMarkup } = load('lib/landing-art.ts')
const { homeMarkup } = load('lib/home-markup.ts')
const { lifeScenes } = load('lib/life-scenes.ts')
const { homeEnglish } = load('lib/i18n/home-en.ts')
for (const locale of ['kr', 'en']) {
  const html = decorateLandingMarkup(homeMarkup, locale)
  assert.equal((html.match(/data-life-copy=/g) || []).length, 4)
  assert.equal((html.match(/data-life-copy="[^"]+" hidden/g) || []).length, 3)
  for (const [, , title, description] of lifeScenes) {
    assert(html.includes(locale === 'en' ? homeEnglish[title] : title))
    assert(html.includes(locale === 'en' ? homeEnglish[description] : description))
  }
}
const { newsStructuredData } = load('lib/seo.ts')
const article = newsStructuredData({ ...items[0], modifiedAt: '2026-10-24T07:00:00.000Z' }, '소개')['@graph'][0]
assert.equal(article.dateModified, '2026-10-24T07:00:00.000Z')
assert.equal(article.publisher.name, '삼냥이즈')
assert.equal(article.about.name, '리티 Ritty')
assert(!('dateModified' in newsStructuredData(items[0], '소개')['@graph'][0]))
console.log('Passed: identical initial news HTML in both languages and all feed states; safe CMS escaping; four real server-rendered slide panels; accurate article metadata.')
