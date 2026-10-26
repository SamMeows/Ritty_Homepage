import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
const MARKER = 'ritty_marketing_subscription_v1:'
type State = { subscribed: boolean; isTest: boolean; updatedAt: string; withdrawnAt?: string }
function config() {
 const token = process.env.NOTION_TOKEN, database = process.env.NOTION_PRE_REGISTER_DB_ID
 if (!token || !database) throw new Error('Subscription storage unavailable')
 return { token, database }
}
async function notion(path: string, method = 'GET', body?: unknown) {
 const response = await fetch('https://api.notion.com/v1' + path, { method,
 headers: { Authorization: 'Bearer ' + config().token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
 body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000) })
 if (!response.ok) throw new Error('Subscription storage request failed')
 return response.json()
}
function paragraph(state: State) { return { rich_text: [{ type: 'text', text: { content: MARKER + JSON.stringify(state) } }] } }
export function marketingSubscriptionBlock(subscribed: boolean, isTest: boolean) {
 return { object: 'block', type: 'paragraph', paragraph: paragraph({ subscribed, isTest, updatedAt: new Date().toISOString() }) }
}
function signature(id: string) {
 return createHmac('sha256', process.env.MARKETING_UNSUBSCRIBE_SECRET || config().token).update('ritty:marketing-only:v1:' + id).digest('base64url')
}
// Mail builders must check canReceiveMarketing immediately before sending.
export function marketingUnsubscribeUrl(pageId: string, locale = 'kr') {
 const id = pageId.replace(/-/g, '').toLowerCase()
 if (!/^[a-f0-9]{32}$/.test(id)) throw new Error('Invalid registration id')
 const url = new URL('/unsubscribe', process.env.NEXT_PUBLIC_SITE_URL || 'https://ritty.sam-meows.com')
 url.searchParams.set('lang', locale)
 // Fragment keeps the bearer credential out of HTTP access logs and referrers.
 url.hash = id + '.' + signature(id)
 return url.toString()
}
function verify(token: string) {
 if (!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return null
 const [id, signed] = token.split('.')
 return timingSafeEqual(Buffer.from(signed), Buffer.from(signature(id))) ? id : null
}
async function subscription(id: string): Promise<{ blockId: string; state: State; hasConsentColumn: boolean } | null> {
 const page = await notion('/pages/' + id)
 if (page.archived || page.in_trash || page.parent?.database_id?.replace(/-/g, '') !== config().database.replace(/-/g, '')) return null
 let cursor: string | undefined
 do {
  const data = await notion('/blocks/' + id + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''))
  for (const block of data.results) {
   const value = block.paragraph?.rich_text.map((t: { plain_text?: string; text?: { content: string } }) => t.plain_text ?? t.text?.content ?? '').join('') || ''
   if (!value.startsWith(MARKER)) continue
   const state = JSON.parse(value.slice(MARKER.length)) as State
   if (typeof state.subscribed !== 'boolean' || typeof state.isTest !== 'boolean') throw new Error('Invalid subscription state')
   return { blockId: block.id, state, hasConsentColumn: page.properties?.['Marketing Consent']?.type === 'checkbox' }
  }
  cursor = data.has_more ? data.next_cursor : undefined
 } while (cursor)
 return null // Legacy registrations are not silently opted into development emails.
}
export async function canReceiveMarketing(id: string) {
 const record = await subscription(id)
 return !!record?.state.subscribed && !record.state.isTest
}
export async function unsubscribeMarketing(token: string) {
 const id = verify(token)
 if (!id) return false
 const record = await subscription(id)
 if (!record) return false
 const now = new Date().toISOString()
 if (record.state.subscribed) await notion('/blocks/' + record.blockId, 'PATCH', { paragraph: paragraph({ ...record.state, subscribed: false, updatedAt: now, withdrawnAt: now }) })
 if (record.hasConsentColumn) await notion('/pages/' + id, 'PATCH', { properties: { 'Marketing Consent': { checkbox: false } } })
 return true
}

// Call this wrapper for each development-news recipient, instead of sending directly.
// Launch/reward mail follows its separate pre-registration workflow.
export async function deliverMarketingEmail(
 pageId: string,
 locale: string,
 send: (unsubscribeUrl: string) => Promise<void>,
) {
 if (!await canReceiveMarketing(pageId)) return { sent: false as const }
 await send(marketingUnsubscribeUrl(pageId, locale))
 return { sent: true as const }
}
