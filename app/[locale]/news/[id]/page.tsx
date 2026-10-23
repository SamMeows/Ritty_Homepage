import '@/components/landing/ad-site.css'
import { notFound } from 'next/navigation'
import { getNewsArticle } from '@/lib/news'
import NewsArticle from '@/components/news/NewsArticle'
export const dynamic='force-dynamic'
export const metadata={title:'리티 소식 | Ritty',robots:{index:false,follow:true},alternates:{canonical:null}}
export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const article=await getNewsArticle(id)
  if(!article)notFound()
  return <><div className="ritty-site news-shell"><header className="news-topbar"><a href="/" aria-label="리티 홈"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a><a className="glass" href="/news">소식 목록으로 ←</a></header><main><NewsArticle article={article}/></main><a className="news-back glass" href="/news">목록으로 돌아가기</a></div></>
}
