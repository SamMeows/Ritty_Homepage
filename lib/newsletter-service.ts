import 'server-only'
import { getNews, getNewsArticle, type NewsItem } from './news'
import { newsArticlePath, newsLanguage } from './news-languages'
import { addNewsletterContact, getNewsletterContact, listMarketingCandidates, type MarketingRecipient } from './marketing-subscription'
import { approveNewsletter, newsletterEmailHash, newsletterJobKey, verifyNewsletterApproval } from './newsletter-approval'
import { newsletterAuthResponse } from './newsletter-auth'
import { newsletterConfiguration, newsletterId, newsletterOrigin, NEWSLETTER_MAX_RECIPIENTS, NEWSLETTER_WORKFLOW } from './newsletter-config'
import { renderNewsletterEmail } from './newsletter-email'
import { newsletterContent, newsletterImagePath } from './newsletter-content'
import { NEWSLETTER_BRAND } from './newsletter-brand'
import { createNewsletterJob, listNewsletterJobIds, newsletterJobView, readNewsletterJob, requestNewsletterRetry, type JobDetails } from './newsletter-store'
import { NEWSLETTER_LOCALES, type NewsletterDraft, type NewsletterLocale, type NewsletterPreview, type NewsletterRecipient } from './newsletter-types'

const CATEGORY = '개발 소식'
const HISTORY_LIMIT = 10
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Pragma: 'no-cache', Vary: 'Cookie', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }

export class NewsletterServiceError extends Error {
  constructor(public status: number, public code: string) { super(code) }
}

export function newsletterResponse(value: unknown, status = 200) {
  return Response.json(value, { status, headers: PRIVATE_HEADERS })
}

export function newsletterErrorResponse(error: unknown) {
  return newsletterAuthResponse(error) || (error instanceof NewsletterServiceError
    ? newsletterResponse({ error: error.code }, error.status)
    : newsletterResponse({ error: 'request_failed' }, 500))
}

// The approval may contain up to 500 page IDs and hashes. Bound the actual stream,
// including requests without Content-Length, before parsing any JSON.
export async function readNewsletterJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new NewsletterServiceError(415, 'invalid_content_type')
  }
  const limit = 200_000
  if (Number(request.headers.get('content-length')) > limit) throw new NewsletterServiceError(413, 'request_too_large')
  const reader = request.body?.getReader()
  if (!reader) throw new NewsletterServiceError(400, 'invalid_request')
  const parts: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) { await reader.cancel(); throw new NewsletterServiceError(413, 'request_too_large') }
      parts.push(value)
    }
  } finally { reader.releaseLock() }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(parts)))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object required')
    return value as Record<string, unknown>
  } catch { throw new NewsletterServiceError(400, 'invalid_request') }
}

export function newsletterLocale(value: unknown = 'kr'): NewsletterLocale {
  if (typeof value !== 'string' || !NEWSLETTER_LOCALES.includes(value as NewsletterLocale)) throw new NewsletterServiceError(400, 'invalid_locale')
  return value as NewsletterLocale
}

function id(value: unknown) {
  if (typeof value !== 'string') throw new NewsletterServiceError(400, 'invalid_id')
  try { return newsletterId(value) } catch { throw new NewsletterServiceError(400, 'invalid_id') }
}

function fields(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new NewsletterServiceError(400, 'invalid_request')
}

function boundedText(value: unknown, max: number, multiline = false) {
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.length > max || (multiline ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/ : /[\u0000-\u001f\u007f]/).test(value)) {
    throw new NewsletterServiceError(400, 'invalid_text')
  }
  return value.replace(/\r\n?/g, '\n').trim() || undefined
}

function truncate(value: string, maxLength: number) {
  let result = ''
  for (const character of value) {
    if (result.length + character.length > maxLength) break
    result += character
  }
  return result
}

function plainTitle(value: string) {
  return truncate(value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(), 500)
}

function subject(value: string) {
  const prefix = '[리티 개발로그] '
  const title = value.trim().replace(/^(?:(?:\(광고\)|\[광고\]|\[리티 개발로그\])\s*)+/, '').trim()
  if (!title) throw new NewsletterServiceError(400, 'invalid_text')
  return prefix + truncate(title, 200 - prefix.length)
}

