import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

const MARKER = 'ritty_marketing_subscription_v1:'
const LOCALES = new Set(['kr', 'en', 'ja', 'zh-tw'])
const CONTACT_TITLE = 'Ritty newsletter contact · '
type State = { subscribed: boolean; isTest: boolean; updatedAt: string; withdrawnAt?: string }
type StateRecord = { blockId: string; state: State }
type SubscriptionRecord = { page: any; states: StateRecord[]; bodyIsTest: boolean }
export type MarketingRecipient = { pageId: string; email: string; locale: string }

function normalizedId(value: unknown): string | null {
 if (typeof value !== 'string') return null
 const id = value.replace(/-/g, '').toLowerCase()
 return /^[a-f0-9]{32}$/.test(id) ? id : null
}
function config() {
 const token = process.env.NOTION_TOKEN, database = normalizedId(process.env.NEWSLETTER_RECIPIENT_DATA_SOURCE_ID || process.env.NOTION_PRE_REGISTER_DB_ID)
 if (!token || !database) throw new Error('Subscription storage unavailable')
 return { token, database }
}
async function notion(path: string, method = 'GET', body?: unknown, attempt = 0): Promise<any> {
 const response = await fetch('https://api.notion.com/v1' + path, { method,
  headers: { Authorization: 'Bearer ' + config().token, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15000) })
 // An explicit rate-limit rejection is safe to retry; ambiguous writes are not.
 if (response.status === 429 && attempt < 2) {
  const seconds = Number(response.headers.get('retry-after') || 1)
  if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 15) {
   await new Promise(resolve => setTimeout(resolve, Math.max(seconds, 1) * 1000))
   return notion(path, method, body, attempt + 1)
  }
 }
 if (!response.ok) throw new Error('Subscription storage request failed')
 return response.json()
}
function plain(richText: unknown): string {
 return Array.isArray(richText) ? richText.map(t => t?.plain_text ?? t?.text?.content ?? '').join('') : ''
}
function paragraph(state: State) { return { rich_text: [{ type: 'text', text: { content: MARKER + JSON.stringify(state) } }] } }
export function marketingSubscriptionBlock(subscribed: boolean, isTest: boolean) {
 return { object: 'block', type: 'paragraph', paragraph: paragraph({ subscribed, isTest, updatedAt: new Date().toISOString() }) }
}
function signature(id: string) {
 return createHmac('sha256', process.env.MARKETING_UNSUBSCRIBE_SECRET || config().token).update('ritty:marketing-only:v1:' + id).digest('base64url')
}
function credential(pageId: string) {
 const id = normalizedId(pageId)
 if (!id) throw new Error('Invalid registration id')
 return id + '.' + signature(id)
}
function siteUrl(path: string) {
 const base = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ritty.sam-meows.com')
 const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(base.hostname)
 if (base.protocol !== 'https:' && !(local && base.protocol === 'http:')) throw new Error('Invalid site origin')
 return new URL(path, base)
}
export function marketingUnsubscribeUrl(pageId: string, locale = 'kr') {
 const url = siteUrl('/unsubscribe')
 url.searchParams.set('lang', LOCALES.has(locale) ? locale : 'kr')
 // Fragment keeps the visible link's bearer credential out of access logs/referrers.
 url.hash = credential(pageId)
 return url.toString()
}
export function marketingOneClickUnsubscribeUrl(pageId: string, _locale = 'kr') {
 const url = siteUrl('/api/marketing/unsubscribe')
 // RFC 8058 clients must POST this URL. Do not log or track its query string.
 url.searchParams.set('token', credential(pageId))
 return url.toString()
}
function verify(token: string) {
 if (!/^[a-f0-9]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return null
 const [id, signed] = token.split('.')
 return timingSafeEqual(Buffer.from(signed), Buffer.from(signature(id))) ? id : null
}
function member(page: any) {
 const parentId = normalizedId(page.parent?.data_source_id === undefined ? page.parent?.database_id : page.parent.data_source_id)
 return !page.archived && !page.in_trash && (parentId === config().database || !!manualContact(page))
}
function manualContact(page: any): { email: string; locale: string } | null {
 const queue = normalizedId(process.env.NEWSLETTER_QUEUE_PAGE_ID)
 if (!queue || normalizedId(page.parent?.page_id) !== queue || page.public_url || page.archived || page.in_trash) return null
 const title = plain(page.properties?.title?.title)
 if (!title.startsWith(CONTACT_TITLE)) return null
 const [locale, ...parts] = title.slice(CONTACT_TITLE.length).split(' · ')
 const email = emailAddress(parts.join(' · '))
 return email && LOCALES.has(locale) ? { email, locale } : null
}
function emailAddress(value: string): string | null {
 // Reject control characters before trimming; never pass them into a mail header.
 if (/[\u0000-\u001f\u007f]/.test(value)) return null
 const email = value.trim().toLowerCase()
 if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)) return null
 const [local, domain] = email.split('@')
 if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || domain.split('.').some(label => label.length > 63)) return null
 return email
}
function propertyIsTest(page: any) {
 const props = page.properties || {}
 return props['Is Test']?.checkbox === true
  || plain(props['UTM Source']?.rich_text).trim().toLowerCase() === 'internal_test'
  || plain(props['UTM Campaign']?.rich_text).trim().toLowerCase() === 'registration_qa'
}
function hasCheckedConsent(page: any) {
 return page.properties?.['Marketing Consent']?.checkbox === true
}
function recipientFromPage(page: any): MarketingRecipient | null {
 if (!member(page) || propertyIsTest(page) || page.properties?.['Email Suppressed']?.checkbox === true) return null
 const pageId = normalizedId(page.id)
 const manual = manualContact(page)
 const email = manual?.email || emailAddress(plain(page.properties?.Email?.title))
 const locale = manual?.locale || page.properties?.Locale?.select?.name
 return pageId && email && typeof locale === 'string' && LOCALES.has(locale) ? { pageId, email, locale } : null
}
function nextCursor(data: any, seen: Set<string>): string | undefined {
 if (!data.has_more) return undefined
 if (typeof data.next_cursor !== 'string' || !data.next_cursor || seen.has(data.next_cursor)) throw new Error('Invalid subscription pagination')
 seen.add(data.next_cursor)
 return data.next_cursor
}

