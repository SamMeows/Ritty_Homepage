import { newsletterAuthResponse, newsletterCallbackResponse } from '@/lib/newsletter-auth'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try { return await newsletterCallbackResponse(request) }
  catch (error) { return newsletterAuthResponse(error) || Response.json({ error: 'login_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } }) }
}
