import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { newsletterErrorResponse, newsletterResponse, readNewsletterJson, sendTestApprovedNewsletter } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const admin = await requireNewsletterAdmin(request, true)
    return newsletterResponse(await sendTestApprovedNewsletter(await readNewsletterJson(request), admin.email), 202)
  } catch (error) { return newsletterErrorResponse(error) }
}
