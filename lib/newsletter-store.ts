import 'server-only'
import { newsletterId } from './newsletter-config'
import type { DeliveryRecord, NewsletterJob, NewsletterJobView } from './newsletter-types'

const JOB = 'ritty_newsletter_job_v1:'
const DELIVERY = 'ritty_newsletter_delivery_v1:'
const RETRY = 'ritty_newsletter_retry_v1:'
type NotionBlock = { id: string; type: string; child_page?: { title: string }; paragraph?: { rich_text: Array<{ plain_text?: string; text?: { content?: string } }> } }
type Stored<T> = { blockId: string; value: T }
export type JobDetails = { job: NewsletterJob; metadataBlock: string; deliveries: Stored<DeliveryRecord>[]; retries: Stored<{ requestedAt: string; handled: boolean }>[] }
let nextRequestAt = 0
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export async function newsletterNotion(path: string, method = 'GET', body?: unknown): Promise<any> {
  const token = process.env.NOTION_TOKEN
  if (!token) throw new Error('Notion newsletter storage is not configured')
  for (let attempt = 0; attempt < 3; attempt++) {
    const start = Math.max(Date.now(), nextRequestAt)
    nextRequestAt = start + 400
    if (start > Date.now()) await sleep(start - Date.now())
    const response = await fetch('https://api.notion.com/v1/' + path, {
      method, headers: { Authorization: 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(15_000),
    })
    // A rejected rate-limit request is safe to retry. Never retry ambiguous creates/appends.
    if (response.status === 429 && attempt < 2) { await sleep(Math.min(30, Math.max(1, Number(response.headers.get('retry-after')) || 1)) * 1000); continue }
    if (!response.ok) throw new Error('Newsletter storage request failed (' + response.status + ')')
    return response.json()
  }
  throw new Error('Newsletter storage is rate limited')
}

function richText(value: string) {
  const chunks: string[] = []
  const characters = Array.from(value)
  for (let offset = 0; offset < characters.length; offset += 1800) chunks.push(characters.slice(offset, offset + 1800).join(''))
  if (chunks.length > 100) throw new Error('Newsletter record is too large')
  return chunks.map(content => ({ type: 'text', text: { content } }))
}
function block(prefix: string, value: unknown) { return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(prefix + JSON.stringify(value)) } } }
function text(block: NotionBlock) { return (block.paragraph?.rich_text || []).map(item => item.plain_text ?? item.text?.content ?? '').join('') }
function read<T>(item: NotionBlock, prefix: string): T | null {
  const value = text(item)
  if (!value.startsWith(prefix)) return null
  return JSON.parse(value.slice(prefix.length)) as T
}

async function children(pageId: string) {
  const result: NotionBlock[] = []
  let cursor: string | undefined
  do {
    const page = await newsletterNotion('blocks/' + newsletterId(pageId) + '/children?page_size=100' + (cursor ? '&start_cursor=' + encodeURIComponent(cursor) : ''))
    result.push(...page.results)
    if (result.length > 20_000) throw new Error('Newsletter storage needs archival')
    cursor = page.has_more ? page.next_cursor : undefined
  } while (cursor)
  return result
}

export async function queuePage() {
  const id = newsletterId(process.env.NEWSLETTER_QUEUE_PAGE_ID || '')
  if ([process.env.NOTION_PRE_REGISTER_DB_ID, process.env.NOTION_NEWS_DATA_SOURCE_ID].some(value => value && newsletterId(value) === id)) {
    throw new Error('Use a separate private Notion page for newsletter records')
  }
  const page = await newsletterNotion('pages/' + id)
  if (page.archived || page.in_trash || page.public_url) throw new Error('Newsletter queue must be an active private Notion page')
  return id
}

export async function listNewsletterJobIds(key?: string) {
  const root = await queuePage()
  const pages = (await children(root)).filter(item => item.type === 'child_page')
  // A renamed record must never silently disappear from deduplication. This
  // page is reserved for campaigns, so unknown child pages stop the queue.
  if (pages.some(item => !item.child_page?.title.startsWith('Ritty newsletter · '))) {
    throw new Error('Newsletter queue contains a renamed or unrelated page; restore its original campaign title')
  }
  return pages.filter(item => (key
    ? item.child_page?.title === 'Ritty newsletter · ' + key
    : item.child_page?.title.startsWith('Ritty newsletter · '))).map(item => item.id)
}

