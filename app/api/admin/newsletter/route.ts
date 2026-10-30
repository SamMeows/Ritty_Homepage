import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { getNewsletterOverview, newsletterErrorResponse, newsletterLocale, newsletterResponse } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireNewsletterAdmin(request)
    const locale = newsletterLocale(new URL(request.url).searchParams.get('locale') ?? 'kr')
    return newsletterResponse(await getNewsletterOverview(locale))
  } catch (error) { return newsletterErrorResponse(error) }
}