// A temporary Notion/S3 signature will usually expire before a newsletter is read.
// No server fetch is made to the supplied URL; it is only used as an escaped image source.
export function persistentNewsletterCover(value: string): string | undefined {
  try {
    if (!value || value.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(value)) return undefined
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return undefined
    const notionHosts = ['notion.so', 'notion.site', 'notion.com', 'notionstatic.com', 'notion-static.com', 'notionusercontent.com']
    if (notionHosts.some(domain => host === domain || host.endsWith('.' + domain)) || host.startsWith('prod-files-secure.')
      || /\/(?:secure\.notion-static\.com|prod-files-secure)\//i.test(url.pathname)) return undefined
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') || host.startsWith('[')
      || /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host)) return undefined
    for (const name of url.searchParams.keys()) {
      if (/^(?:x-amz-|x-goog-)/i.test(name) || /^(?:signature|sig|token|access_token|expires|expiry|expiration|policy|key-pair-id|awsaccesskeyid|se|sv|st|sp|sr|skoid|sktid|skt|ske|sks|skv)$/i.test(name)) return undefined
    }
    return url.href
  } catch { return undefined }
}

async function publishedArticle(articleId: string, locale: NewsletterLocale) {
  const article = await getNewsArticle(articleId, locale)
  if (!article || article.category !== CATEGORY || (article.language || 'KO') !== newsLanguage(locale) || id(article.id) !== articleId) {
    throw new NewsletterServiceError(404, 'article_not_available')
  }
  if (!article.modifiedAt || !Number.isFinite(Date.parse(article.modifiedAt))) throw new NewsletterServiceError(409, 'article_revision_unavailable')
  return article
}

export async function listNewsletterArticles(locale: NewsletterLocale): Promise<NewsItem[]> {
  const items: NewsItem[] = [], seen = new Set<string>(), cursors = new Set<string>()
  let cursor: string | undefined
  // Up to 100 recent source entries supplies an archive without unbounded API work.
  for (let page = 0; page < 5; page++) {
    const result = await getNews(cursor, locale)
    if (result.unavailable) throw new NewsletterServiceError(503, 'articles_unavailable')
    for (const item of result.items) {
      if (item.category === CATEGORY && (item.language || 'KO') === newsLanguage(locale) && !seen.has(item.id)) {
        seen.add(item.id)
        items.push({ ...item, cover: item.cover ? persistentNewsletterCover(item.cover) : undefined })
      }
    }
    if (!result.cursor) break
    if (cursors.has(result.cursor)) throw new NewsletterServiceError(503, 'articles_unavailable')
    cursors.add(result.cursor); cursor = result.cursor
  }
  return items
}

export async function listNewsletterJobs() {
  if (!process.env.NOTION_TOKEN || !process.env.NEWSLETTER_QUEUE_PAGE_ID) return []
  const ids = (await listNewsletterJobIds()).slice(-HISTORY_LIMIT).reverse()
  const jobs = []
  // Storage throttles API requests; keep reads sequential instead of bursting Notion.
  for (const jobId of ids) jobs.push(newsletterJobView(await readNewsletterJob(jobId)))
  return jobs
}

export async function getNewsletterOverview(locale: NewsletterLocale) {
  const configuration = newsletterConfiguration()
  const [articles, jobs, candidates] = await Promise.all([listNewsletterArticles(locale), listNewsletterJobs(), listMarketingCandidates(locale)])
  return { configuration, articles, jobs, recipients: groupedRecipients(candidates.filter(row => row.locale === locale), 'notion') }
}

function groupedRecipients(candidates: MarketingRecipient[], source: NewsletterRecipient['source']): NewsletterRecipient[] {
  const result = new Map<string, NewsletterRecipient>()
  for (const candidate of candidates) {
    const email = candidate.email.trim().toLowerCase()
    const row = result.get(email) || { email, pageIds: [], source }
    const pageId = id(candidate.pageId)
    if (!row.pageIds.includes(pageId)) row.pageIds.push(pageId)
    result.set(email, row)
  }
  return [...result.values()].sort((a, b) => a.email.localeCompare(b.email))
}

export async function addNewsletterRecipient(input: Record<string, unknown>) {
  fields(input, ['email', 'locale'])
  const locale = newsletterLocale(input.locale)
  if (typeof input.email !== 'string' || input.email.length > 254 || /[\u0000-\u0020\u007f]/.test(input.email)
    || !/^[^@]+@[^@]+\.[^@]+$/.test(input.email)) throw new NewsletterServiceError(400, 'invalid_email')
  const contacts = await addNewsletterContact(input.email, locale)
  if (!contacts?.length) throw new NewsletterServiceError(409, 'recipient_unavailable')
  return { recipient: groupedRecipients(contacts, 'manual')[0] }
}