// Property-only estimate for previews. Every recipient must be checked again at send time.
// Keep duplicate emails as separate records so the worker can reconcile their state.
export async function listMarketingCandidates(locale: string): Promise<MarketingRecipient[]> {
 if (!LOCALES.has(locale)) return []
 const result: MarketingRecipient[] = [], pageIds = new Set<string>(), cursors = new Set<string>()
 let cursor: string | undefined
 do {
  const data = await notion('/data_sources/' + config().database + '/query', 'POST', {
   page_size: 100, ...(cursor ? { start_cursor: cursor } : {}), filter: { property: 'Locale', select: { equals: locale } },
  })
  if (!Array.isArray(data.results)) throw new Error('Invalid subscription list')
  for (const page of data.results) {
   const recipient = recipientFromPage(page)
   if (recipient && recipient.locale === locale && hasCheckedConsent(page) && !pageIds.has(recipient.pageId)) {
    pageIds.add(recipient.pageId); result.push(recipient)
   }
  }
  cursor = nextCursor(data, cursors)
 } while (cursor)
 return result
}
async function subscription(id: string): Promise<SubscriptionRecord | null> {
 const page = await notion('/pages/' + id)
 if (!member(page) || normalizedId(page.id) !== id) return null
 const states: StateRecord[] = [], cursors = new Set<string>()
 let cursor: string | undefined, bodyIsTest = false
 do {
  const data = await notion('/blocks/' + id + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''))
  if (!Array.isArray(data.results)) throw new Error('Invalid subscription blocks')
  for (const block of data.results) {
   const value = plain(block.paragraph?.rich_text ?? block[block.type]?.rich_text).trim()
   if (/^registration_test:\s*true\s*$/im.test(value)) bodyIsTest = true
   if (!value.includes(MARKER)) continue
   if (!value.startsWith(MARKER) || block.type !== 'paragraph') throw new Error('Invalid subscription state')
   const state = JSON.parse(value.slice(MARKER.length)) as State
   if (!state || typeof state.subscribed !== 'boolean' || typeof state.isTest !== 'boolean'
    || typeof state.updatedAt !== 'string' || !Number.isFinite(Date.parse(state.updatedAt))
    || (state.withdrawnAt !== undefined && (typeof state.withdrawnAt !== 'string' || !Number.isFinite(Date.parse(state.withdrawnAt))))
    || typeof block.id !== 'string') throw new Error('Invalid subscription state')
   states.push({ blockId: block.id, state })
  }
  cursor = nextCursor(data, cursors)
 } while (cursor)
 // Concurrent identical withdrawals are harmless; contradictory states require repair.
 const first = states[0]?.state
 if (first && states.some(({ state }) => state.subscribed !== first.subscribed || state.isTest !== first.isTest || !!state.withdrawnAt !== !!first.withdrawnAt)) throw new Error('Conflicting subscription state')
 return { page, states, bodyIsTest }
}
export async function getMarketingRecipient(pageId: string): Promise<MarketingRecipient | null> {
 const id = normalizedId(pageId)
 if (!id) return null
 const record = await subscription(id)
 if (!record || record.bodyIsTest) return null
 const recipient = recipientFromPage(record.page)
 if (!recipient) return null
 // The operator maintains the DB checkbox. Neither a legacy form version nor
 // an old positive state may override an unchecked/missing checkbox.
 if (!manualContact(record.page) && !hasCheckedConsent(record.page)) return null
 const state = record.states[0]?.state
 // Stored withdrawals still veto consent; checking the DB box cannot undo them.
 if (state) return state.subscribed && !state.isTest && !state.withdrawnAt ? recipient : null
 return hasCheckedConsent(record.page) ? recipient : null
}
export async function canReceiveMarketing(pageId: string) {
 return !!await getMarketingRecipient(pageId)
}
async function persistWithdrawal(id: string, record: SubscriptionRecord) {
 const now = new Date().toISOString()
 if (!record.states.length) {
  // Old registrations have no state block. Persist withdrawal before updating UI fields.
  const state: State = { subscribed: false, isTest: record.bodyIsTest || propertyIsTest(record.page), updatedAt: now, withdrawnAt: now }
  await notion('/blocks/' + id + '/children', 'PATCH', { children: [{ object: 'block', type: 'paragraph', paragraph: paragraph(state) }] })
 } else {
  for (const { blockId, state } of record.states) {
   if (state.subscribed || !state.withdrawnAt) await notion('/blocks/' + blockId, 'PATCH', {
    paragraph: paragraph({ ...state, subscribed: false, updatedAt: now, withdrawnAt: state.withdrawnAt || now }),
   })
  }
 }
}
async function syncConsentColumn(id: string, record: SubscriptionRecord) {
 const consent = record.page.properties?.['Marketing Consent']
 if (consent?.type === 'checkbox' && consent.checkbox !== false) {
  await notion('/pages/' + id, 'PATCH', { properties: { 'Marketing Consent': { checkbox: false } } })
 }
}
async function matchingEmailPageIds(email: string): Promise<string[]> {
 const ids = new Set<string>(), cursors = new Set<string>()
 let cursor: string | undefined
 do {
  // Inspect all contact rows: a title filter's casing/whitespace semantics must
  // not let a duplicate address retain consent after another row withdraws.
  const data = await notion('/data_sources/' + config().database + '/query', 'POST', {
   page_size: 100, ...(cursor ? { start_cursor: cursor } : {}),
  })
  if (!Array.isArray(data.results)) throw new Error('Invalid subscription list')
  for (const page of data.results) {
   const pageId = normalizedId(page.id)
   if (pageId && member(page) && emailAddress(plain(page.properties?.Email?.title)) === email) ids.add(pageId)
  }
  cursor = nextCursor(data, cursors)
 } while (cursor)
 for (const contact of await newsletterContacts()) {
  if (contact.email === email) ids.add(contact.pageId)
 }
 return [...ids]
}

