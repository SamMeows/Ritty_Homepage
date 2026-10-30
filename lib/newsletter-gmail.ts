import 'server-only'
import { createHash } from 'node:crypto'
import type { NewsletterDraft } from './newsletter-types'
import { renderNewsletterEmail } from './newsletter-email'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'
const REQUIRED = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'NEWSLETTER_FROM_EMAIL'] as const
const REQUEST_TIMEOUT_MS = 30_000

export class GmailSendError extends Error {
  readonly kind: 'rejected' | 'unknown'
  // Safe to retry only after an administrator explicitly resumes the campaign.
  // This includes credential/permission repairs; it never triggers an HTTP retry.
  readonly retryable: boolean
  readonly code: string
  constructor(message: string, options: { kind: 'rejected' | 'unknown'; retryable?: boolean; code: string }) {
    super(message)
    this.name = 'GmailSendError'
    this.kind = options.kind
    this.retryable = options.retryable ?? false
    this.code = options.code
  }
}

function mailbox(value: string): string {
  if (/[\u0000-\u0020\u007f]/.test(value) || value.length > 254) throw new Error('Invalid mailbox')
  const match = value.match(/^([A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+)@([A-Za-z0-9.-]+)$/)
  if (!match || match[1].length > 64 || match[1].startsWith('.') || match[1].endsWith('.') || match[1].includes('..')) throw new Error('Invalid mailbox')
  const labels = match[2].split('.')
  if (labels.length < 2 || labels.some(label => !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) throw new Error('Invalid mailbox')
  return value.toLowerCase()
}

export function preflightFrom(): string {
  try { return mailbox(process.env.NEWSLETTER_FROM_EMAIL || '') } catch {
    throw new GmailSendError('발신 이메일 설정을 확인해 주세요.', { kind: 'rejected', retryable: true, code: 'invalid_sender' })
  }
}

export function gmailConfigurationMissing(): string[] {
  const missing: string[] = REQUIRED.filter(key => !process.env[key]?.trim())
  if (!missing.includes('NEWSLETTER_FROM_EMAIL')) {
    try { preflightFrom() } catch { missing.push('NEWSLETTER_FROM_EMAIL') }
  }
  return missing
}

type CachedAccess = { credentialHash: string; token: string; expiresAt: number }
let cachedAccess: CachedAccess | undefined

async function jsonResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}
  } catch { return {} }
}

