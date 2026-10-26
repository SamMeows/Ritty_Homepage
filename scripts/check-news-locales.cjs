const assert=require('node:assert/strict');
const {load}=require('./load-typescript.cjs');
const {renderToStaticMarkup}=require('react-dom/server');
const React=require('react');
process.env.NOTION_NEWS_DATA_SOURCE_ID='b'.repeat(32);process.env.NOTION_NEWS_TOKEN='mock-read-only';
const source=process.env.NOTION_NEWS_DATA_SOURCE_ID;
const ids={ko:'1'.repeat(32),en:'2'.repeat(32),ja:'3'.repeat(32),legacy:'4'.repeat(32),draft:'5'.repeat(32),future:'6'.repeat(32),foreign:'7'.repeat(32),unrelated:'8'.repeat(32)};
function record(id,language,original,translations=[]){return {id,parent:{data_source_id:source},properties:{'제목':{title:[{plain_text:language+' title'}]},'공개':{checkbox:true},'게시일':{date:{start:'2026-01-02'}},'언어':{select:language?{name:language}:null},'분류':{select:{name:'개발 소식'}},'원문':{relation:original?[{id:original}]:[]},'번역본':{id:'siblings',relation:translations.map(id=>({id}))}}}}
const pages={
 [ids.ko]:record(ids.ko,'KO',null,[ids.en,ids.ja,ids.draft,ids.future,ids.foreign,ids.unrelated]),
 [ids.en]:record(ids.en,'EN',ids.ko),[ids.ja]:record(ids.ja,'JA',ids.ko),[ids.legacy]:record(ids.legacy,null),
 [ids.draft]:record(ids.draft,'JA',ids.ko),[ids.future]:record(ids.future,'EN',ids.ko),[ids.foreign]:record(ids.foreign,'EN',ids.ko),[ids.unrelated]:record(ids.unrelated,'JA',ids.legacy)
};
pages[ids.draft].properties['공개'].checkbox=false;pages[ids.future].properties['게시일'].date.start='2999-01-01';pages[ids.foreign].parent.data_source_id='c'.repeat(32);
let calls=[],fail=false,hasMore=false;
global.fetch=async(url,options={})=>{
 calls.push({url,options});if(fail)return new Response('',{status:503});
 if(url.includes('/query')){
  const payload=JSON.parse(options.body),filter=payload.filter.and[2];
  const language=filter.or?'KO':filter.select.equals;
  const values=Object.values(pages).filter(p=>p.parent.data_source_id===source&&((p.properties['언어'].select?.name||'KO')===language));
  return Response.json({results:values,has_more:hasMore&&!payload.start_cursor,next_cursor:'cursor-two'});
 }
 const pageId=url.match(/\/pages\/([a-f\d]{32})$/)?.[1];if(pageId)return pages[pageId]?Response.json(pages[pageId]):new Response('',{status:404});
 if(url.includes('/properties/siblings'))return Response.json({results:[{relation:{id:ids.en}},{relation:{id:ids.ja}}],has_more:false});
 if(url.includes('/blocks/'))return Response.json({results:[{type:'paragraph',paragraph:{rich_text:[{plain_text:url.includes(ids.en)?'English article body':url.includes(ids.ja)?'日本語の本文':'한국어 본문'}]}}],has_more:false});
 throw Error('Unexpected URL '+url);
};
const news=load('lib/news.ts');const languages=load('lib/news-languages.ts');const copy=load('lib/i18n/news-copy.ts');
const listApi=load('app/api/news/route.ts');const articleApi=load('app/api/news/[id]/route.ts');
(async()=>{
 assert.deepEqual((await news.getNews()).items.map(i=>i.id),[ids.ko,ids.legacy]);
 assert(calls[0].options.body.includes('is_empty'));
 assert.deepEqual((await news.getNews(undefined,'en')).items.map(i=>i.id),[ids.en]);
 assert.deepEqual((await news.getNews(undefined,'ja')).items.map(i=>i.id),[ids.ja,ids.unrelated]);
 assert.deepEqual((await news.getNews(undefined,'zh-tw')).items.map(i=>i.id),[ids.ko,ids.legacy]);
 const english=await news.getNewsArticle(ids.en,'en');assert.equal(english.blocks[0].text,'English article body');
 assert.deepEqual(english.alternatePaths,{en:'/en/news/'+ids.en,kr:'/news/'+ids.ko,ja:'/ja/news/'+ids.ja});
 const structured=load('lib/seo.ts').newsStructuredData(english,'English article body')['@graph'][0];assert.equal(structured.url,'https://ritty.sam-meows.com/en/news/'+ids.en);assert.equal(structured.inLanguage,'en-US');
 const japanese=await news.getNewsArticle(ids.ja,'ja');assert.equal(japanese.alternatePaths.en,'/en/news/'+ids.en);
 assert.equal(await news.getNewsArticle(ids.en,'kr'),null);assert.equal(await news.getNewsArticle(ids.ko,'en'),null);
 assert.equal(await news.getNewsArticle(ids.draft,'ja'),null);assert.equal(await news.getNewsArticle(ids.foreign,'en'),null);assert.equal(await news.getNewsArticle('../private'),null);
 // Missing translation never links an unpublished or scheduled sibling.
 pages[ids.ja].properties['공개'].checkbox=false;
 assert.equal((await news.getNewsArticle(ids.en,'en')).alternatePaths.ja,undefined);
 const Links=load('components/news/NewsLanguageLinks.tsx').default;
 const html=renderToStaticMarkup(React.createElement(Links,{locale:'en',alternatePaths:(await news.getNewsArticle(ids.en,'en')).alternatePaths}));
 assert(html.includes('href="/ja/news"'));assert(!html.includes(ids.draft));pages[ids.ja].properties['공개'].checkbox=true;
 // Relations can be paginated independently from list pagination.
 pages[ids.ko].properties['번역본'].has_more=true;
 assert.equal((await news.getNewsArticle(ids.en,'en')).alternatePaths.ja,'/ja/news/'+ids.ja);pages[ids.ko].properties['번역본'].has_more=false;
 hasMore=true;assert.equal((await news.getNews(undefined,'en')).cursor,'cursor-two');hasMore=false;
 const result=await (await listApi.GET(new Request('https://example.test/api/news?locale=en&cursor=cursor-two'))).json();assert.deepEqual(result.items.map(i=>i.id),[ids.en]);
 const response=await articleApi.GET(new Request('https://example.test/api/news/'+ids.ja+'?locale=ja'),{params:Promise.resolve({id:ids.ja})});assert.equal(response.status,200);assert.equal((await response.json()).category,'開発便り');
 assert.equal((await articleApi.GET(new Request('https://example.test/api/news/'+ids.en+'?locale=ja'),{params:Promise.resolve({id:ids.en})})).status,404);
 assert.equal(copy.newsCopy('ja','팀 레터'),'運営だより');assert.equal(copy.newsCopy('en','공지사항'),'Announcements');
 assert.equal(languages.formatNewsDate('2026-01-02','en'),'Jan 2, 2026');assert(languages.formatNewsDate('2026-01-02','ja').includes('2026年'));
 const sitemap=await load('app/sitemap.ts').default();
 for(const url of ['/news/'+ids.ko,'/en/news/'+ids.en,'/ja/news/'+ids.ja])assert(sitemap.some(row=>row.url.endsWith(url)));
 assert(!sitemap.some(row=>row.url.includes(ids.draft)||row.url.includes(ids.future)||row.url.includes(ids.foreign)));
 const englishSite=sitemap.find(row=>row.url.endsWith('/en/news/'+ids.en));assert(englishSite.alternates.languages.ja.endsWith('/ja/news/'+ids.ja));
 const {middleware}=load('middleware.ts'),{NextRequest}=require('next/server');
 for(const url of ['/en/news','/ja/news','/en/news/'+ids.en,'/ja/news/'+ids.ja])assert.equal(middleware(new NextRequest('https://example.test'+url)).headers.get('location'),null);
 assert.equal(middleware(new NextRequest('https://example.test/zh-tw/news')).headers.get('location'),'https://example.test/news');
 assert.equal((await load('app/api/admin/news/route.ts').GET()).status,410);assert.equal((await load('app/api/admin/news/translate/route.ts').POST()).status,410);
 fail=true;assert.equal((await news.getNews(undefined,'en')).unavailable,true);
 console.log('Passed: KO/empty-language compatibility, EN/JA filtering, publication/date guards, locale-aware API and pagination, real translation IDs, reciprocal published relations, missing-translation list fallback, paginated relations, translated categories/dates, multilingual sitemap/hreflang, redirect removal, zh-TW fallback, retired admin endpoints, source failure. No live writes.');
})().catch(e=>{console.error(e);process.exitCode=1});
