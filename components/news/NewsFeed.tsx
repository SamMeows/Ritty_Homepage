'use client'
import { useState } from 'react'
import type { NewsPage } from '@/lib/news'
import NewsModal from './NewsModal'
import './news-modal.css'

export default function NewsFeed({initial}: {initial:NewsPage}) {
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
    <div className="news-filters" aria-label="소식 분류">{['전체','공지사항','패치노트','팀 레터'].map(name=><button key={name} type="button" aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</button>)}</div>
    {featured ? <div className="news-grid"><a className="news-feature" href={'/news/'+featured.id}>
      <div className="news-feature-art">{featured.cover ? <img src={featured.cover} alt=""/> : <><span className="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span><span aria-hidden="true">NEWS</span></>}</div>
      <div className="news-feature-copy"><div className="news-meta"><span>{featured.category}</span><time dateTime={featured.date}>{featured.date.replaceAll('-','.')}</time></div><h3>{featured.title}</h3><span className="news-read">읽어보기 →</span></div>
    </a><div className="news-rows">{rest.map(n=><a key={n.id} href={'/news/'+n.id}><div className="news-meta"><span>{n.category}</span><time dateTime={n.date}>{n.date.replaceAll('-','.')}</time></div><h3>{n.title}</h3><span aria-hidden="true">→</span></a>)}{!rest.length&&<p className="news-empty">이 분류의 최신 소식입니다.</p>}</div></div> : <p className="news-empty" role="status">{data.unavailable?'소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.':'등록된 소식이 아직 없어요.'}</p>}
    {(data.cursor||data.unavailable||error)&&<button className="news-more glass" disabled={busy} onClick={more}>{busy?'불러오는 중…':error||data.unavailable?'다시 시도':'소식 더 보기 ↓'}</button>}
    {error&&<p role="alert">소식을 불러오지 못했어요. 다시 시도해 주세요.</p>}
    {activeId&&<NewsModal id={activeId} onClose={()=>setActiveId(null)}/>}
  </div>
}
