import { NextResponse } from 'next/server'
import { unsubscribeMarketing } from '@/lib/marketing-subscription'
export const runtime = 'nodejs'
export async function POST(request: Request) {
 const headers = { 'Cache-Control': 'no-store' }
 const body = await request.json().catch(() => null)
 if (typeof body?.token !== 'string' || body.token.length > 100) return NextResponse.json({ error: 'invalid' }, { status: 400, headers })
 try {
  const success = await unsubscribeMarketing(body.token)
  return NextResponse.json(success ? { status: 'unsubscribed' } : { error: 'invalid' }, { status: success ? 200 : 400, headers })
 } catch { return NextResponse.json({ error: 'unavailable' }, { status: 503, headers }) }
}
