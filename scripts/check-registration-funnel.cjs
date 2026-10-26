const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright'));
function load(file) {
 const module={exports:{}};
 const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 new Function('require','module','exports',js)(name=>name.startsWith('.')?load(path.resolve(path.dirname(file),name)+'.ts'):require(name),module,module.exports);
 return module.exports;
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  for(const locale of ['en','ja']) {
   const context=await browser.newContext({viewport:{width:390,height:700}});
   const page=await context.newPage();
   // Block all third-party telemetry; all API submissions are local mocks.
   await page.route(/googletagmanager|google-analytics/,route=>route.abort());
   let status='created', requests=0;
   await page.route('**/api/pre-register',async route=>{
    requests++;
    const body=route.request().postDataJSON();
    assert.equal(body.email,'qa@example.com'); assert.equal(body.locale,locale);
    await route.fulfill({status:status==='error'?503:200,contentType:'application/json',body:JSON.stringify(status==='error'?{error:'server'}:{status})});
   });
   for(const outcome of ['created','duplicate','error']) {
    status=outcome;
    await page.goto('http://localhost:3017/'+locale+'?cta_copy=launch-email-v1',{waitUntil:'networkidle'});
    await page.locator('[data-register]').first().waitFor();
    await page.evaluate(()=>{window.gtag=()=>{throw new Error('injected analytics failure')}});
    await page.locator('[data-register]').first().click();
    const dialog=page.getByRole('dialog'); await dialog.waitFor();
    const submit=dialog.locator('button[type=submit]');
    await submit.click(); await dialog.getByRole('alert').waitFor();
    assert.equal(requests,outcome==='created'?0:outcome==='duplicate'?1:2);
    await dialog.locator('input[type=email]').fill('qa@example.com');
    await dialog.locator('input[type=radio]').first().check();
    await submit.click(); await dialog.getByRole('alert').waitFor();
    await dialog.locator('input[type=checkbox]').first().check();
    await submit.click();
    if(outcome==='error') {
     await dialog.getByRole('alert').waitFor(); assert.equal(await submit.isEnabled(),true);
    } else {
     await dialog.locator('form').waitFor({state:'detached'});
     assert.equal(await dialog.getByRole('alert').count(),0);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   }
   // Valid analytics: fixed event names, separate UTM and copy arm, no input values.
   await page.goto('http://localhost:3017/'+locale+'?utm_content=ad-a&cta_copy=launch-email-v1',{waitUntil:'networkidle'});
   await page.evaluate(()=>{window.events=[];window.gtag=(...args)=>window.events.push(args)});
   await page.locator('[data-register]').first().click();
   const dialog=page.getByRole('dialog');
   await dialog.locator('input[type=email]').fill('qa@example.com');
   await dialog.locator('input[type=radio]').first().check();
   await dialog.locator('input[type=checkbox]').first().check(); status='created';
   await dialog.locator('button[type=submit]').click();await dialog.locator('form').waitFor({state:'detached'});
   const events=await page.evaluate(()=>window.events);
   for(const name of ['pre_register_open','pre_register_start','pre_register_submit','pre_register_result','generate_lead','pre_register_complete_view']) assert.equal(events.filter(e=>e[1]===name).length,1,name);
   assert(!JSON.stringify(events).includes('qa@example.com'));
   assert(events.every(e=>e[2].utm_content==='ad-a'&&e[2].cta_copy_variant==='launch-email-v1'&&e[2].page_language===locale));
   // QA mode suppresses custom conversion telemetry and marks the request.
   await page.goto('http://localhost:3017/'+locale+'?registration_test=1',{waitUntil:'networkidle'});
   await page.evaluate(()=>{window.events=[];window.gtag=(...args)=>window.events.push(args)});
   await page.locator('[data-register]').first().click();
   assert.equal(await page.evaluate(()=>window.events.length),0);
   const privacy=await page.locator('[role=dialog] a[href$="/privacy"]').getAttribute('href');assert.equal(privacy,'/'+locale+'/privacy');
   console.log(locale+': validation, created/duplicate/error UI, analytics throws, exactly-once funnel, no form PII, QA telemetry suppression, mobile overflow passed');
   await context.close();
  }
  const {localizeNewsArticle,localizeNewsTitle}=load('lib/i18n/news-articles.ts');
  const source=JSON.parse(fs.readFileSync('lib/i18n/news-articles.ts','utf8').match(/const source = (\[[\s\S]*?\])\nconst translations/)[1]);
  for(const locale of ['en','ja']) {
   const article={id:'a'.repeat(32),title:source[0],date:'2026-10-24',category:'팀 레터',blocks:source.slice(1).map(text=>({type:'paragraph',text}))};
   const localized=localizeNewsArticle(article,locale);assert.equal(localized.contentLanguage,locale);assert.notEqual(localized.blocks[0].text,source[1]);
   article.blocks.push({type:'paragraph',text:'새로운 미번역 내용'});assert.equal(localizeNewsArticle(article,locale).contentLanguage,'kr');
   assert(localizeNewsTitle({...article,title:'Untranslated'},locale).includes(locale==='ja'?'韓国語原文':'Korean original'));
  }
  console.log('News: full translation and whole-article fallback after source edits passed. No live registration rows created.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
