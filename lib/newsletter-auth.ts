import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

const SESSION_SECONDS = 8 * 60 * 60
const OAUTH_SECONDS = 10 * 60
const ADMIN_PATH = '/admin/newsletter'
const CALLBACK_PATH = '/api/admin/newsletter/auth/callback'
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', Vary: 'Cookie' }

export class NewsletterAuthError extends Error {
  constructor(public status: 401 | 403 | 503, public code: string) { super(code) }
}

export function newsletterAuthConfigurationMissing(): string[] {
  const missing = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'NEWSLETTER_ADMIN_EMAILS'].filter(name => !process.env[name]?.trim())
  if ((process.env.NEWSLETTER_SESSION_SECRET || '').length < 32) missing.push('NEWSLETTER_SESSION_SECRET (32+ characters)')
  return missing
}

function assertConfigured() {
  if (newsletterAuthConfigurationMissing().length) throw new NewsletterAuthError(503, 'auth_not_configured')
}

function origin() {
  // Local admin authentication can use localhost while public email links remain HTTPS.
  const url = new URL(process.env.NEWSLETTER_AUTH_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || 'https://ritty.sam-meows.com')
  const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password) throw new NewsletterAuthError(503, 'auth_not_configured')
  return url.origin
}

function cookieName(kind: 'session' | 'oauth') {
  return (process.env.NODE_ENV === 'production' ? '__Host-' : '') + 'ritty-newsletter-' + kind
}

function cookie(kind: 'session' | 'oauth', value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === 'production' || origin().startsWith('https:')
  return `${cookieName(kind)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}

function requestCookie(request: Request, kind: 'session' | 'oauth') {
  const matches = (request.headers.get('cookie') || '').split(';').map(part => part.trim()).filter(part => part.startsWith(cookieName(kind) + '='))
  if (matches.length !== 1) return ''
  return matches[0].slice(cookieName(kind).length + 1)
}

// Auth cookies contain identity/expiry or short-lived PKCE state, never Google tokens.
function seal(value: unknown, purpose: string) {
  assertConfigured()
  const key = createHash('sha256').update(process.env.NEWSLETTER_SESSION_SECRET!).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from('ritty-newsletter:' + purpose))
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')
}

function unseal(value: string, purpose: string): Record<string, unknown> | null {
  if (!/^[A-Za-z0-9_-]{40,4000}$/.test(value)) return null
  try {
    assertConfigured()
    const data = Buffer.from(value, 'base64url')
    const key = createHash('sha256').update(process.env.NEWSLETTER_SESSION_SECRET!).digest()
    const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12))
    decipher.setAAD(Buffer.from('ritty-newsletter:' + purpose))
    decipher.setAuthTag(data.subarray(12, 28))
    const parsed = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8'))
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch { return null }
}

function emailAllowed(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[^\s<>@\x00-\x1f\x7f]+@[^\s<>@\x00-\x1f\x7f]+\.[^\s<>@\x00-\x1f\x7f]+$/.test(value)) return false
  const allowed = (process.env.NEWSLETTER_ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(value.toLowerCase())
}

function validTime(payload: Record<string, unknown>, maxSeconds: number) {
  const now = Math.floor(Date.now() / 1000)
  return typeof payload.iat === 'number' && typeof payload.exp === 'number' && Number.isInteger(payload.iat) && Number.isInteger(payload.exp)
    && payload.iat <= now + 30 && payload.exp > now && payload.exp > payload.iat && payload.exp - payload.iat <= maxSeconds
}

function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== origin() || request.headers.get('sec-fetch-site') === 'cross-site') throw new NewsletterAuthError(403, 'invalid_origin')
}

export async function requireNewsletterAdmin(request: Request, mutation = false): Promise<{ email: string }> {
  assertConfigured()
  if (mutation) sameOrigin(request)
  const payload = unseal(requestCookie(request, 'session'), 'session')
  if (!payload || payload.v !== 1 || !validTime(payload, SESSION_SECONDS) || typeof payload.sub !== 'string') throw new NewsletterAuthError(401, 'unauthorized')
  // Check the current allowlist, so removing an administrator also revokes existing sessions.
  if (!emailAllowed(payload.email)) throw new NewsletterAuthError(403, 'forbidden')
  return { email: payload.email.toLowerCase() }
}

export function newsletterAuthResponse(error: unknown): Response | null {
  return error instanceof NewsletterAuthError ? Response.json({ error: error.code }, { status: error.status, headers: PRIVATE_HEADERS }) : null
}

export function newsletterLoginResponse(): Response {
  assertConfigured()
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: origin() + CALLBACK_PATH,
    response_type: 'code', scope: 'openid email', state, prompt: 'select_account',
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  }).toString()
  return new Response(null, { status: 303, headers: { ...PRIVATE_HEADERS, Location: url.toString(), 'Set-Cookie': cookie('oauth', seal({ state, verifier, iat, exp: iat + OAUTH_SECONDS }, 'oauth'), OAUTH_SECONDS) } })
}

function callbackResponse(error?: string, session?: string): Response {
  const url = new URL(ADMIN_PATH, origin())
  if (error) url.searchParams.set('auth_error', error)
  const headers = new Headers({ ...PRIVATE_HEADERS, Location: url.toString() })
  headers.append('Set-Cookie', cookie('oauth', '', 0))
  if (session) headers.append('Set-Cookie', cookie('session', session, SESSION_SECONDS))
  return new Response(null, { status: 303, headers })
}

export async function newsletterCallbackResponse(request: Request): Promise<Response> {
  assertConfigured()
  const query = new URL(request.url).searchParams
  const saved = unseal(requestCookie(request, 'oauth'), 'oauth')
  const state = query.get('state') || ''
  if (!saved || !validTime(saved, OAUTH_SECONDS) || typeof saved.state !== 'string' || typeof saved.verifier !== 'string'
    || !/^[A-Za-z0-9_-]{43}$/.test(state) || state.length !== saved.state.length
    || !timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))) return callbackResponse('expired')
  if (query.has('error')) return callbackResponse('cancelled')
  const code = query.get('code')
  if (!code || code.length > 2048) return callbackResponse('failed')
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: origin() + CALLBACK_PATH, grant_type: 'authorization_code', code_verifier: saved.verifier }),
      cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    })
    if (!response.ok) return callbackResponse('failed')
    const grant = await response.json()
    if (typeof grant.access_token !== 'string' || !grant.access_token || /[\r\n]/.test(grant.access_token)) return callbackResponse('failed')
    // Identity comes only from Google's fixed endpoint with the token obtained by this confidential
    // code+PKCE exchange. Browser-supplied email, access tokens and decoded JWT claims are never trusted.
    const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: 'Bearer ' + grant.access_token }, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'error',
    })
    if (!profileResponse.ok) return callbackResponse('failed')
    const profile = await profileResponse.json()
    if (profile.email_verified !== true || !emailAllowed(profile.email) || typeof profile.sub !== 'string' || !profile.sub || profile.sub.length > 255) return callbackResponse('forbidden')
    const iat = Math.floor(Date.now() / 1000)
    return callbackResponse(undefined, seal({ v: 1, email: profile.email.toLowerCase(), sub: profile.sub, iat, exp: iat + SESSION_SECONDS }, 'session'))
  } catch { return callbackResponse('failed') }
}

export function newsletterLogoutResponse(request: Request): Response {
  sameOrigin(request)
  const headers = new Headers(PRIVATE_HEADERS)
  headers.append('Set-Cookie', cookie('session', '', 0))
  headers.append('Set-Cookie', cookie('oauth', '', 0))
  return Response.json({ authenticated: false }, { headers })
}
