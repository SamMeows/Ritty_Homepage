const fs=require('fs'),ts=require('typescript'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright'));
const modules={};
for(const file of ['lib/analytics','lib/attribution','lib/ad-variants','lib/pre-register','lib/contexts/PreRegisterContext','components/pre-register/PreRegisterModal']) modules['@/'+file]=ts.transpileModule(fs.readFileSync(file+'.'+(file.includes('Context')||file.includes('Modal')?'tsx':'ts'),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
const react=fs.readFileSync(require.resolve('react').replace(/index\.js$/,'umd/react.development.js'),'utf8');
const reactDOM=fs.readFileSync(require.resolve('react-dom').replace(/index\.js$/,'umd/react-dom.development.js'),'utf8');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
for(const locale of ['en','ja']) {
 const page=await browser.newPage({viewport:{width:390,height:700}});
 page.on('pageerror', e=>console.error('BROWSER:',e.message));
 let status='created',requests=0;
 await page.exposeFunction('submitMock',body=>{requests++;assert.equal(body.email,'qa@example.com');assert.equal(body.locale,locale);return {status}});
 async function mount(throws=false) {
 await page.setContent('<div id="root"></div>');
 await page.addScriptTag({content:react});await page.addScriptTag({content:reactDOM});
 await page.addScriptTag({content: '(()=>{const modules='+JSON.stringify(modules)+'; const dictionary='+fs.readFileSync('lib/i18n/dictionaries/'+locale+'.json','utf8')+'; const locale='+JSON.stringify(locale)+';'+String.raw`
 const cache={};
 function load(name){
 if(name==='react')return React;
 if(name==='next/image')return {__esModule:true,default:props=>React.createElement('img',props)};
 if(name.endsWith('.css'))return {};
 if(name.includes('PreviewRegistration'))return {__esModule:true,default:()=>null};
 if(name==='@/lib/launch')return {LAUNCH_PHASE:'pre-register'};
 if(name==='./attribution')return load('@/lib/attribution');if(name==='./ad-variants')return load('@/lib/ad-variants');
 if(cache[name])return cache[name].exports;
 const mod={exports:{}};cache[name]=mod;new Function('require','module','exports','React',modules[name])(load,mod,mod.exports,React);return mod.exports;
 }
 window.events=[];window.gtag=(...args)=>{window.events.push(args)};
 window.fetch=async (_url,options)=>{const data=await window.submitMock(JSON.parse(options.body));return {ok:data.status!=='error',status:data.status==='error'?503:200,json:async()=>data}};
 const {PreRegisterProvider,usePreRegister}=load('@/lib/contexts/PreRegisterContext');
 function Button(){const {openPreRegister}=usePreRegister();return React.createElement('button',{id:'open',onClick:()=>openPreRegister('landing')},'Register')}
 ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(PreRegisterProvider,{dict:dictionary,locale},React.createElement(Button)));
 })();`});
 await page.locator('#open').waitFor();
 if(throws)await page.evaluate(()=>{window.gtag=()=>{throw Error('injected analytics failure')}});
 }
 for(const outcome of ['created','duplicate','error']) {
 status=outcome;await mount(true);await page.locator('#open').click();const dialog=page.getByRole('dialog');await dialog.waitFor();
 const submit=dialog.locator('button[type=submit]');const before=requests;
 await submit.click();await dialog.getByRole('alert').waitFor();assert.equal(requests,before);
 await dialog.locator('input[type=email]').fill('qa@example.com');await dialog.locator('input[type=radio]').first().check();
 await submit.click();await dialog.getByRole('alert').waitFor();assert.equal(requests,before);
 await dialog.locator('input[type=checkbox]').first().check();await submit.click();
 if(outcome==='error'){await dialog.getByRole('alert').waitFor();assert(await submit.isEnabled())}else{await dialog.locator('form').waitFor({state:'detached'});assert.equal(await dialog.getByRole('alert').count(),0)}
 assert.equal(requests,before+1);
 }
 status='created';await mount();await page.locator('#open').click();const dialog=page.getByRole('dialog');
 await dialog.locator('input[type=email]').fill('qa@example.com');await dialog.locator('input[type=radio]').first().check();await dialog.locator('input[type=checkbox]').first().check();await dialog.locator('button[type=submit]').click();await dialog.locator('form').waitFor({state:'detached'});
 const events=await page.evaluate(()=>window.events);
 for(const name of ['pre_register_open','pre_register_start','pre_register_submit','pre_register_result','generate_lead','pre_register_complete_view'])assert.equal(events.filter(e=>e[1]===name).length,1,name);
 assert(!JSON.stringify(events).includes('qa@example.com'));
 console.log(locale+': offline real React form passed invalid email, missing consent, created, duplicate, server error, throwing analytics, event counts and no form PII');
 await page.close();
}
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