export async function getNewsletterJob(value: unknown) {
  return newsletterJobView(await readNewsletterJob(id(value)))
}

export async function previewNewsletter(input: Record<string, unknown>): Promise<NewsletterPreview> {
  fields(input, ['articleId', 'locale', 'subject', 'summary', 'coverUrl', 'recipientIds'])
  const articleId = id(input.articleId), locale = newsletterLocale(input.locale)
  const customSubject = boundedText(input.subject, 200)
  const customSummary = boundedText(input.summary, 4000, true)
  const customCover = boundedText(input.coverUrl, 2048)
  const cover = customCover ? persistentNewsletterCover(customCover) : undefined
  if (customCover && !cover) throw new NewsletterServiceError(400, 'invalid_cover_url')
  const article = await publishedArticle(articleId, locale)
  const draft: NewsletterDraft = {
    articleId, locale, title: plainTitle(article.title), subject: subject(customSubject || plainTitle(article.title)),
    summary: customSummary || '',
    blocks: newsletterContent(article.blocks || [], articleId, locale, newsletterOrigin()),
    articleUrl: new URL(newsArticlePath(newsLanguage(locale), articleId), newsletterOrigin()).href,
    coverUrl: cover || (article.cover ? new URL(newsletterImagePath(articleId, locale, 'cover'), newsletterOrigin()).href : undefined), articleModifiedAt: article.modifiedAt,
  }
  const candidates = await listMarketingCandidates(locale)
  let selected = candidates.filter(candidate => candidate.locale === locale)
  if (input.recipientIds !== undefined) {
    if (!Array.isArray(input.recipientIds) || input.recipientIds.length > NEWSLETTER_MAX_RECIPIENTS) throw new NewsletterServiceError(400, 'invalid_recipients')
    const selectedIds = new Set(input.recipientIds.map(id))
    const available = new Map<string, MarketingRecipient>()
    for (const candidate of selected) {
      const pageId = id(candidate.pageId), previous = available.get(pageId)
      if (previous && newsletterEmailHash(previous.email) !== newsletterEmailHash(candidate.email)) throw new NewsletterServiceError(409, 'recipients_changed')
      available.set(pageId, candidate)
    }
    for (const pageId of selectedIds) {
      if (available.has(pageId)) continue
      const contact = await getNewsletterContact(pageId)
      if (!contact || contact.locale !== locale) throw new NewsletterServiceError(409, 'recipient_unavailable')
      available.set(pageId, contact)
    }
    // Keep every duplicate registration for selected email addresses so a
    // withdrawal on an unchecked duplicate cannot be bypassed by its sibling.
    const selectedEmails = new Set([...selectedIds].map(pageId => available.get(pageId)!.email.trim().toLowerCase()))
    selected = [...available.values()].filter(candidate => selectedEmails.has(candidate.email.trim().toLowerCase()))
  }
  const uniquePages = new Map<string, { pageId: string; emailHash: string }>()
  const emails = new Set<string>()
  for (const candidate of selected) {
    if (candidate.locale !== locale) continue
    const pageId = id(candidate.pageId), emailHash = newsletterEmailHash(candidate.email)
    const previous = uniquePages.get(pageId)
    if (previous && previous.emailHash !== emailHash) throw new NewsletterServiceError(409, 'recipients_changed')
    uniquePages.set(pageId, { pageId, emailHash }); emails.add(emailHash)
  }
  if (!uniquePages.size) throw new NewsletterServiceError(409, 'no_recipients')
  if (uniquePages.size > NEWSLETTER_MAX_RECIPIENTS) throw new NewsletterServiceError(409, 'too_many_recipients')
  // Candidate estimates intentionally exclude addresses from the browser response.
  // The worker reconciles duplicate records and rechecks authoritative withdrawals.
  const approval = approveNewsletter(draft, [...uniquePages.values()])
  // Preserve the entire article. Reject oversized campaigns instead of truncating
  // content or creating an approval the send endpoint cannot verify/store.
  const draftBytes = Buffer.byteLength(JSON.stringify(draft), 'utf8')
  if (approval.token.length + draftBytes > 160_000 || draftBytes > 50_000) {
    throw new NewsletterServiceError(413, 'content_too_large')
  }
  const rendered = renderNewsletterEmail(draft, {
    unsubscribeUrl: new URL('/unsubscribe?lang=' + locale, newsletterOrigin()).href,
    companyName: process.env.NEWSLETTER_COMPANY_NAME, contactEmail: NEWSLETTER_BRAND.contact,
    companyAddress: NEWSLETTER_BRAND.address,
  })
  if (Buffer.byteLength(rendered.html, 'utf8') > 95_000) throw new NewsletterServiceError(413, 'content_too_large')
  return { draft, html: rendered.html, candidateCount: emails.size, approvalToken: approval.token, expiresAt: approval.expiresAt }
}

