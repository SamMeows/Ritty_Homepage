import 'server-only'
import type { Locale } from './i18n/dictionaries'
import { newsLanguage, newsLocale, newsArticlePath, type NewsLanguage } from './news-languages'


export type NewsItem = { id: string; title: string; category: string; date: string; cover?: string; modifiedAt?: string; language?: NewsLanguage; originalId?: string; translationIds?: string[] }
export type NewsBlock = { type: string; text: string; href?: string; children?: NewsBlock[] }
export type NewsArticle = NewsItem & { contentLanguage?: string; languageLabel?: string; blocks?: NewsBlock[]; markdown?: string; displayLocale?: Locale; alternatePaths?: Partial<Record<Locale,string>> }
export type NewsPage = { items: NewsItem[]; cursor: string | null; unavailable?: boolean }
const source = process.env.NOTION_NEWS_DATA_SOURCE_ID || '83793ee8-a696-468d-85ef-9d41e880b692'
const token = () => process.env.NOTION_NEWS_TOKEN || process.env.NOTION_TOKEN
const normalized = (id: string) => id.replaceAll('-', '')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
export const validNewsId = (id: string) => /^[a-f\d]{32}$/i.test(normalized(id))
class NewsApiError extends Error { constructor(public status:number){super(`News API ${status}`)} }
export function safeNewsUrl(value: string): string | undefined {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : undefined } catch { return undefined }
}
export async function newsRequest(path: string, body?: unknown, attempt = 0, method?: 'GET' | 'POST' | 'PATCH'): Promise<any> {
  if (!token()) throw new Error('News integration not configured')
  const res = await fetch('https://api.notion.com/v1/' + path, {
    method: method || (body ? 'POST' : 'GET'), headers: { Authorization: `Bearer ${token()}`, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000),
  })
  if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 1000)); return newsRequest(path, body, attempt + 1, method) }
  if (!res.ok) throw new NewsApiError(res.status)
  return res.json()
}
const plain = (rich: any[]) => (rich || []).map(t => t.plain_text || t.text?.content || '').join('')
function item(page: any): NewsItem | null {
  const date = page.properties?.['게시일']?.date?.start
  const title = plain(page.properties?.['제목']?.title)
  if (page.properties?.['공개']?.checkbox !== true || page.archived || page.in_trash || !date || date.slice(0,10) > today() || !title) return null
  const language = page.properties?.['언어']?.select?.name || 'KO'
  if (!['KO','EN','JA','ZH-TW'].includes(language)) return null
  const relationIds = (name: string) => (page.properties?.[name]?.relation || []).map((entry:any) => normalized(entry.id)).filter(validNewsId)
  return { id: normalized(page.id), title, language, originalId:relationIds('원문')[0], translationIds:relationIds('번역본'), date: date.slice(0,10), category: (page.properties?.['분류']?.select?.name || '공지사항'), cover: safeNewsUrl(page.cover?.external?.url || page.cover?.file?.url || ''), ...(page.last_edited_time && Number.isFinite(Date.parse(page.last_edited_time)) ? {modifiedAt: page.last_edited_time} : {}) }
}
export async function getNews(cursor?: string, locale: Locale = 'kr'): Promise<NewsPage> {
  if (!source || !token()) return {items:[],cursor:null}
  try {
    const language = newsLanguage(locale)
    const languageFilter = language === 'KO' ? {or:[{property:'언어',select:{equals:'KO'}},{property:'언어',select:{is_empty:true}}]} : {property:'언어',select:{equals:language}}
    const data = await newsRequest(`data_sources/${source}/query`, { page_size: 20, ...(cursor ? {start_cursor:cursor} : {}), filter: {and:[{property:'공개',checkbox:{equals:true}},{property:'게시일',date:{on_or_before:today()}},languageFilter]}, sorts:[{property:'게시일',direction:'descending'}] })
    return { items:data.results.map(item).filter((entry:NewsItem|null) => entry && entry.language === language), cursor:data.has_more ? data.next_cursor : null }
  } catch { return {items:[],cursor:null,unavailable:true} }
}
async function blocks(id: string, depth = 0): Promise<NewsBlock[]> {
  if (depth > 8) throw new Error('News content nesting limit')
  const result: NewsBlock[] = []; let cursor: string | undefined
  do {
    const data = await newsRequest(`blocks/${id}/children?page_size=100${cursor ? '&start_cursor='+encodeURIComponent(cursor):''}`)
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
async function newsPage(id: string): Promise<any | null> {
  if (!validNewsId(id)) return null
  let page
  try { page = await newsRequest('pages/' + id) } catch(error) { if(error instanceof NewsApiError && error.status===404)return null;throw error }
  return normalized(page.parent?.data_source_id || '') === normalized(source) && !page.archived && !page.in_trash ? page : null
}
export async function getNewsArticle(id: string, locale: Locale = 'kr'): Promise<NewsArticle | null> {
  const page = await newsPage(id)
  if (!page) return null
  const summary = item(page)
  if (!summary || summary.language !== newsLanguage(locale)) return null
  const article: NewsArticle = {...summary, contentLanguage:newsLocale(summary.language), blocks:await blocks(page.id)}
  try { article.alternatePaths = await getNewsAlternates(article, page) }
  catch { article.alternatePaths = {[newsLocale(summary.language)]:newsArticlePath(summary.language,summary.id)} }
  return article
}

// Resolve only explicitly related, published pages in this data source. A missing
// translation links to its language's list in the UI, never a guessed article ID.
export async function getNewsAlternates(article: NewsItem, currentPage?: any): Promise<Partial<Record<Locale,string>>> {
  const language = article.language || 'KO'
  const result: Partial<Record<Locale,string>> = {[newsLocale(language)]:newsArticlePath(language,article.id)}
  const rootId = language === 'KO' ? article.id : article.originalId
  if (!rootId) return result
  const root = language === 'KO' && currentPage ? currentPage : await newsPage(rootId)
  if (!root || (root.properties?.['언어']?.select?.name || 'KO') !== 'KO') return result
  const original = item(root)
  if (original) result.kr = newsArticlePath('KO',original.id)
  let relations = root.properties?.['번역본']?.relation || []
  if (root.properties?.['번역본']?.has_more) {
    relations = []
    let cursor: string | undefined
    do {
      const data = await newsRequest('pages/' + rootId + '/properties/' + encodeURIComponent(root.properties['번역본'].id) + '?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''))
      relations.push(...data.results.map((entry:any) => entry.relation).filter(Boolean))
      cursor = data.has_more ? data.next_cursor : undefined
    } while(cursor)
  }
  for (const relation of relations) {
    const id = normalized(relation.id)
    if (!validNewsId(id) || id === article.id) continue
    try {
      const page = await newsPage(id)
      const translated = page && item(page)
      if (!translated || translated.language === 'KO' || translated.originalId !== normalized(rootId)) continue
      const locale = newsLocale(translated.language!)
      if (!result[locale]) result[locale] = newsArticlePath(translated.language!,translated.id)
    } catch { /* A missing/inaccessible sibling must not break the current article. */ }
  }
  return result
}
