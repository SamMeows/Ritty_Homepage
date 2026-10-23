import { safeNewsUrl, type NewsArticle as Article, type NewsBlock } from '@/lib/news'
import type { ReactNode } from 'react'

function links(text:string):ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^\s)]+\))/g).map((part,i)=>{
    const match=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if(!match)return part
    const id=match[2].match(/(?:\/p\/)([a-f\d]{32})/i)?.[1]
    const href=id?'/news/'+id:safeNewsUrl(match[2])
    return href?<a key={i} href={href} {...(!id?{target:'_blank',rel:'noopener noreferrer'}:{})}>{match[1]}</a>:match[1]
  })
}
function blockView(block:NewsBlock,index:number):ReactNode {
  const children=block.children?.map(blockView)
  const content=<>{block.text}{children}</>
  if(block.type==='image')return block.href?<figure key={index}><img src={block.href} alt={block.text} loading="lazy"/>{block.text&&<figcaption>{block.text}</figcaption>}</figure>:null
  if(block.type==='divider')return <hr key={index}/>
  if(block.type.startsWith('heading'))return <h3 key={index}>{content}</h3>
  if(block.type==='toggle')return <details key={index} open><summary>{block.text}</summary>{children}</details>
  if(block.type==='code')return <pre key={index}>{block.text}</pre>
  if(['link','bookmark','embed','video','file'].includes(block.type))return block.href?<p key={index}><a href={block.href} target="_blank" rel="noopener noreferrer">{block.text||'첨부 자료 보기'} ↗</a></p>:null
  if(block.type==='bulleted_list_item'||block.type==='numbered_list_item')return <ul key={index}><li>{content}</li></ul>
  return <div className="news-paragraph" key={index}>{content}</div>
}
export default function NewsArticle({article}:{article:Article}) {
  // Connector snapshot is preview-only. Render text safely without injecting Notion HTML.
  const markdown=article.markdown?.replace(/<br\s*\/?\s*>/g,'\n').replace(/<[^>]*>/g,'').replace(/\\([\[\]~*_])/g,'$1')
  return <article className="news-article"><div className="news-meta"><span>{article.category}</span><time dateTime={article.date}>{article.date.replaceAll('-','.')}</time></div><h1>{article.title}</h1><div className="news-body">{article.blocks?.map(blockView)}{markdown?.split(/\n\s*\n/).map((part,i)=>part.startsWith('#')?<h3 key={i}>{links(part.replace(/^#+\s*/,''))}</h3>:<p key={i}>{links(part)}</p>)}</div></article>
}