async function accessToken(from: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || ''
  const credentialHash = createHash('sha256').update(JSON.stringify([clientId, clientSecret, refreshToken, from])).digest('hex')
  if (cachedAccess?.credentialHash === credentialHash && cachedAccess.expiresAt > Date.now() + 60_000) return cachedAccess.token
  let response: Response
  try {
    response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new GmailSendError('Google 인증 서버에 연결하지 못했습니다. 아직 이메일은 보내지 않았습니다.', { kind: 'rejected', retryable: true, code: 'token_unavailable' })
  }
  const body = await jsonResponse(response)
  if (!response.ok || typeof body.access_token !== 'string' || !body.access_token || /[\r\n]/.test(body.access_token)) {
    throw new GmailSendError('Gmail 발송 계정 연결을 확인해 주세요.', {
      kind: 'rejected', retryable: true,
      code: response.ok ? 'token_invalid_response' : `token_http_${response.status}`,
    })
  }
  let identityResponse: Response
  try {
    identityResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${body.access_token}` }, cache: 'no-store', redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new GmailSendError('Google 발신 계정을 확인하지 못했습니다. 아직 이메일은 보내지 않았습니다.', { kind: 'rejected', retryable: true, code: 'identity_unavailable' })
  }
  const identity = await jsonResponse(identityResponse)
  if (!identityResponse.ok) {
    throw new GmailSendError('Gmail 연결에 이메일 확인 권한이 필요합니다. 연결 도우미로 다시 연결해 주세요.', {
      kind: 'rejected', retryable: true, code: 'identity_unavailable',
    })
  }
  if (identity.email_verified !== true || typeof identity.email !== 'string' || identity.email.toLowerCase() !== from) {
    throw new GmailSendError('연결한 Google 계정과 설정한 발신 주소가 일치하지 않습니다.', { kind: 'rejected', retryable: true, code: 'sender_mismatch' })
  }
  const expiresIn = typeof body.expires_in === 'number' && Number.isFinite(body.expires_in) ? Math.max(0, Math.min(body.expires_in, 3600)) : 300
  cachedAccess = { credentialHash, token: body.access_token, expiresAt: Date.now() + expiresIn * 1000 }
  return body.access_token
}

function encodedSubject(value: string): string {
  if (!value.trim() || /[\u0000-\u001f\u007f]/.test(value) || value.length > 500) throw new Error('Invalid subject')
  const chunks: string[] = []
  let chunk = ''
  for (const character of value) {
    if (Buffer.byteLength(chunk + character, 'utf8') > 42) { chunks.push(chunk); chunk = '' }
    chunk += character
  }
  if (chunk) chunks.push(chunk)
  return chunks.map(part => `=?UTF-8?B?${Buffer.from(part, 'utf8').toString('base64')}?=`).join('\r\n ')
}

function base64Lines(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || ''
}

export async function sendNewsletterEmail(input: {
  draft: NewsletterDraft; email: string; unsubscribeUrl: string; oneClickUrl: string; jobKey: string
}): Promise<{ messageId: string }> {
  if (gmailConfigurationMissing().length) throw new GmailSendError('Gmail 발송 설정이 완료되지 않았습니다.', { kind: 'rejected', retryable: true, code: 'not_configured' })
  const from = preflightFrom()
  let raw: string
  try {
    const email = mailbox(input.email)
    if (!input.jobKey || input.jobKey.length > 500) throw new Error('Invalid job key')
    const unsubscribe = new URL(input.oneClickUrl)
    if (unsubscribe.protocol !== 'https:' || unsubscribe.username || unsubscribe.password || unsubscribe.hash || /[\u0000-\u0020\u007f<>]/.test(input.oneClickUrl)) throw new Error('Invalid one-click URL')
    const messageKey = createHash('sha256').update(`${input.jobKey}\0${email}`).digest('hex')
    const boundary = `ritty_newsletter_${messageKey.slice(0, 32)}`
    const rendered = renderNewsletterEmail(input.draft, {
      unsubscribeUrl: input.unsubscribeUrl,
      companyName: process.env.NEWSLETTER_COMPANY_NAME,
      contactEmail: process.env.NEWSLETTER_CONTACT_EMAIL || from,
      companyAddress: process.env.NEWSLETTER_COMPANY_ADDRESS,
    })
    const mime = [
      `From: Ritty <${from}>`, `To: <${email}>`, `Subject: ${encodedSubject(input.draft.subject)}`,
      `Date: ${new Date().toUTCString()}`, `Message-ID: <${messageKey}@${from.split('@')[1]}>`,
      'MIME-Version: 1.0', `List-Unsubscribe: <${unsubscribe.href}>`,
      'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
      `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
      `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64Lines(rendered.text), '',
      `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64Lines(rendered.html), '',
      `--${boundary}--`, '',
    ].join('\r\n')
    raw = Buffer.from(mime, 'utf8').toString('base64url')
  } catch {
    throw new GmailSendError('수신 주소 또는 메일 내용을 확인해 주세요.', { kind: 'rejected', code: 'invalid_message' })
  }
  const token = await accessToken(from)
  let response: Response
  try {
    // Do not retry this POST: Gmail does not expose an idempotency key.
    response = await fetch(SEND_ENDPOINT, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new GmailSendError('발송 결과를 확인할 수 없습니다. 보낸편지함 확인 전에는 재발송하지 마세요.', { kind: 'unknown', code: 'send_network_unknown' })
  }
  const body = await jsonResponse(response)
  if (response.ok && typeof body.id === 'string' && body.id.length > 0 && body.id.length < 256) return { messageId: body.id }
  if (response.status >= 500 || response.status === 408 || response.ok || response.status < 400) {
    throw new GmailSendError('Gmail 발송 결과가 불명확합니다. 보낸편지함 확인이 필요합니다.', { kind: 'unknown', code: `send_http_${response.status}_unknown` })
  }
  const error = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : {}
  const errors = Array.isArray(error.errors) ? error.errors : []
  const quotaReasons = new Set(['ratelimitexceeded', 'userratelimitexceeded', 'dailylimitexceeded', 'quotaexceeded'])
  const quota = response.status === 429 || (response.status === 403 && errors.some(item => {
    return item && typeof item === 'object' && typeof item.reason === 'string' && quotaReasons.has(item.reason.toLowerCase())
  }))
  const credentials = response.status === 401 || response.status === 403
  if (credentials) cachedAccess = undefined
  throw new GmailSendError(quota ? 'Google 발송 한도에 도달했습니다. 발송을 보류합니다.' : 'Gmail이 발송 요청을 거절했습니다. 설정과 주소를 확인해 주세요.', {
    kind: 'rejected', retryable: quota || credentials, code: quota ? 'send_quota' : `send_http_${response.status}`,
  })
}
