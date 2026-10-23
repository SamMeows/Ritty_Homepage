import 'server-only'


export type NewsItem = { id: string; title: string; category: string; date: string; cover?: string }
export type NewsBlock = { type: string; text: string; href?: string; children?: NewsBlock[] }
export type NewsArticle = NewsItem & { blocks?: NewsBlock[]; markdown?: string }
export type NewsPage = { items: NewsItem[]; cursor: string | null; unavailable?: boolean }
const source = process.env.NOTION_NEWS_DATA_SOURCE_ID || ''
const token = () => process.env.NOTION_NEWS_TOKEN || process.env.NOTION_TOKEN
const normalized = (id: string) => id.replaceAll('-', '')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
export const validNewsId = (id: string) => /^[a-f\d]{32}$/i.test(normalized(id))
class NewsApiError extends Error { constructor(public status:number){super(`News API ${status}`)} }
export function safeNewsUrl(value: string): string | undefined {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined } catch { return undefined }
}
async function api(path: string, body?: unknown, attempt = 0): Promise<any> {
  if (!token()) throw new Error('News integration not configured')
  const res = await fetch('https://api.notion.com/v1/' + path, {
    method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token()}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000),
  })
  if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 1000)); return api(path, body, attempt + 1) }
  if (!res.ok) throw new NewsApiError(res.status)
  return res.json()
}
const plain = (rich: any[]) => (rich || []).map(t => t.plain_text || t.text?.content || '').join('')
function item(page: any): NewsItem | null {
  const date = page.properties?.['게시일']?.date?.start
  const title = plain(page.properties?.['제목']?.title)
  if (page.properties?.['공개']?.checkbox !== true || page.archived || page.in_trash || !date || date.slice(0,10) > today() || !title) return null
  return { id: normalized(page.id), title, date: date.slice(0,10), category: (page.properties?.['분류']?.select?.name || '공지사항'), cover: safeNewsUrl(page.cover?.external?.url || page.cover?.file?.url || '') }
}
export async function getNews(cursor?: string): Promise<NewsPage> {
  if (!source) return {items:[],cursor:null}
  try {
    const data = await api(`data_sources/${source}/query`, { page_size: 20, ...(cursor ? {start_cursor:cursor} : {}), filter: {and:[{property:'공개',checkbox:{equals:true}},{property:'게시일',date:{on_or_before:today()}}]}, sorts:[{property:'게시일',direction:'descending'}] })
    return { items:data.results.map(item).filter(Boolean), cursor:data.has_more ? data.next_cursor : null }
  } catch { return {items:[],cursor:null,unavailable:true} }
}
async function blocks(id: string, depth = 0): Promise<NewsBlock[]> {
  if (depth > 8) throw new Error('News content nesting limit')
  const result: NewsBlock[] = []; let cursor: string | undefined
  do {
    const data = await api(`blocks/${id}/children?page_size=100${cursor ? '&start_cursor='+encodeURIComponent(cursor):''}`)
    for (const b of data.results) {
      const value = b[b.type] || {}
      const text = plain(value.rich_text || value.caption)
      const href = safeNewsUrl(value.external?.url || value.file?.url || value.url || '')
      // Never follow linked/synced pages outside this public news entry.
      if (['child_page','child_database','synced_block','unsupported'].includes(b.type)) continue
      const children = b.has_children ? await blocks(b.id, depth+1) : undefined
      const links: NewsBlock[] = (value.rich_text || []).filter((r:any)=>r.href || r.text?.link?.url).map((r:any)=>({type:'link',text:r.plain_text||r.text.content,href:safeNewsUrl(r.href||r.text.link.url)})).filter((r:NewsBlock)=>r.href)
      result.push({type:b.type,text: b.type==='table_row' ? value.cells.map(plain).join(' | ') : text,href,children:[...(children||[]),...links]})
    }
    cursor = data.has_more ? data.next_cursor : undefined
  } while(cursor)
  return result
}
export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  if (!source || !validNewsId(id)) return null
  let page
  try { page = await api(`pages/${id}`) } catch(error) { if(error instanceof NewsApiError && error.status===404)return null;throw error }
  if (normalized(page.parent?.data_source_id || '') !== normalized(source)) return null
  const summary = item(page)
  return summary ? {...summary,blocks:await blocks(page.id)} : null
}
