#!/usr/bin/env node
// Local-only OAuth bootstrap. This script never sends email or prints credentials.
import { createServer } from 'node:http'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile, rename, chmod, lstat, unlink } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/gmail.send'
const ALIAS_SCOPE = 'https://www.googleapis.com/auth/gmail.settings.basic'
const LOCAL_FILE = '.env.newsletter.local'

export function validateSetupEmail(value) {
  if (typeof value !== 'string' || value.length > 254 || /[\u0000-\u0020\u007f]/.test(value) || !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value)) {
    throw new Error('Use a valid primary mailbox or verified Gmail Send mail as address.')
  }
  return value.toLowerCase()
}

export function validState(expected, received) {
  if (typeof received !== 'string') return false
  const left = Buffer.from(expected)
  const right = Buffer.from(received)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function buildAuthorizationUrl({ clientId, from, redirectUri, state, verifier, account = from }) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
    scope: `openid email ${REQUIRED_SCOPE}${account !== from ? ' ' + ALIAS_SCOPE : ''}`, access_type: 'offline', prompt: 'consent select_account',
    login_hint: account, state, code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  }).toString()
  return url.href
}

export function updateEnvContents(existing, values) {
  let lines = existing.split(/\r?\n/)
  for (const [key, value] of Object.entries(values)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key) || typeof value !== 'string' || /[\r\n\u0000]/.test(value)) throw new Error('Invalid local environment value')
    const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`)
    lines = lines.filter(line => !pattern.test(line))
    lines.push(`${key}=${JSON.stringify(value)}`)
  }
  return `${lines.filter((line, index) => line || index < lines.length - 1).join('\n')}\n`
}

async function writeLocalCredentials(values) {
  const target = resolve(process.cwd(), LOCAL_FILE)
  try {
    execFileSync('git', ['check-ignore', '--quiet', '--', LOCAL_FILE], { stdio: 'ignore' })
  } catch {
    throw new Error(`${LOCAL_FILE} must be ignored by git before credentials can be saved.`)
  }
  let tracked = false
  try { execFileSync('git', ['ls-files', '--error-unmatch', '--', LOCAL_FILE], { stdio: 'ignore' }); tracked = true } catch { /* untracked is expected */ }
  if (tracked) throw new Error('Refusing to write credentials into a tracked file.')
  let previous = ''
  try {
    const stat = await lstat(target)
    if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1) throw new Error('Local credential file must be a regular private file.')
    previous = await readFile(target, 'utf8')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  const temporary = resolve(dirname(target), `.env.newsletter.${randomBytes(12).toString('hex')}.local`)
  try {
    await writeFile(temporary, updateEnvContents(previous, values), { flag: 'wx', mode: 0o600 })
    await rename(temporary, target)
    await chmod(target, 0o600)
  } finally {
    await unlink(temporary).catch(() => {})
  }
}

async function exchangeAndVerify({ code, verifier, redirectUri, clientId, clientSecret, from, account }) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, code_verifier: verifier, redirect_uri: redirectUri, client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code' }),
    redirect: 'error', signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error('Google rejected the authorization-code exchange. Check the OAuth client and redirect URI.')
  const token = await response.json()
  if (typeof token.access_token !== 'string' || typeof token.refresh_token !== 'string' || !token.refresh_token || /[\r\n]/.test(token.access_token)) {
    throw new Error('Google did not return an offline refresh token. Reauthorize with the sender account and consent to the requested permissions.')
  }
  if (typeof token.scope !== 'string' || !token.scope.split(' ').includes(REQUIRED_SCOPE)) throw new Error('The Gmail send permission was not granted.')
  const profileResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${token.access_token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
  })
  if (!profileResponse.ok) throw new Error('Could not verify the authorized sender. No credentials were saved.')
  const profile = await profileResponse.json()
  if (profile.email_verified !== true || typeof profile.email !== 'string' || profile.email.toLowerCase() !== account) {
    throw new Error('The selected Google account does not match NEWSLETTER_SENDER_ACCOUNT (or NEWSLETTER_FROM_EMAIL when unset). No credentials were saved.')
  }
  if (account !== from) {
    if (!token.scope.split(' ').includes(ALIAS_SCOPE)) throw new Error('Alias verification permission was not granted. No credentials were saved.')
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/settings/sendAs/' + encodeURIComponent(from), {
      headers: { Authorization: `Bearer ${token.access_token}` }, redirect: 'error', signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error('Could not verify the Gmail Send mail as address. No credentials were saved.')
    const alias = await response.json()
    if (alias.sendAsEmail !== from || alias.verificationStatus !== 'accepted') throw new Error('The Gmail Send mail as address is not verified. No credentials were saved.')
  }
  return token.refresh_token
}

const help = `Authorize the Ritty newsletter sender (local computer only).

1. Enable Gmail API in a Google Cloud project in your Workspace organization.
2. Create/use a Web application OAuth client. The administrator sign-in callback
   and this helper's callback can be registered on the same Web client.
