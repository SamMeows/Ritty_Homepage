import { MetadataRoute } from 'next'
import { getNews, getNewsAlternates, type NewsItem } from '@/lib/news'
import { newsArticlePath, newsListPath } from '@/lib/news-languages'
import type { Locale } from '@/lib/i18n/dictionaries'
// Query Notion at request time so an upstream outage cannot block deployment.
// Failed queries remain errors rather than publishing an incomplete sitemap.
export const dynamic = 'force-dynamic'
export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  const base='https://ritty.sam-meows.com'
  const homeLanguages={ko:base,en:base+'/en',ja:base+'/ja','zh-TW':base+'/zh-tw','x-default':base}
  const entries:MetadataRoute.Sitemap=(['','/en','/ja','/zh-tw']).map(path=>({url:base+path,alternates:{languages:homeLanguages},changeFrequency:'weekly',priority:path?0.9:1}))
  const listLanguages={ko:base+'/news',en:base+'/en/news',ja:base+'/ja/news','zh-TW':base+'/zh-tw/news'}
  const articles:NewsItem[]=[]
  for(const locale of ['kr','en','ja','zh-tw'] as const){
    entries.push({url:base+newsListPath(locale),alternates:{languages:listLanguages},changeFrequency:'weekly',priority:0.7})
    const seen=new Set<string>();let cursor:string|undefined
    do {
      const page=await getNews(cursor,locale)
      if(page.unavailable)throw new Error('News sitemap source unavailable')
      articles.push(...page.items)
      if(!page.cursor || seen.has(page.cursor))break
      seen.add(page.cursor);cursor=page.cursor
    }while(cursor)
  }
  const seen=new Set<string>()
  const families=new Map<string,Partial<Record<Locale,string>>>()
  for(const article of articles){
    if(seen.has(article.id))continue
    seen.add(article.id)
    const family=article.language==='KO'?article.id:article.originalId || article.id
    let paths=families.get(family)
    if(!paths){paths=await getNewsAlternates(article);families.set(family,paths)}
    const languages=Object.fromEntries(Object.entries(paths).map(([locale,path])=>[locale==='kr'?'ko':locale==='zh-tw'?'zh-TW':locale,base+path]))
    entries.push({url:base+newsArticlePath(article.language || 'KO',article.id),alternates:{languages},...(article.modifiedAt?{lastModified:article.modifiedAt}:{}),priority:0.6})
  }
  return entries
}