async function newsletterContacts(): Promise<MarketingRecipient[]> {
 const queue = normalizedId(process.env.NEWSLETTER_QUEUE_PAGE_ID)
 if (!queue) return []
 const root = await notion('/pages/' + queue)
 if (root.archived || root.in_trash || root.public_url || queue === config().database || queue === normalizedId(process.env.NOTION_NEWS_DATA_SOURCE_ID)) throw new Error('Invalid newsletter contacts scope')
 const contacts: MarketingRecipient[] = [], seen = new Set<string>()
 let cursor: string | undefined
 do {
  const data = await notion('/blocks/' + queue + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''))
  if (!Array.isArray(data.results)) throw new Error('Invalid newsletter contacts')
  for (const block of data.results) {
   const title = block.child_page?.title || ''
   if (block.type !== 'child_page' || !title.startsWith(CONTACT_TITLE)) continue
   const contact = manualContact({ parent: { page_id: queue }, properties: { title: { title: [{ text: { content: title } }] } } })
   const pageId = normalizedId(block.id)
   if (contact && pageId) contacts.push({ pageId, ...contact })
  }
  cursor = nextCursor(data, seen)
 } while (cursor)
 return contacts
}

// A separate newsletter contact supports unsubscribe without creating a launch
// preregistration. Re-entering an address never restores withdrawn consent.
export async function addNewsletterContact(value: string, locale: string): Promise<MarketingRecipient[] | null> {
 const email = emailAddress(value)
 if (!email || !LOCALES.has(locale)) return null
 const existing = await matchingEmailPageIds(email)
 if (existing.length) {
  const recipients: MarketingRecipient[] = []
  for (const pageId of existing) {
   const recipient = await getMarketingRecipient(pageId)
   if (!recipient || recipient.email !== email || recipient.locale !== locale) return null
   recipients.push(recipient)
  }
  return recipients
 }
 const parent = normalizedId(process.env.NEWSLETTER_QUEUE_PAGE_ID)
 if (!parent) throw new Error('Newsletter contacts storage unavailable')
 const page = await notion('/pages', 'POST', { parent: { page_id: parent },
  properties: { title: { title: [{ type: 'text', text: { content: CONTACT_TITLE + locale + ' · ' + email } }] } },
  children: [marketingSubscriptionBlock(true, false)],
 })
 const pageId = normalizedId(page.id)
 if (!pageId) throw new Error('Invalid newsletter contact')
 return [{ pageId, email, locale }]
}