3. Add the exact redirect URI: http://127.0.0.1:53682/oauth/callback
4. Put GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEWSLETTER_FROM_EMAIL in the
   git-ignored .env.newsletter.local file. For aliases, also set
   NEWSLETTER_SENDER_ACCOUNT to the primary mailbox, and verify the From address
   in that account's Gmail Send mail as settings before running this helper.
5. Run:
   node --env-file=.env.newsletter.local scripts/authorize-newsletter-gmail.mjs

The helper requests Gmail send + verified account email only. It does not read
your inbox and does not send a test message. A verified refresh token is saved
to .env.newsletter.local with restrictive permissions, never printed.

After authorization, copy GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
GOOGLE_REFRESH_TOKEN, and NEWSLETTER_FROM_EMAIL into this repository's GitHub
Actions secrets. Keep GOOGLE_REFRESH_TOKEN out of Vercel and browser variables.
Never paste credentials into chat, commit them, or add a NEXT_PUBLIC_ prefix.

An Internal OAuth app is appropriate for a sender in your Workspace organization.
If using an External app, complete its production configuration; a Testing app
may issue refresh tokens that expire after seven days.

Optional: set NEWSLETTER_OAUTH_PORT to change 53682, and register the matching
loopback redirect URI in the OAuth client first.
`

export async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(help); return }
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const from = validateSetupEmail(process.env.NEWSLETTER_FROM_EMAIL || '')
  const account = validateSetupEmail(process.env.NEWSLETTER_SENDER_ACCOUNT || from)
  if (!clientId || !clientSecret || /[\r\n]/.test(clientId + clientSecret)) throw new Error('Load GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from the ignored local environment file. Use --help for instructions.')
  const port = Number(process.env.NEWSLETTER_OAUTH_PORT || 53682)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid NEWSLETTER_OAUTH_PORT')
  const host = `127.0.0.1:${port}`
  const redirectUri = `http://${host}/oauth/callback`
  const state = randomBytes(32).toString('base64url')
  const verifier = randomBytes(48).toString('base64url')
  let busy = false
  let completed = false
  let finish
  const done = new Promise((resolveDone, rejectDone) => { finish = error => error ? rejectDone(error) : resolveDone() })
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    response.setHeader('Content-Type', 'text/plain; charset=utf-8')
    if (request.headers.host !== host || request.method !== 'GET') { response.writeHead(400); response.end('Invalid local request.'); return }
    const url = new URL(request.url || '/', redirectUri)
    if (url.pathname === '/done' && completed) {
      response.end('Sender connected. Credentials were saved locally; no email was sent. You can close this tab.')
      finish()
      return
    }
    if (url.pathname !== '/oauth/callback') { response.writeHead(404); response.end('Not found.'); return }
    if (!validState(state, url.searchParams.get('state'))) { response.writeHead(400); response.end('Invalid authorization state. Restart the helper if needed.'); return }
    if (busy || completed) { response.writeHead(409); response.end('Authorization is already being processed.'); return }
    if (url.searchParams.has('error')) { response.writeHead(400); response.end('Authorization was not completed.'); finish(new Error('Google authorization was cancelled or denied.')); return }
    const code = url.searchParams.get('code')
    if (!code || code.length > 4096) { response.writeHead(400); response.end('Missing authorization code.'); return }
    busy = true
    try {
      const refreshToken = await exchangeAndVerify({ code, verifier, redirectUri, clientId, clientSecret, from, account })
      await writeLocalCredentials({ GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret, GOOGLE_REFRESH_TOKEN: refreshToken, NEWSLETTER_FROM_EMAIL: from, NEWSLETTER_SENDER_ACCOUNT: account })
      completed = true
      console.log('Sender verified. Credentials saved to the ignored .env.newsletter.local file. No email was sent.')
      console.log('Copy the four sender values to GitHub Actions secrets. Do not upload the local file or put the refresh token in Vercel.')
      response.writeHead(303, { Location: '/done' }); response.end()
      // Also finish if the browser does not follow the local redirect.
      setTimeout(() => finish(), 1500).unref()
    } catch (error) {
      response.writeHead(400); response.end('Authorization failed. See the local terminal for instructions. No email was sent.')
      // Only our sanitized messages are surfaced; upstream response bodies are never logged.
      finish(error instanceof Error && !['SyntaxError', 'TypeError'].includes(error.name) ? error : new Error('Google authorization could not be completed. Check the connection and retry.'))
    }
  })
  const timeout = setTimeout(() => finish(new Error('Authorization timed out after ten minutes. Run the helper again.')), 10 * 60_000)
  const interrupted = () => finish(new Error('Authorization cancelled.'))
  process.once('SIGINT', interrupted)
  try {
    await new Promise((resolveListening, rejectListening) => { server.once('error', rejectListening); server.listen(port, '127.0.0.1', resolveListening) })
    console.log(`Open the URL below on this computer. Sign in as ${account}.\n${buildAuthorizationUrl({ clientId, from, account, redirectUri, state, verifier })}`)
    await done
  } finally {
    clearTimeout(timeout)
    process.off('SIGINT', interrupted)
    server.close()
    server.closeAllConnections()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Authorization failed.'); process.exitCode = 1 })
}
