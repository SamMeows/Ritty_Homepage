// Offline security/contract checks. All HTTP calls are mocked; no email is sent.
const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const { load } = require('./load-typescript.cjs')

const gmail = load('lib/newsletter-gmail.ts')
const { renderNewsletterEmail } = load('lib/newsletter-email.ts')
const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'NEWSLETTER_FROM_EMAIL', 'NEWSLETTER_COMPANY_NAME', 'NEWSLETTER_CONTACT_EMAIL', 'NEWSLETTER_COMPANY_ADDRESS']
const previousEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]))
const originalFetch = global.fetch
let scenario = 0, calls = [], sendMode = 'ok', tokenMode = 'ok', identityMode = 'ok'
const draft = {
  articleId: 'article-1', locale: 'kr', title: '새로운 리티 이야기', subject: '(광고) 새로운 리티 이야기',
  summary: '리티가 당근을 수확했어요.\n\n다음 소식도 기대해 주세요!', articleUrl: 'https://ritty.example/news/one',
  coverUrl: 'https://ritty.example/cover.png',
}
const input = { draft, email: 'reader@example.com', unsubscribeUrl: 'https://ritty.example/unsubscribe#signed-token', oneClickUrl: 'https://ritty.example/api/newsletter/unsubscribe?token=signed-token', jobKey: 'job-1' }
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function reset() {
  scenario++
  calls = []; sendMode = 'ok'; tokenMode = 'ok'; identityMode = 'ok'
  Object.assign(process.env, {
    GOOGLE_CLIENT_ID: 'offline-test.apps.googleusercontent.com', GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: `test-refresh-token-${scenario}`, NEWSLETTER_FROM_EMAIL: 'sender@example.com',
    NEWSLETTER_COMPANY_NAME: 'Sam-Meows', NEWSLETTER_CONTACT_EMAIL: 'support@example.com', NEWSLETTER_COMPANY_ADDRESS: 'Test address',
  })
}

