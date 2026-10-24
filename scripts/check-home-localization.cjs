const fs = require('fs');
const ts = require('typescript');
const assert = require('assert/strict');
const path = require('path');

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
  }).outputText, filename,
);
const root = path.resolve(__dirname, '..');
const {homeMarkup} = require(path.join(root, 'lib/home-markup.ts'));
const {decorateLandingMarkup} = require(path.join(root, 'lib/landing-art.ts'));
const base = decorateLandingMarkup(homeMarkup, 'kr');
const attributes = html => [...html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
  .matchAll(/\s(class|id|src|srcset|href|style|role|data-[\w-]+|aria-controls|aria-labelledby)="([^"]*)"/g)]
  .map(match => `${match[1]}=${match[2]}`);
const residents = html => html.match(/<script type="application\/json" id="resident-data">([\s\S]*?)<\/script>/)[1];

for (const locale of ['en', 'ja', 'zh-tw']) {
  const html = decorateLandingMarkup(homeMarkup, locale);
  assert.deepEqual(attributes(html), attributes(base), `${locale}: technical attributes changed`);
  assert(html.includes('class="cat-portrait-crop resident-illustration"'), `${locale}: portrait CSS hook lost`);
  assert.equal(residents(html), residents(base), `${locale}: resident runtime data changed`);
  assert.equal(JSON.parse(residents(html))[0].art, 'explorer');
  console.log(`${locale}: CSS hooks, asset URLs, ARIA references, and runtime data preserved`);
}

const {translateHomeMarkupJapanese} = require(path.join(root, 'lib/i18n/home-ja.ts'));
const sample = translateHomeMarkupJapanese('<div class="resident-illustration" role="group" aria-label="리티 이야기"><img src="/illustration/리티.webp" alt="리티 일러스트">오늘은 리티랑<br><em>뭐 할까?</em></div>');
assert(sample.includes('今日はリティと<br><em>何をしよう？</em>'));
assert(sample.includes('alt="リティ イラスト"'));
assert(sample.includes('src="/illustration/리티.webp"'));
assert(sample.includes('aria-label="リティの物語"'));
console.log('Japanese copy and accessible labels translated without changing image paths');
