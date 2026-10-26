const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const id = '123456781234123412341234567890ab', database = 'abcdefabcdefabcdefabcdefabcdefab';
const mod = { exports: {} };
let blocks = [], patches = 0, requests = 0, fail = false, archived = false, wrongDatabase = false, paginate = false;
const source = ts.transpileModule(fs.readFileSync('lib/marketing-subscription.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
async function mockFetch(url, options) {
 requests++;
 if(fail) return {ok:false};
 if(url.includes('/pages/')) return {ok:true,json:async()=>({archived,parent:{database_id:wrongDatabase?'other':database}})};
 if(options.method === 'PATCH') { patches++; const body = JSON.parse(options.body); blocks[0].paragraph = body.paragraph; return {ok:true,json:async()=>({})}; }
 if(paginate && !url.includes('start_cursor=')) return {ok:true,json:async()=>({results:[],has_more:true,next_cursor:'next'})};
 return {ok:true,json:async()=>({results:blocks,has_more:false})};
}
new Function('require','module','exports','fetch','process',source)(n=>n==='server-only'?{}:require(n),mod,mod.exports,mockFetch,{env:{NOTION_TOKEN:'test-token',NOTION_PRE_REGISTER_DB_ID:database,MARKETING_UNSUBSCRIBE_SECRET:'test-secret'}});
const m=mod.exports;
const reset=(subscribed=true,isTest=false)=>{blocks=[{id:'state-block',...m.marketingSubscriptionBlock(subscribed,isTest)}];};
(async()=>{
 reset();
 const url=new URL(m.marketingUnsubscribeUrl(id,'ja')), token=url.hash.slice(1);
 assert.equal(url.pathname,'/unsubscribe'); assert.equal(url.searchParams.get('lang'),'ja'); assert(!url.search.includes(id));
 const before=requests; assert.equal(await m.unsubscribeMarketing(token.slice(0,-1)+(token.endsWith('a')?'b':'a')),false); assert.equal(requests,before);
 assert.equal(await m.unsubscribeMarketing('invalid'),false);
 assert.equal(await m.canReceiveMarketing(id),true);
 let sends=0; assert.equal((await m.deliverMarketingEmail(id,'en',async link=>{sends++; assert(link.includes('#'));})).sent,true);
 paginate=true; assert.equal(await m.unsubscribeMarketing(token),true); paginate=false;
 assert.equal(patches,1); assert.equal(await m.canReceiveMarketing(id),false);
 assert.equal((await m.deliverMarketingEmail(id,'en',async()=>{sends++;})).sent,false); assert.equal(sends,1);
 assert.equal(await m.unsubscribeMarketing(token),true); assert.equal(patches,1);
 const state=JSON.parse(blocks[0].paragraph.rich_text[0].text.content.split('ritty_marketing_subscription_v1:')[1]); assert.equal(state.subscribed,false); assert(state.withdrawnAt);
 reset(false); assert.equal(await m.canReceiveMarketing(id),false);
 reset(true,true); assert.equal(await m.canReceiveMarketing(id),false);
 blocks=[]; assert.equal(await m.canReceiveMarketing(id),false); assert.equal(await m.unsubscribeMarketing(token),false);
 reset(); archived=true; assert.equal(await m.unsubscribeMarketing(token),false); archived=false;
 wrongDatabase=true; assert.equal(await m.unsubscribeMarketing(token),false); wrongDatabase=false;
 fail=true; await assert.rejects(()=>m.unsubscribeMarketing(token)); await assert.rejects(()=>m.deliverMarketingEmail(id,'kr',async()=>{sends++;})); assert.equal(sends,1);
 fail=false; reset();
 const routeModule={exports:{}};
 const routeSource=ts.transpileModule(fs.readFileSync('app/api/marketing/unsubscribe/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',routeSource)(n=>n==='next/server'?{NextResponse:{json:(body,options)=>({body,...options})}}:m,routeModule,routeModule.exports);
 const post=value=>routeModule.exports.POST({json:async()=>value});
 assert.equal((await post({token})).status,200);
 assert.equal((await post({token:'invalid'})).status,400);
 assert.equal((await post(null)).status,400);
 fail=true; const failure=await post({token}); assert.equal(failure.status,503); assert.equal(failure.body.error,'unavailable');
 console.log('PASS: signed/tampered links, paginated lookup, consent withdrawal, repeated requests, send exclusion, test/legacy exclusion, database scope, storage failure. Only subscription block is patched. No live requests.');
})().catch(e=>{console.error(e);process.exitCode=1});
