// The old write/AI endpoints are deliberately retired; no secret or AI key is required.
const assert=require('node:assert/strict'),{load}=require('./load-typescript.cjs');
global.fetch=()=>{throw Error('Retired endpoints must not access storage or AI')};
(async()=>{
 assert.equal((await load('app/api/admin/news/route.ts').GET()).status,410);
 assert.equal((await load('app/api/admin/news/translate/route.ts').POST()).status,410);
 console.log('Passed: website translation/admin APIs retired; no external calls. Use check-news-locales.cjs for the Notion language workflow.');
})().catch(e=>{console.error(e);process.exitCode=1});
