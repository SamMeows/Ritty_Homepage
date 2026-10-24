'use client'
import { useState } from 'react'
import type { NewsPage } from '@/lib/news'
import NewsModal from './NewsModal'
import './news-modal.css'
import type { Locale } from '@/lib/i18n/dictionaries'
import { newsCopy } from '@/lib/i18n/news-copy'

export default function NewsFeed({initial, locale = 'kr', layout = 'featured'}: {initial:NewsPage; locale?:Locale; layout?:'featured'|'cards'}) {
  const t = (text:string) => newsCopy(locale, text)
  const [data,setData]=useState(initial),[category,setCategory]=useState('전체'),[busy,setBusy]=useState(false),[error,setError]=useState(false)
  const [activeId,setActiveId]=useState<string|null>(null)
  const filtered=data.items.filter(item=>category==='전체'||item.category===category)
  const [featured,...rest]=filtered
  async function more() {
    setBusy(true);setError(false)
    try { const response=await fetch('/api/news'+(data.cursor?'?cursor='+encodeURIComponent(data.cursor):''));if(!response.ok)throw Error();const next:NewsPage=await response.json();setData({...next,items:[...new Map([...data.items,...next.items].map(n=>[n.id,n])).values()]}) } catch {setError(true)} finally{setBusy(false)}
  }
  return <div className="news-board" onClick={event=>{
    const link=(event.target as Element).closest<HTMLAnchorElement>('a[href]')
    const match=link?.getAttribute('href')?.match(/^\/news\/([a-f\d-]+)$/i)
    if(match&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();setActiveId(match[1])}
  }}>
    {locale === 'en' && data.items.length > 0 && <p className="news-language-note">News articles are currently available in Korean.</p>}
    <div className="news-filters" aria-label={t('소식 분류')}>{['전체','공지사항','개발 소식','팀 레터'].map(name=><button key={name} type="button" aria-pressed={category===name} onClick={()=>setCategory(name)}>{t(name)}</button>)}</div>
    {featured ? layout === 'cards' ? <div className="news-card-grid">{filtered.map(item=><a key={item.id} className="news-feature" href={'/news/'+item.id}>
      <div className="news-feature-art">{item.cover ? <img src={item.cover} alt=""/> : <><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span><span aria-hidden="true">NEWS</span></>}</div>
      <div className="news-feature-copy"><div className="news-meta"><span>{t(item.category)}</span><time dateTime={item.date}>{item.date.replaceAll('-','.')}</time></div><h3>{item.title}</h3><span className="news-read">{t('읽어보기 →')}</span></div>
    </a>)}</div> : <div className="news-grid"><a className="news-feature" href={'/news/'+featured.id}>
      <div className="news-feature-art">{featured.cover ? <img src={featured.cover} alt=""/> : <><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span><span aria-hidden="true">NEWS</span></>}</div>
      <div className="news-feature-copy"><div className="news-meta"><span>{t(featured.category)}</span><time dateTime={featured.date}>{featured.date.replaceAll('-','.')}</time></div><h3>{featured.title}</h3><span className="news-read">{t('읽어보기 →')}</span></div>
    </a>{rest.length>0&&<div className="news-rows">{rest.map(n=><a key={n.id} href={'/news/'+n.id}><div className="news-meta"><span>{t(n.category)}</span><time dateTime={n.date}>{n.date.replaceAll('-','.')}</time></div><h3>{n.title}</h3><span aria-hidden="true">→</span></a>)}</div>}</div> : <p className="news-empty" role="status">{data.unavailable?t('소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'):t('등록된 소식이 아직 없어요.')}</p>}
    {(data.cursor||data.unavailable||error)&&<button className="news-more glass" disabled={busy} onClick={more}>{busy?t('불러오는 중…'):error||data.unavailable?t('다시 시도'):t('소식 더 보기 ↓')}</button>}
    {error&&<p role="alert">{t('소식을 불러오지 못했어요. 다시 시도해 주세요.')}</p>}
    {activeId&&<NewsModal locale={locale} id={activeId} onClose={()=>setActiveId(null)}/>}
  </div>
}
