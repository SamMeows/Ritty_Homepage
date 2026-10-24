// No external requests: verify attribution and the existing Notion API contract with mocks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function load(relative) {
  const file = path.resolve(relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = {exports:{}}; cache.set(file,module);
  const js = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const localRequire = name => name.startsWith('@/') ? load(name.slice(2)+'.ts') : name.startsWith('.') ? load(path.resolve(path.dirname(file),name)+'.ts') : require(name);
  new Function('require','module','exports',js)(localRequire,module,module.exports);
  return module.exports;
}
const {resolveAttribution,cleanAttribution}=load('lib/attribution.ts');
const a=resolveAttribution(new URL('https://example.com/ad/talking-cat?utm_source=instagram&utm_campaign=launch&utm_content=video-a'),'https://social.example/feed?private=yes');
assert.equal(a.variant,'talking-cat');assert.equal(a.referrer,'https://social.example');
assert.deepEqual(resolveAttribution(new URL('https://example.com/'),'https://example.com/ad/talking-cat',a),a);
assert.equal(resolveAttribution(new URL('https://example.com/ad/cozy-life'),'',a).source,'');
assert.equal(resolveAttribution(new URL('https://example.com/ad/talking-cat?utm_source=youtube'),'',a).source,'youtube');
assert.equal(cleanAttribution({landingPath:'//evil.test',variant:'forged'}).landingPath,'/');
assert.equal(cleanAttribution({landingPath:'/ad/unknown',variant:'talking-cat'}).variant,'main');
assert.equal(cleanAttribution({landingPath:'/ad/talking-cat?email=private'}).landingPath,'/ad/talking-cat');

// Verify stable experiment assignment and preserve paid click identifiers.
const {middleware}=load('middleware.ts');
const {NextRequest}=require('next/server');
for(const arm of ['talking-cat','cozy-life']) {
  const response=middleware(new NextRequest('https://example.com/ad?utm_content=same-ad&fbclid=test-click', {headers:{cookie:'ritty-copy-v1='+arm}}));
  const destination=new URL(response.headers.get('location'));
  assert.equal(destination.pathname,'/ad/'+arm);
  assert.equal(destination.searchParams.get('utm_content'),'same-ad');
  assert.equal(destination.searchParams.get('fbclid'),'test-click');
  assert.equal(response.headers.get('cache-control'),'private, no-store');
  assert.equal(response.cookies.get('ritty-copy-v1').value,arm);
}
const randomResponse=middleware(new NextRequest('https://example.com/ad', {headers:{cookie:'ritty-copy-v1=invalid'}}));
assert.match(randomResponse.headers.get('location'), /\/ad\/(talking-cat|cozy-life)$/);
assert.equal(middleware(new NextRequest('https://example.com/')).headers.get('location'),null);
const {adVariants}=load('lib/ad-variants.ts');
assert.notEqual(adVariants['talking-cat'].title,adVariants['cozy-life'].title);
// Early events must survive loading GA after hydration, without form values.
global.window={location:{href:'https://example.com/ad/talking-cat'}};
global.document={referrer:''};
const {trackRegistrationFunnel,trackPreRegisterComplete}=load('lib/analytics.ts');
trackRegistrationFunnel('landing_view','kr');
trackPreRegisterComplete('ios','kr');
assert.equal(window.dataLayer.length,2);
assert.equal(window.dataLayer[0][1],'landing_view');
assert.equal(window.dataLayer[1][1],'generate_lead');
assert.equal(window.dataLayer[0][2].landing_variant,'talking-cat');
delete global.window;delete global.document;

process.env.NOTION_TOKEN='mock-only';process.env.NOTION_PRE_REGISTER_DB_ID='mock-db';
const {POST}=load('app/api/pre-register/route.ts');
const originalFetch=global.fetch;
const valid={email:'test@example.com',platform:'ios',locale:'kr',consents:{age:true,privacy:true,marketing:true},attribution:a};
let calls=[],duplicate=false,withColumns=false,schemaFailure=false;
global.fetch=async (url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/query'))return Response.json({results:duplicate?[{id:'existing'}]:[]});
  if(options.method!=='POST')return schemaFailure?new Response('',{status:403}):Response.json({properties:withColumns?{'Landing Variant':{type:'rich_text'}}:{}});
  return Response.json({id:'new'});
};
const send=body=>POST(new Request('https://example.com/api/pre-register',{method:'POST',body:JSON.stringify(body)}));
(async()=>{
  let result=await send(valid);assert.equal((await result.json()).status,'created');
  let payload=JSON.parse(calls.at(-1).options.body);
  assert.equal(payload.properties['UTM Source'].rich_text[0].text.content,'instagram');
  assert.match(payload.children[0].paragraph.rich_text[0].text.content,/talking-cat/);
  assert.equal(payload.properties['Landing Variant'],undefined);
  calls=[];withColumns=true;await send(valid);
  payload=JSON.parse(calls.at(-1).options.body);assert.equal(payload.properties['Landing Variant'].rich_text[0].text.content,'talking-cat');
  calls=[];schemaFailure=true;assert.equal((await (await send(valid)).json()).status,'created');
  calls=[];duplicate=true;assert.equal((await (await send(valid)).json()).status,'duplicate');assert.equal(calls.length,1);
  calls=[];result=await send({...valid,consents:{}});assert.equal(result.status,400);assert.equal(calls.length,0);
  calls=[];duplicate=false;await send({...valid,attribution:undefined,utm:{source:'legacy'}});
  payload=JSON.parse(calls.at(-1).options.body);assert.equal(payload.properties['UTM Source'].rich_text[0].text.content,'legacy');
  console.log('Passed: attribution, navigation persistence, variant changes, Notion old/new schemas, duplicate and consent handling. No live rows created.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{global.fetch=originalFetch});
