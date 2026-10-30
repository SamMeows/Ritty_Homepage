import { newsletterAuthResponse, newsletterLoginResponse } from '@/lib/newsletter-auth'
export const runtime = 'nodejs'
export async function GET() {
  try { return newsletterLoginResponse() }
  catch (error) { return newsletterAuthResponse(error) || Response.json({ error: 'login_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
}
