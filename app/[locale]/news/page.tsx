import '@/components/landing/ad-site.css'
import '@/components/news/news-page.css'
import { getNews } from '@/lib/news'
import NewsFeed from '@/components/news/NewsFeed'
import type { Metadata } from 'next'
export const dynamic='force-dynamic'
export const metadata: Metadata={
  title:'리티 소식 | 개발 이야기와 공지',
  description:'말하는 고양이와 함께하는 힐링 게임 리티의 개발 이야기, 업데이트와 출시 소식을 확인하세요.',
  alternates:{canonical:'/news',languages:{}},
  openGraph:{type:'website',url:'/news',siteName:'리티 Ritty',locale:'ko_KR',title:'리티 소식 | 개발 이야기와 공지',description:'리티의 개발 이야기, 업데이트와 출시 소식을 확인하세요.',images:[{url:'/og-ritty-island-v2.png',width:1200,height:630}]},
  twitter:{card:'summary_large_image',title:'리티 소식 | 개발 이야기와 공지',description:'리티의 개발 이야기, 업데이트와 출시 소식을 확인하세요.',images:['/og-ritty-island-v2.png']},
}
export default async function Page() {
  return <div className="ritty-site news-shell news-list-page">
    <header className="news-topbar">
      <a href="/" aria-label="리티 홈"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a>
      <a className="glass" href="/">홈으로 ↗</a>
    </header>
    <main className="news">
      <div className="news-heading"><div>
        <p className="eyebrow">NEWS FROM RITTY</p>
        <h1>리티 소식</h1>
        <p className="news-intro">고양이들과 함께 만들어가는 리티의 이야기.<br/>개발 이야기부터 새로운 소식까지, 이곳에서 전해드려요.</p>
      </div></div>
      <NewsFeed initial={await getNews()} layout="cards"/>
    </main>
  </div>
}