global.fetch = async (url, options) => {
  assert(['https://oauth2.googleapis.com/token', 'https://openidconnect.googleapis.com/v1/userinfo', 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'].includes(url), 'Unexpected outbound destination')
  assert.equal(options.redirect, 'error', 'Credentials must not follow redirects')
  assert.equal(options.cache, 'no-store')
  calls.push({ url, options })
  if (url.endsWith('/token')) {
    assert.equal(options.body.get('grant_type'), 'refresh_token')
    if (tokenMode === 'network') throw new Error('fake network error containing test-client-secret')
    if (tokenMode === '400' || tokenMode === '401') return json({ error: 'invalid_grant', error_description: 'test-refresh-token' }, Number(tokenMode))
    if (tokenMode === '429') return json({ error: 'too_many_requests' }, 429)
    return json({ access_token: 'test-access-token', expires_in: 3600 })
  }
  if (url.endsWith('/userinfo')) {
    assert.equal(options.headers.Authorization, 'Bearer test-access-token')
    if (identityMode === 'mismatch') return json({ email: 'other@example.com', email_verified: true })
    if (identityMode === 'unverified') return json({ email: 'sender@example.com', email_verified: false })
    if (identityMode === '401' || identityMode === '403') return json({ error: 'insufficientPermissions', detail: 'test-access-token' }, Number(identityMode))
    return json({ email: 'sender@example.com', email_verified: true })
  }
  assert.equal(options.headers.Authorization, 'Bearer test-access-token')
  if (sendMode === 'network') throw new Error('send response was lost; test-access-token')
  if (sendMode === 'malformed') return json({})
  if (sendMode === '500') return json({ error: { message: 'test-access-token' } }, 500)
  if (sendMode === '408') return json({}, 408)
  if (sendMode === '429') return json({}, 429)
  if (sendMode === '403quota') return json({ error: { errors: [{ reason: 'userRateLimitExceeded' }] } }, 403)
  if (sendMode === '403') return json({ error: { message: 'test-refresh-token', errors: [{ reason: 'insufficientPermissions' }] } }, 403)
  if (sendMode === '401') return json({ error: { message: 'test-access-token' } }, 401)
  if (sendMode === '400') return json({}, 400)
  return json({ id: 'gmail-message-123' })
}

function sentRequests() { return calls.filter(call => call.url.includes('/messages/send')) }
function decodeMime(call) { return Buffer.from(JSON.parse(call.options.body).raw, 'base64url').toString('utf8') }
function decodeSubject(mime) {
  const header = mime.split('\r\nDate:')[0].split('Subject: ')[1]
  return [...header.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map(match => Buffer.from(match[1], 'base64').toString('utf8')).join('')
}
async function expectError(promise, kind, retryable, code) {
  await assert.rejects(promise, error => {
    assert(error instanceof gmail.GmailSendError)
    assert.equal(error.kind, kind); assert.equal(error.retryable, retryable)
    if (code) assert.equal(error.code, code)
    assert(!error.message.includes('test-access-token') && !error.message.includes('test-refresh-token') && !error.message.includes('test-client-secret'))
    return true
  })
}

async function run() {
  reset()
  assert.deepEqual(gmail.gmailConfigurationMissing(), [])
  const rendered = renderNewsletterEmail({ ...draft, title: '<script>alert("x")</script>', summary: '<img src=x onerror="alert(1)">\n\n안녕하세요 & 반가워요' }, { unsubscribeUrl: input.unsubscribeUrl, companyName: '<Sam>', contactEmail: 'support@example.com' })
  assert(!rendered.html.includes('<script>') && !rendered.html.includes('<img src=x'))
  assert(rendered.html.includes('&lt;script&gt;') && rendered.html.includes('&lt;Sam&gt;') && rendered.html.includes('&amp; 반가워요'))
  assert(rendered.text.includes('<script>') && !rendered.text.includes('&lt;script&gt;'))
  for (const [locale, lang, unsubscribe] of [['kr', 'ko', '이메일 수신거부'], ['en', 'en', 'Unsubscribe'], ['ja', 'ja', 'メール配信停止'], ['zh-tw', 'zh-TW', '取消訂閱']]) {
    const result = renderNewsletterEmail({ ...draft, locale }, { unsubscribeUrl: input.unsubscribeUrl })
    assert(result.html.includes(`lang="${lang}"`) && result.text.includes(unsubscribe))
  }
  for (const invalid of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com', 'https://example.com/\nattack']) {
    assert.throws(() => renderNewsletterEmail({ ...draft, articleUrl: invalid }, { unsubscribeUrl: input.unsubscribeUrl }))
  }
  assert.throws(() => renderNewsletterEmail({ ...draft, coverUrl: 'data:image/svg+xml,<svg/>' }, { unsubscribeUrl: input.unsubscribeUrl }))
  assert.throws(() => renderNewsletterEmail(draft, { unsubscribeUrl: input.unsubscribeUrl, contactEmail: 'x@example.com\nBcc: other@example.com' }))

  const result = await gmail.sendNewsletterEmail(input)
  assert.deepEqual(result, { messageId: 'gmail-message-123' })
  assert.equal(calls.length, 3)
  const mime = decodeMime(sentRequests()[0])
  assert.equal((mime.match(/^To:/gm) || []).length, 1)
  assert(mime.includes('To: <reader@example.com>\r\n') && !/^Cc:|^Bcc:/m.test(mime))
  assert(mime.includes('List-Unsubscribe-Post: List-Unsubscribe=One-Click'))
  assert.equal(decodeSubject(mime), draft.subject)
  const sections = mime.split(/--ritty_newsletter_[a-f0-9]+/)
  const textPart = sections.find(section => section.includes('Content-Type: text/plain'))
  const htmlPart = sections.find(section => section.includes('Content-Type: text/html'))
  assert(Buffer.from(textPart.split('\r\n\r\n')[1].trim(), 'base64').toString('utf8').includes(draft.summary))
  assert(Buffer.from(htmlPart.split('\r\n\r\n')[1].trim(), 'base64').toString('utf8').includes('리티'))
  await gmail.sendNewsletterEmail(input)
  assert.equal(calls.length, 4, 'Valid access token is reused without reauthorizing every recipient')
  const secondMime = decodeMime(sentRequests()[1])
  assert.equal(mime.match(/^Message-ID: (.+)$/m)[1], secondMime.match(/^Message-ID: (.+)$/m)[1], 'Message ID is stable for reconciliation, not server deduplication')

  reset()
  const longSubject = '(광고) ' + '리티와 함께 🐈 '.repeat(20)
  await gmail.sendNewsletterEmail({ ...input, draft: { ...draft, subject: longSubject } })
  assert.equal(decodeSubject(decodeMime(sentRequests()[0])), longSubject, 'Folded UTF-8 headers must preserve complete Unicode characters')
  for (const change of [{ email: 'reader@example.com\r\nBcc: intruder@example.com' }, { draft: { ...draft, subject: 'Hi\r\nBcc: intruder@example.com' } }, { oneClickUrl: input.unsubscribeUrl }]) {
    reset(); await expectError(gmail.sendNewsletterEmail({ ...input, ...change }), 'rejected', false, 'invalid_message'); assert.equal(calls.length, 0)
  }
  reset(); process.env.NEWSLETTER_FROM_EMAIL = 'sender@example.com\r\nBcc: intruder@example.com'
  assert(gmail.gmailConfigurationMissing().includes('NEWSLETTER_FROM_EMAIL'))
  await expectError(gmail.sendNewsletterEmail(input), 'rejected', true, 'not_configured'); assert.equal(calls.length, 0)
  reset(); delete process.env.GOOGLE_REFRESH_TOKEN
  assert(gmail.gmailConfigurationMissing().includes('GOOGLE_REFRESH_TOKEN'))
  await expectError(gmail.sendNewsletterEmail(input), 'rejected', true, 'not_configured'); assert.equal(calls.length, 0)

  for (const mode of ['mismatch', 'unverified']) {
    reset(); identityMode = mode; await expectError(gmail.sendNewsletterEmail(input), 'rejected', true, 'sender_mismatch'); assert.equal(sentRequests().length, 0)
  }
  for (const mode of ['401', '403']) {
    reset(); identityMode = mode; await expectError(gmail.sendNewsletterEmail(input), 'rejected', true, 'identity_unavailable'); assert.equal(sentRequests().length, 0)
  }
  for (const [mode, retryable] of [['400', true], ['401', true], ['429', true], ['network', true]]) {
    reset(); tokenMode = mode; await expectError(gmail.sendNewsletterEmail(input), 'rejected', retryable); assert.equal(sentRequests().length, 0)
  }
  for (const mode of ['network', '500', '408', 'malformed']) {
    reset(); sendMode = mode; await expectError(gmail.sendNewsletterEmail(input), 'unknown', false); assert.equal(sentRequests().length, 1, 'An ambiguous send must never be retried automatically')
  }
  for (const [mode, retryable] of [['429', true], ['403quota', true], ['401', true], ['403', true], ['400', false]]) {
    reset(); sendMode = mode; await expectError(gmail.sendNewsletterEmail(input), 'rejected', retryable); assert.equal(sentRequests().length, 1)
  }
  reset(); sendMode = '401'
  await expectError(gmail.sendNewsletterEmail(input), 'rejected', true, 'send_http_401')
  assert.equal(calls.length, 3, 'An explicit authentication rejection must still stop after one send POST')
  sendMode = 'ok'
  await gmail.sendNewsletterEmail(input)
  assert.equal(calls.filter(call => call.url.endsWith('/token')).length, 2, 'A later explicit retry refreshes rejected credentials')
  assert.equal(sentRequests().length, 2)

  const helper = await import(pathToFileURL(path.resolve('scripts/authorize-newsletter-gmail.mjs')).href)
  assert(helper.validState('correct-state', 'correct-state'))
  assert(!helper.validState('correct-state', 'wrong-state') && !helper.validState('correct-state', null))
  assert.equal(helper.validateSetupEmail('Sender@Example.com'), 'sender@example.com')
  assert.throws(() => helper.validateSetupEmail('sender@example.com\nInjected'))
  const authUrl = new URL(helper.buildAuthorizationUrl({ clientId: 'client', from: 'sender@example.com', redirectUri: 'http://127.0.0.1:53682/oauth/callback', state: 'secure-state', verifier: 'pkce-verifier' }))
  assert.equal(authUrl.origin, 'https://accounts.google.com')
  assert.equal(authUrl.searchParams.get('scope'), 'openid email https://www.googleapis.com/auth/gmail.send')
  assert.equal(authUrl.searchParams.get('code_challenge'), createHash('sha256').update('pkce-verifier').digest('base64url'))
  assert.equal(authUrl.searchParams.get('state'), 'secure-state')
  assert.equal(authUrl.searchParams.get('access_type'), 'offline')
  const updated = helper.updateEnvContents('OTHER=value\nGOOGLE_REFRESH_TOKEN="old"\n', { GOOGLE_REFRESH_TOKEN: 'new-token' })
  assert(updated.includes('OTHER=value') && updated.includes('GOOGLE_REFRESH_TOKEN="new-token"') && !updated.includes('"old"'))
  assert.equal((updated.match(/GOOGLE_REFRESH_TOKEN=/g) || []).length, 1)
  assert.throws(() => helper.updateEnvContents('', { GOOGLE_REFRESH_TOKEN: 'x\nINJECTED=1' }))
  const previousArgv = process.argv
  const previousLog = console.log
  let help = ''
  try {
    process.argv = [...process.argv, '--help']
    console.log = (...parts) => { help += parts.join(' ') + '\n' }
    await helper.main()
  } finally { process.argv = previousArgv; console.log = previousLog }
  assert(help.replace(/\s+/g, ' ').includes('GitHub Actions secrets') && !help.includes('test-refresh-token') && !help.includes('test-client-secret'))
  console.log('PASS: escaped multilingual HTML/text; safe URLs and headers; one private To; stable Message-ID; verified sender; credential isolation; quota/rejection vs ambiguous send handling; no automatic send retries; OAuth state/PKCE/minimal scopes/private-file preparation. All HTTP mocked; no live email sent.')
}

run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  global.fetch = originalFetch
  for (const key of keys) previousEnv[key] === undefined ? delete process.env[key] : process.env[key] = previousEnv[key]
})