export async function getNewsletterContact(pageId: string): Promise<MarketingRecipient | null> {
 const id = normalizedId(pageId)
 if (!id || !manualContact(await notion('/pages/' + id))) return null
 return getMarketingRecipient(id)
}
export async function unsubscribeMarketing(token: string) {
 const id = verify(token)
 if (!id) return false
 const record = await subscription(id)
 if (!record) return false
 // Commit the addressed contact first, even if duplicate lookup later fails.
 await persistWithdrawal(id, record)
 let failed = false
 try { await syncConsentColumn(id, record) } catch { failed = true }
 const email = manualContact(record.page)?.email || emailAddress(plain(record.page.properties?.Email?.title))
 if (email) {
  for (const duplicateId of await matchingEmailPageIds(email)) {
   if (duplicateId === id) continue
   try {
    const duplicate = await subscription(duplicateId)
    // Recheck after the query in case this row's address changed meanwhile.
    if (!duplicate || (manualContact(duplicate.page)?.email || emailAddress(plain(duplicate.page.properties?.Email?.title))) !== email) continue
    await persistWithdrawal(duplicateId, duplicate)
    await syncConsentColumn(duplicateId, duplicate)
   } catch { failed = true }
  }
 }
 if (failed) throw new Error('Subscription withdrawal synchronization failed')
 return true
}

// Launch/reward mail follows its separate pre-registration workflow.
export async function deliverMarketingEmail(pageId: string, locale: string, send: (unsubscribeUrl: string) => Promise<void>) {
 const recipient = await getMarketingRecipient(pageId)
 if (!recipient || recipient.locale !== locale) return { sent: false as const }
 await send(marketingUnsubscribeUrl(pageId, locale))
 return { sent: true as const }
}
