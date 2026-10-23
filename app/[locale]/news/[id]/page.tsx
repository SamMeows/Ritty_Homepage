import '@/components/landing/ad-site.css'
import { notFound } from 'next/navigation'
import { getNewsArticle } from '@/lib/news'
import NewsArticle from '@/components/news/NewsArticle'
import type { Metadata } from 'next'
import { cache } from 'react'
import { newsDescription, newsStructuredData, searchRobots, serializeJsonLd } from '@/lib/seo'
export const dynamic='force-dynamic'
const loadArticle = cache(getNewsArticle)
type Props = {params:Promise<{id:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata> {
  const {id}=await params
  const article=await loadArticle(id)
  if(!article)notFound()
  const title=`${article.title} | 리티 소식`
  const description=newsDescription(article)
  const url=`https://ritty.sam-meows.com/news/${article.id}`
  return {
    title,description,robots:searchRobots,
    alternates:{canonical:url,languages:{}},
    openGraph:{type:'article',url,title,description,siteName:'리티 Ritty',locale:'ko_KR',publishedTime:article.date,images:article.cover?[{url:article.cover}]:[{url:'/og-ritty-island-v2.png'}]},
    twitter:{card:'summary_large_image',title,description,images:[article.cover||'/og-ritty-island-v2.png']},
  }
}
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const article=await loadArticle(id)
  if(!article)notFound()
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(newsStructuredData(article,newsDescription(article)))}}/><div className="ritty-site news-shell"><header className="news-topbar"><a href="/" aria-label="리티 홈"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a><a className="glass" href="/news">소식 목록으로 ←</a></header><main><NewsArticle article={article}/></main><a className="news-back glass" href="/news">목록으로 돌아가기</a></div></>
}
