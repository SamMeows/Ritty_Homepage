// Offline security regressions: all Google requests are intercepted; no mail is sent.
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { load } = require('./load-typescript.cjs')
const auth = load('lib/newsletter-auth.ts')
const originalEnv = { ...process.env }, originalFetch = global.fetch, originalNow = Date.now
const SITE = 'https://newsletter.example.test'
const ADMIN = 'editor@example.test'
const CALLBACK = SITE + '/api/admin/newsletter/auth/callback'
let now = originalNow(), fetchCalls = [], profile = { sub: 'google-subject-123', email: ADMIN, email_verified: true }, tokenFailure = false

process.env.GOOGLE_CLIENT_ID = 'offline-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'offline-client-secret'
process.env.NEWSLETTER_SESSION_SECRET = 'offline-test-only-secret-32-characters-or-more'
process.env.NEWSLETTER_ADMIN_EMAILS = ADMIN + ', other@example.test'
process.env.NEXT_PUBLIC_SITE_URL = SITE
delete process.env.NEWSLETTER_AUTH_ORIGIN
process.env.NODE_ENV = 'production'
Date.now = () => now

global.fetch = async (url, init) => {
  fetchCalls.push({ url, init })
  if (url === 'https://oauth2.googleapis.com/token') {
    if (tokenFailure) return Response.json({ error: 'invalid_grant' }, { status: 400 })
    return Response.json({ access_token: 'offline-access-token', refresh_token: 'never-store-this-refresh-token' })
  }
  if (url === 'https://openidconnect.googleapis.com/v1/userinfo') {
    assert.equal(init.headers.Authorization, 'Bearer offline-access-token')
    return Response.json(profile)
  }
  throw new Error('Unexpected network request: ' + url)
}

function cookies(response) { return response.headers.getSetCookie() }
function cookiePair(response, kind) {
  const prefix = process.env.NODE_ENV === 'production' ? '__Host-' : ''
  return cookies(response).find(value => value.startsWith(prefix + 'ritty-newsletter-' + kind + '=')).split(';')[0]
}
function login() {
  const response = auth.newsletterLoginResponse()
  return { response, cookie: cookiePair(response, 'oauth'), url: new URL(response.headers.get('location')) }
}
function callback(flow, state = flow.url.searchParams.get('state'), cookie = flow.cookie) {
  return auth.newsletterCallbackResponse(new Request(flow.url.searchParams.get('redirect_uri') + '?' + new URLSearchParams({ code: 'offline-code', state }), { headers: { cookie } }))
}
function protectedRequest(cookie, origin = SITE, extra = {}) {
  return new Request(SITE + '/api/admin/newsletter/send', { method: 'POST', headers: { cookie, ...(origin === null ? {} : { origin }), ...extra } })
}
async function rejectsAuth(task, status, code) {
  await assert.rejects(task, failure => failure instanceof auth.NewsletterAuthError && failure.status === status && failure.code === code)
}

