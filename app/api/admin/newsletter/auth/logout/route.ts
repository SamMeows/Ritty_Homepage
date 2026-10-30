import { newsletterAuthResponse, newsletterLogoutResponse } from '@/lib/newsletter-auth'
export const runtime = 'nodejs'
export async function POST(request: Request) {
  try { return newsletterLogoutResponse(request) }
  catch (error) { return newsletterAuthResponse(error) || Response.json({ error: 'logout_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
}
