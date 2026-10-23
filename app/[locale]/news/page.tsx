import '@/components/landing/ad-site.css'
import { getNews } from '@/lib/news'
import NewsFeed from '@/components/news/NewsFeed'
export const dynamic='force-dynamic'
export const metadata={title:'리티 소식 | Ritty',alternates:{canonical:'/news'}}
export default async function Page(){return <><div className="ritty-site news-shell"><header className="news-topbar"><a href="/" aria-label="리티 홈"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a><a className="glass" href="/">홈으로 ↗</a></header><main className="news"><div className="news-heading"><div><p className="eyebrow">NEWS FROM RITTY</p><h1>리티 소식</h1></div><span aria-hidden="true">✦</span></div><NewsFeed initial={await getNews()}/></main></div></>}
