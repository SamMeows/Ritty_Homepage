import { localizeNewsArticle } from '@/lib/i18n/news-articles'
import { newsCopy } from '@/lib/i18n/news-copy'
import type { Locale } from '@/lib/i18n/dictionaries'
import '@/components/landing/ad-site.css'
import '@/components/news/news-page.css'
import { notFound } from 'next/navigation'
import { getNewsArticle } from '@/lib/news'
import { newsArticlePath, newsListPath } from '@/lib/news-languages'
import NewsArticle from '@/components/news/NewsArticle'
import NewsLanguageLinks from '@/components/news/NewsLanguageLinks'
import type { Metadata } from 'next'
import { cache } from 'react'
import { newsDescription, newsStructuredData, searchRobots, serializeJsonLd } from '@/lib/seo'
export const dynamic='force-dynamic'
const loadArticle = cache(async (id:string,locale:Locale) => {
  const article=await getNewsArticle(id,locale)
  return article ? localizeNewsArticle(article,locale) : null
})
type Props = {params:Promise<{id:string;locale:Locale}>}
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {id,locale}=await params
  const article=await loadArticle(id,locale)
  if(!article)notFound()
  const title=`${article.title} | ${newsCopy(locale,'리티 소식')}`
  const description=newsDescription(article)
  const base='https://ritty.sam-meows.com'
  const url=base+newsArticlePath(article.language || 'KO',article.id)
  const languages=Object.fromEntries(Object.entries(article.alternatePaths || {}).map(([key,path])=>[key==='kr'?'ko':key==='zh-tw'?'zh-TW':key,base+path]))
  return {
    title,description,robots:searchRobots,alternates:{canonical:url,languages},
    openGraph:{type:'article',url,title,description,siteName:'리티 Ritty',locale:article.language==='ZH-TW'?'zh_TW':article.language==='JA'?'ja_JP':article.language==='EN'?'en_US':'ko_KR',publishedTime:article.date,...(article.modifiedAt?{modifiedTime:article.modifiedAt}:{}),images:[{url:article.cover||'/og-ritty-island-v2.png'}]},
    twitter:{card:'summary_large_image',title,description,images:[article.cover||'/og-ritty-island-v2.png']},
  }
}
export default async function Page({params}:Props){
  const {id,locale}=await params
  const article=await loadArticle(id,locale)
  if(!article)notFound()
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(newsStructuredData(article,newsDescription(article)))}}/><div className="ritty-site news-shell">
    <header className="news-topbar"><a href={locale==='kr'?'/':'/'+locale} aria-label="Ritty"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a><a className="glass" href={newsListPath(locale)}>{newsCopy(locale,'리티 소식')} ←</a></header>
    <NewsLanguageLinks locale={locale} alternatePaths={article.alternatePaths}/><main><NewsArticle article={article}/></main><a className="news-back glass" href={newsListPath(locale)}>{newsCopy(locale,'리티 소식')}</a>
  </div></>
}