export async function readNewsletterJob(id: string): Promise<JobDetails> {
  id = newsletterId(id)
  const parent = newsletterId(process.env.NEWSLETTER_QUEUE_PAGE_ID || '')
  const page = await newsletterNotion('pages/' + id)
  if (page.archived || page.in_trash || page.public_url || newsletterId(page.parent?.page_id || '') !== parent) throw new Error('Invalid newsletter job scope')
  const rows = await children(id)
  const meta = rows.map(item => ({ blockId: item.id, value: read<NewsletterJob>(item, JOB) })).filter(item => item.value !== null)
  if (meta.length !== 1) throw new Error('Newsletter campaign metadata is missing or duplicated')
  const job = { ...meta[0].value!, id }
  if (!['queued', 'sending', 'completed', 'attention', 'duplicate'].includes(job.status) || !job.draft || typeof job.approvalToken !== 'string') throw new Error('Invalid newsletter campaign state')
  const deliveries = rows.map(item => ({ blockId: item.id, value: read<DeliveryRecord>(item, DELIVERY) })).filter((item): item is Stored<DeliveryRecord> => item.value !== null)
  for (const item of deliveries) {
    if (!['pending', 'sending', 'submitted', 'failed', 'unknown', 'skipped'].includes(item.value.status) || typeof item.value.key !== 'string' || !Array.isArray(item.value.pageIds)) throw new Error('Invalid delivery record')
  }
  const retries = rows.map(item => ({ blockId: item.id, value: read<{ requestedAt: string; handled: boolean }>(item, RETRY) })).filter((item): item is Stored<{ requestedAt: string; handled: boolean }> => item.value !== null)
  return { job, metadataBlock: meta[0].blockId, deliveries, retries }
}

export async function createNewsletterJob(job: Omit<NewsletterJob, 'id'>): Promise<NewsletterJob> {
  const parent = await queuePage()
  const page = await newsletterNotion('pages', 'POST', { parent: { page_id: parent }, properties: { title: { title: richText('Ritty newsletter · ' + job.key) } }, children: [block(JOB, job)] })
  return { ...job, id: newsletterId(page.id) }
}

export async function saveNewsletterJob(metadataBlock: string, job: NewsletterJob) {
  await newsletterNotion('blocks/' + newsletterId(metadataBlock), 'PATCH', { paragraph: block(JOB, job).paragraph })
}

export async function appendNewsletterDeliveries(jobId: string, records: DeliveryRecord[]) {
  for (let index = 0; index < records.length; index += 50) {
    await newsletterNotion('blocks/' + newsletterId(jobId) + '/children', 'PATCH', { children: records.slice(index, index + 50).map(row => block(DELIVERY, row)) })
  }
}

export async function saveNewsletterDelivery(blockId: string, value: DeliveryRecord) {
  await newsletterNotion('blocks/' + newsletterId(blockId), 'PATCH', { paragraph: block(DELIVERY, value).paragraph })
}

export async function requestNewsletterRetry(jobId: string) {
  await newsletterNotion('blocks/' + newsletterId(jobId) + '/children', 'PATCH', { children: [block(RETRY, { requestedAt: new Date().toISOString(), handled: false })] })
}

export async function finishNewsletterRetry(command: JobDetails['retries'][number]) {
  await newsletterNotion('blocks/' + newsletterId(command.blockId), 'PATCH', { paragraph: block(RETRY, { ...command.value, handled: true }).paragraph })
}

export function newsletterJobView(details: JobDetails): NewsletterJobView {
  const counts = { pending: 0, sending: 0, submitted: 0, failed: 0, unknown: 0, skipped: 0 }
  for (const { value } of details.deliveries) counts[value.status]++
  return { ...details.job, approvalToken: '', counts, total: details.deliveries.length,
    failures: details.deliveries.filter(item => ['failed', 'unknown'].includes(item.value.status)).map(({ value }) => ({ email: value.email, status: value.status, error: value.error, retryable: value.retryable })) }
}
