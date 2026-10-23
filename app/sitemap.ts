import { MetadataRoute } from 'next'
import { getNews } from '@/lib/news'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ritty.sam-meows.com'

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      alternates: { languages: { ko: baseUrl, en: `${baseUrl}/en`, 'x-default': baseUrl } },
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/en`,
      alternates: { languages: { ko: baseUrl, en: `${baseUrl}/en`, 'x-default': baseUrl } },
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    { url: `${baseUrl}/news`, changeFrequency: 'weekly', priority: 0.7 },
  ]
  const seenCursors = new Set<string>()
  const seenArticles = new Set<string>()
  let cursor: string | undefined
  do {
    const news = await getNews(cursor)
    for (const article of news.items) {
      if (seenArticles.has(article.id)) continue
      seenArticles.add(article.id)
      entries.push({ url: `${baseUrl}/news/${article.id}`, priority: 0.6 })
    }
    if (!news.cursor || seenCursors.has(news.cursor)) break
    seenCursors.add(news.cursor)
    cursor = news.cursor
  } while (cursor)
  return entries
}
