import NewsLanguageLinks from '@/components/news/NewsLanguageLinks'
import type { Locale } from '@/lib/i18n/dictionaries'
import { newsCopy } from '@/lib/i18n/news-copy'
import '@/components/landing/ad-site.css'
import '@/components/news/news-page.css'
import { getNews } from '@/lib/news'
import NewsFeed from '@/components/news/NewsFeed'
import type { Metadata } from 'next'
export const dynamic='force-dynamic'
export async function generateMetadata({params}:{params:Promise<{locale:Locale}>}):Promise<Metadata> {
  const {locale}=await params
  const title=newsCopy(locale,'리티 소식')+' | Ritty'
  const descriptions = {
    kr: '리티의 개발 이야기, 업데이트와 출시 소식을 확인하세요. 말하는 고양이와 함께하는 힐링 생활 시뮬레이션 게임의 새로운 소식을 전해드려요.',
    en: 'Discover Ritty development stories, updates and launch news. Follow the latest from our cozy life simulation game with talking cats.',
    ja: 'Rittyの開発ストーリー、アップデート、配信情報をお届けします。おしゃべり猫たちとの癒やしの暮らしを楽しむゲームの最新ニュースをご覧ください。',
    'zh-tw': '查看 Ritty 的開發故事、更新與上線消息，掌握與會說話的貓咪一起享受療癒島嶼生活的最新動態。',
  }
  const description = descriptions[locale]
  const path=locale==='kr'?'/news':'/'+locale+'/news'
  const images = [{url:'/og-ritty-island-v2.png',width:1200,height:630,alt:title}]
  return {
    title, description,
    alternates:{canonical:path,languages:{ko:'/news',en:'/en/news',ja:'/ja/news','zh-TW':'/zh-tw/news'}},
    openGraph:{title,description,images,siteName:'리티 Ritty',url:path,type:'website',locale:locale==='zh-tw'?'zh_TW':locale==='en'?'en_US':locale==='ja'?'ja_JP':'ko_KR'},
    twitter:{card:'summary_large_image',title,description,images},
  }
}
export default async function Page({params}:{params:Promise<{locale:Locale}>}) {
  const {locale}=await params
  const home=locale==='kr'?'/':'/'+locale
  const homeLabel=locale==='zh-tw'?'首頁':locale==='ja'?'ホームへ':locale==='en'?'Home':'홈으로'
  return <div className="ritty-site news-shell news-list-page">
    <header className="news-topbar">
      <a href={home} aria-label="리티 홈"><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span></a>
      <a className="glass" href={home}>{homeLabel} ←</a>
    </header>
    <main className="news"><NewsLanguageLinks locale={locale}/>
      <div className="news-heading"><div>
        <p className="eyebrow">NEWS FROM RITTY</p>
        <h1>{newsCopy(locale,'리티 소식')}</h1>
        <p className="news-intro">{locale==='zh-tw'?'來自 Ritty 團隊的開發故事與最新消息。':locale==='ja'?'リティの開発ニュースをお届けします。':locale==='en'?'Development news and stories from the Ritty team.':'리티의 개발 이야기와 새로운 소식을 전해드려요.'}</p>
      </div></div>
      <NewsFeed locale={locale} initial={await getNews(undefined,locale)} layout="cards"/>
    </main>
  </div>
}