function requireSendingEnabled() {
  const configuration = newsletterConfiguration()
  if (!configuration.enabled) throw new NewsletterServiceError(503, 'newsletter_disabled')
  if (!configuration.ready) throw new NewsletterServiceError(503, 'newsletter_not_configured')
}

async function dispatchNewsletterWorker() {
  const repository = process.env.NEWSLETTER_GITHUB_REPOSITORY || 'SamMeows/Ritty_Homepage'
  const ref = process.env.NEWSLETTER_GITHUB_REF || 'master'
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !ref || ref.length > 255 || /[\u0000-\u001f\u007f]/.test(ref)) return false
  try {
    // The workflow drains the private queue. No recipient, draft or approval is
    // transmitted to GitHub in a dispatch payload or written to workflow inputs.
    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/${NEWSLETTER_WORKFLOW}/dispatches`, {
      method: 'POST', headers: { Authorization: 'Bearer ' + process.env.NEWSLETTER_GITHUB_TOKEN,
        Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    })
    return response.status === 204
  } catch { return false }
}

async function existingJob(key: string): Promise<JobDetails | undefined> {
  const matches: JobDetails[] = []
  for (const jobId of await listNewsletterJobIds(key)) {
    const details = await readNewsletterJob(jobId)
    if (details.job.key === key) matches.push(details)
  }
  const withLedger = matches.filter(details => details.deliveries.length > 0)
  if (withLedger.length > 1) throw new NewsletterServiceError(409, 'campaign_needs_review')
  return withLedger[0] || matches[0]
}

export async function sendApprovedNewsletter(input: Record<string, unknown>, approvedBy: string) {
  fields(input, ['approvalToken'])
  requireSendingEnabled()
  const acceptedAt = Date.now()
  let approval
  try { approval = verifyNewsletterApproval(input.approvalToken as string, { now: acceptedAt }) }
  catch { throw new NewsletterServiceError(409, 'invalid_approval') }
  const article = await publishedArticle(id(approval.draft.articleId), approval.draft.locale)
  if (article.modifiedAt !== approval.draft.articleModifiedAt || plainTitle(article.title) !== approval.draft.title) {
    throw new NewsletterServiceError(409, 'article_changed')
  }
  const key = newsletterJobKey(approval.draft)
  const existing = await existingJob(key)
  if (existing) {
    const dispatched = existing.job.status === 'queued' ? await dispatchNewsletterWorker() : false
    return { job: newsletterJobView(existing), dispatched, reused: true }
  }
  const now = new Date().toISOString()
  const job = await createNewsletterJob({ key, draft: approval.draft, approvalToken: input.approvalToken as string,
    approvedAt: new Date(acceptedAt).toISOString(), approvedBy, createdAt: now, updatedAt: now, status: 'queued', prepared: false })
  // Notion has no uniqueness constraint. The single worker resolves concurrent
  // creates by the stable key before preparing any deliveries.
  const view = newsletterJobView({ job, metadataBlock: '', deliveries: [], retries: [] })
  return { job: view, dispatched: await dispatchNewsletterWorker(), reused: false }
}

export async function retryNewsletterJob(input: Record<string, unknown>) {
  fields(input, ['id'])
  requireSendingEnabled()
  const details = await readNewsletterJob(id(input.id))
  const canResume = !details.job.prepared || details.deliveries.some(({ value }) => value.status === 'pending' || (value.status === 'failed' && value.retryable === true))
  if (details.job.status !== 'attention' || !canResume) throw new NewsletterServiceError(409, 'nothing_retryable')
  // A command is durable, but the web request never resets a delivery. The worker
  // consumes this command and leaves all unknown/submitted recipients untouched.
  if (!details.retries.some(({ value }) => !value.handled)) await requestNewsletterRetry(details.job.id)
  return { job: newsletterJobView(details), dispatched: await dispatchNewsletterWorker() }
}
