import 'server-only'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { newsletterId, newsletterSigningSecret, NEWSLETTER_MAX_RECIPIENTS } from './newsletter-config'
import { NEWSLETTER_LOCALES, type NewsletterDraft } from './newsletter-types'

export type ApprovedRecipient = { pageId: string; emailHash: string }
export type NewsletterApproval = {
  version: 1
  draft: NewsletterDraft
  recipients: ApprovedRecipient[]
  issuedAt: number
  expiresAt: number
}

export function newsletterEmailHash(email: string) { return createHash('sha256').update(email.trim().toLowerCase()).digest('hex') }
export function newsletterJobKey(draft: NewsletterDraft) { return newsletterId(draft.articleId) + ':' + draft.locale }
function mac(body: string) { return createHmac('sha256', newsletterSigningSecret()).update('ritty:newsletter-approval:v1:' + body).digest('base64url') }

export function approveNewsletter(draft: NewsletterDraft, recipients: ApprovedRecipient[], now = Date.now()) {
  if (!recipients.length || recipients.length > NEWSLETTER_MAX_RECIPIENTS) throw new Error('발송 대상은 1명부터 500명까지 준비할 수 있습니다.')
  const approval: NewsletterApproval = { version: 1, draft, recipients, issuedAt: now, expiresAt: now + 30 * 60_000 }
  const body = Buffer.from(JSON.stringify(approval)).toString('base64url')
  return { token: body + '.' + mac(body), expiresAt: new Date(approval.expiresAt).toISOString() }
}

export function verifyNewsletterApproval(token: string, options: { now?: number; approvedAt?: string } = {}): NewsletterApproval {
  if (typeof token !== 'string' || token.length > 180_000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('유효하지 않은 발송 승인입니다.')
  const [body, signature] = token.split('.')
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(mac(body)))) throw new Error('발송 승인 검증에 실패했습니다.')
  const approval = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as NewsletterApproval
  const reference = options.approvedAt ? Date.parse(options.approvedAt) : options.now ?? Date.now()
  if (approval.version !== 1 || !Number.isFinite(reference) || !Number.isFinite(approval.issuedAt) || !Number.isFinite(approval.expiresAt)
    || approval.expiresAt - approval.issuedAt !== 30 * 60_000 || reference < approval.issuedAt - 30_000 || reference > approval.expiresAt) {
    throw new Error('미리보기 승인이 만료되었습니다. 다시 미리보기를 만들어 주세요.')
  }
  if (!approval.draft || !NEWSLETTER_LOCALES.includes(approval.draft.locale) || !Array.isArray(approval.recipients)
    || !approval.recipients.length || approval.recipients.length > NEWSLETTER_MAX_RECIPIENTS) throw new Error('Invalid approved newsletter')
  newsletterId(approval.draft.articleId)
  for (const recipient of approval.recipients) {
    newsletterId(recipient.pageId)
    if (!/^[a-f0-9]{64}$/.test(recipient.emailHash)) throw new Error('Invalid approved recipient')
  }
  return approval
}