async function main() {
  const flow = login()
  assert.equal(flow.response.status, 303)
  assert.equal(flow.url.origin, 'https://accounts.google.com')
  assert.equal(flow.url.searchParams.get('scope'), 'openid email')
  assert.equal(flow.url.searchParams.get('redirect_uri'), CALLBACK)
  assert.equal(flow.url.searchParams.get('code_challenge_method'), 'S256')
  assert.equal(flow.url.searchParams.get('state').length, 43)
  for (const attribute of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/', 'Max-Age=600']) assert.ok(cookies(flow.response)[0].includes(attribute), attribute)
  assert.match(flow.response.headers.get('cache-control'), /no-store/)

  const completed = await callback(flow)
  assert.equal(completed.headers.get('location'), SITE + '/admin/newsletter')
  assert.equal(fetchCalls.length, 2)
  const tokenBody = fetchCalls[0].init.body
  assert.equal(tokenBody.get('client_secret'), 'offline-client-secret')
  assert.equal(tokenBody.get('redirect_uri'), CALLBACK)
  assert.equal(tokenBody.get('grant_type'), 'authorization_code')
  assert.equal(createHash('sha256').update(tokenBody.get('code_verifier')).digest('base64url'), flow.url.searchParams.get('code_challenge'))
  assert.ok(!flow.cookie.includes(tokenBody.get('code_verifier')))
  assert.equal(fetchCalls[0].init.redirect, 'error')
  assert.equal(fetchCalls[1].init.redirect, 'error')
  assert.match(cookiePair(completed, 'oauth'), /=$/)
  const session = cookiePair(completed, 'session')
  assert.ok(!session.includes(ADMIN) && !session.includes('offline-access-token') && !session.includes('never-store-this-refresh-token'))
  assert.ok(cookies(completed).some(value => value.includes('Max-Age=28800')))
  assert.deepEqual(await auth.requireNewsletterAdmin(protectedRequest(session), true), { email: ADMIN })

  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session, 'https://attacker.example'), true), 403, 'invalid_origin')
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session, null), true), 403, 'invalid_origin')
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session, SITE, { 'sec-fetch-site': 'cross-site' }), true), 403, 'invalid_origin')
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest('')), 401, 'unauthorized')
  const equals = session.indexOf('=')
  const tampered = session.slice(0, equals + 1) + (session[equals + 1] === 'A' ? 'B' : 'A') + session.slice(equals + 2)
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(tampered)), 401, 'unauthorized')
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session + '; ' + session)), 401, 'unauthorized')
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(flow.cookie.replace('-oauth=', '-session='))), 401, 'unauthorized')

  process.env.NEWSLETTER_ADMIN_EMAILS = 'other@example.test'
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session)), 403, 'forbidden')
  process.env.NEWSLETTER_ADMIN_EMAILS = ADMIN
  now += 8 * 60 * 60 * 1000 + 1000
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session)), 401, 'unauthorized')
  now = originalNow()

  let before = fetchCalls.length
  const mismatch = await callback(login(), 'x'.repeat(43))
  assert.equal(new URL(mismatch.headers.get('location')).searchParams.get('auth_error'), 'expired')
  assert.equal(fetchCalls.length, before)
  assert.equal(cookies(mismatch).length, 1)
  assert.match(cookiePair(mismatch, 'oauth'), /=$/)
  const replay = await callback(flow, flow.url.searchParams.get('state'), cookiePair(completed, 'oauth'))
  assert.equal(new URL(replay.headers.get('location')).searchParams.get('auth_error'), 'expired')
  assert.equal(fetchCalls.length, before)

  const stale = login()
  now += 11 * 60 * 1000
  const staleResult = await callback(stale)
  assert.equal(new URL(staleResult.headers.get('location')).searchParams.get('auth_error'), 'expired')
  assert.equal(fetchCalls.length, before)
  now = originalNow()

  for (const untrusted of [{ ...profile, email: 'outsider@example.test' }, { ...profile, email_verified: false }, { ...profile, email_verified: 'true' }, { ...profile, sub: '' }]) {
    const trusted = profile; profile = untrusted
    const result = await callback(login())
    assert.equal(new URL(result.headers.get('location')).searchParams.get('auth_error'), 'forbidden')
    assert.ok(cookies(result).every(value => !value.startsWith('__Host-ritty-newsletter-session=')))
    profile = trusted
  }
  tokenFailure = true
  const failed = await callback(login())
  assert.equal(failed.headers.get('location'), SITE + '/admin/newsletter?auth_error=failed')
  assert.ok(!JSON.stringify([...failed.headers]).includes('offline-client-secret'))
  tokenFailure = false

  assert.throws(() => auth.newsletterLogoutResponse(protectedRequest(session, null)), failure => failure.code === 'invalid_origin')
  const loggedOut = auth.newsletterLogoutResponse(protectedRequest(session))
  assert.equal(cookies(loggedOut).length, 2)
  assert.ok(cookies(loggedOut).every(value => value.includes('Max-Age=0')))
  assert.equal(auth.newsletterAuthResponse(new Error('internal detail')), null)
  const errorResponse = auth.newsletterAuthResponse(new auth.NewsletterAuthError(403, 'forbidden'))
  assert.equal(errorResponse.status, 403)
  assert.match(errorResponse.headers.get('cache-control'), /no-store/)

  const localOrigin = 'http://localhost:3000'
  process.env.NODE_ENV = 'development'
  process.env.NEWSLETTER_AUTH_ORIGIN = localOrigin
  const localFlow = login()
  assert.equal(process.env.NEXT_PUBLIC_SITE_URL, SITE, 'Public newsletter links must retain their HTTPS origin')
  assert.equal(localFlow.url.searchParams.get('redirect_uri'), localOrigin + '/api/admin/newsletter/auth/callback')
  assert.ok(localFlow.cookie.startsWith('ritty-newsletter-oauth='))
  assert.ok(!cookies(localFlow.response)[0].includes('; Secure'))
  for (const attribute of ['HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(cookies(localFlow.response)[0].includes(attribute))
  const localCompleted = await callback(localFlow)
  assert.equal(localCompleted.headers.get('location'), localOrigin + '/admin/newsletter')
  assert.equal(fetchCalls[fetchCalls.length - 2].init.body.get('redirect_uri'), localOrigin + '/api/admin/newsletter/auth/callback')
  const localSession = cookiePair(localCompleted, 'session')
  const localRequest = new Request(localOrigin + '/api/admin/newsletter/send', { method: 'POST', headers: { origin: localOrigin, cookie: localSession } })
  assert.deepEqual(await auth.requireNewsletterAdmin(localRequest, true), { email: ADMIN })
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(localSession, SITE), true), 403, 'invalid_origin')
  assert.ok(cookies(auth.newsletterLogoutResponse(localRequest)).every(value => value.includes('Max-Age=0') && !value.includes('; Secure')))
  process.env.NODE_ENV = 'production'
  assert.throws(() => auth.newsletterLoginResponse(), failure => failure instanceof auth.NewsletterAuthError && failure.status === 503 && failure.code === 'auth_not_configured')
  process.env.NODE_ENV = 'development'
  process.env.NEWSLETTER_AUTH_ORIGIN = 'http://auth.example.test'
  assert.throws(() => auth.newsletterLoginResponse(), failure => failure instanceof auth.NewsletterAuthError && failure.status === 503 && failure.code === 'auth_not_configured')
  delete process.env.NEWSLETTER_AUTH_ORIGIN
  process.env.NODE_ENV = 'production'

  process.env.NEWSLETTER_SESSION_SECRET = 'too-short'
  assert.ok(auth.newsletterAuthConfigurationMissing().includes('NEWSLETTER_SESSION_SECRET (32+ characters)'))
  await rejectsAuth(() => auth.requireNewsletterAdmin(protectedRequest(session)), 503, 'auth_not_configured')
  console.log('Newsletter auth checks passed: PKCE, verified identity, exact allowlist, revocation, expiry, cookie integrity, CSRF, safe OAuth failures and isolated localhost authentication.')
}

main().catch(failure => { console.error(failure); process.exitCode = 1 }).finally(() => {
  global.fetch = originalFetch; Date.now = originalNow
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key]
  Object.assign(process.env, originalEnv)
})
