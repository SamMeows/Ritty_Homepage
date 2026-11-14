import { MetadataRoute } from 'next'
import { getNews, type NewsItem } from '@/lib/news'
import { newsArticlePath, newsListPath, newsLocale } from '@/lib/news-languages'
import { unstable_cache } from 'next/cache'
// Query Notion at request time so an upstream outage cannot block deployment.
// Cache only complete successful snapshots; failed refreshes retain the last one.
export const dynamic = 'force-dynamic'
const cachedSitemap = unstable_cache(async ():Promise<MetadataRoute.Sitemap> => {
  const base='https://ritty.sam-meows.com'
  const homeLanguages={ko:base,en:base+'/en',ja:base+'/ja','zh-TW':base+'/zh-tw','x-default':base}
  const entries:MetadataRoute.Sitemap=(['','/en','/ja','/zh-tw']).map(path=>({url:base+path,alternates:{languages:homeLanguages},changeFrequency:'weekly',priority:path?0.9:1}))
  const listLanguages={ko:base+'/news',en:base+'/en/news',ja:base+'/ja/news','zh-TW':base+'/zh-tw/news'}
  const feeds = await Promise.all((['kr','en','ja','zh-tw'] as const).map(async locale => {
    const articles: NewsItem[] = []
    const seen = new Set<string>()
    let cursor: string | undefined
    do {
      const page = await getNews(cursor, locale)
      if (page.unavailable) throw new Error('News sitemap source unavailable')
      articles.push(...page.items)
      if (!page.cursor) break
      if (seen.has(page.cursor)) throw new Error('News sitemap repeated cursor')
      seen.add(page.cursor)
      cursor = page.cursor
    } while (cursor)
    return articles
  }))
  for (const locale of ['kr','en','ja','zh-tw'] as const) {
    entries.push({url:base+newsListPath(locale),alternates:{languages:listLanguages},changeFrequency:'weekly',priority:0.7})
  }
  const articles = [...new Map(feeds.flat().map(article => [article.id, article])).values()]
  const byId = new Map(articles.map(article => [article.id, article]))
  const families = new Map<string, Record<string,string>>()
  for (const article of articles) {
    const original = !article.language || article.language === 'KO' ? article : byId.get(article.originalId || '')
    const linked = original && (!original.language || original.language === 'KO') &&
      (original.id === article.id || original.translationIds?.includes(article.id))
    const family = linked ? original.id : article.id
    const languages = families.get(family) || {}
    const locale = newsLocale(article.language || 'KO')
    const key = locale === 'kr' ? 'ko' : locale === 'zh-tw' ? 'zh-TW' : locale
    const url = base + newsArticlePath(article.language || 'KO',article.id)
    if (languages[key] && languages[key] !== url) throw new Error('News sitemap duplicate translation')
    languages[key] = url
    families.set(family,languages)
    entries.push({url,alternates:{languages},...(article.modifiedAt?{lastModified:article.modifiedAt}:{}),priority:0.6})
  }
  return entries
}, ['ritty-sitemap-v2', process.env.NOTION_NEWS_DATA_SOURCE_ID || '83793ee8-a696-468d-85ef-9d41e880b692'], {revalidate:300,tags:['ritty-public-news']})

export default async function sitemap():Promise<MetadataRoute.Sitemap> {
  // On a cold cache, errors remain errors so crawlers retry a complete sitemap.
  return cachedSitemap()
}
