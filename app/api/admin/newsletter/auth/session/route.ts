import { newsletterAuthResponse, NewsletterAuthError, requireNewsletterAdmin } from '@/lib/newsletter-auth'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  try {
    const admin = await requireNewsletterAdmin(request)
    return Response.json({ authenticated: true, email: admin.email }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  } catch (error) {
    if (error instanceof NewsletterAuthError && [401, 403].includes(error.status)) return Response.json({ authenticated: false }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
    return newsletterAuthResponse(error) || Response.json({ error: 'login_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
