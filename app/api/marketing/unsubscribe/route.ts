import { NextResponse } from 'next/server'
import { unsubscribeMarketing } from '@/lib/marketing-subscription'
export const runtime = 'nodejs'

const HEADERS = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
const MAX_BODY_BYTES = 2048

async function boundedBody(request: Request): Promise<string | null> {
 const length = Number(request.headers.get('content-length') || 0)
 if (!Number.isFinite(length) || length < 0 || length > MAX_BODY_BYTES) return null
 if (!request.body) return ''
 const reader = request.body.getReader(), chunks: Uint8Array[] = []
 let bytes = 0
 try {
  while (true) {
   const { done, value } = await reader.read()
   if (done) break
   bytes += value.byteLength
   if (bytes > MAX_BODY_BYTES) { await reader.cancel(); return null }
   chunks.push(value)
  }
 } finally { reader.releaseLock() }
 return Buffer.concat(chunks).toString('utf8')
}

// Crawlers and link previews cannot withdraw consent just by opening the URL.
export function GET() {
 return NextResponse.json({ error: 'method_not_allowed' }, { status: 405, headers: { ...HEADERS, Allow: 'POST' } })
}

export async function POST(request: Request) {
 const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
 if (type !== 'application/json' && type !== 'application/x-www-form-urlencoded') {
  return NextResponse.json({ error: 'unsupported_media_type' }, { status: 415, headers: HEADERS })
 }
 let token: unknown
 try {
  const body = await boundedBody(request)
  if (body === null) return NextResponse.json({ error: 'too_large' }, { status: 413, headers: HEADERS })
  if (type === 'application/json') token = JSON.parse(body)?.token
  else {
   const form = new URLSearchParams(body), query = new URL(request.url).searchParams
   if (form.getAll('List-Unsubscribe').length === 1 && form.get('List-Unsubscribe') === 'One-Click' && query.getAll('token').length === 1) token = query.get('token')
  }
 } catch { /* Malformed request; do not query contacts or expose internal errors. */ }
 if (typeof token !== 'string' || token.length > 100) return NextResponse.json({ error: 'invalid' }, { status: 400, headers: HEADERS })
 try {
  const success = await unsubscribeMarketing(token)
  return NextResponse.json(success ? { status: 'unsubscribed' } : { error: 'invalid' }, { status: success ? 200 : 400, headers: HEADERS })
 } catch { return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: HEADERS }) }
}
