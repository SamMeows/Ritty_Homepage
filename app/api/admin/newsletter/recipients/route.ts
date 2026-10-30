import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { addNewsletterRecipient, newsletterErrorResponse, newsletterResponse, readNewsletterJson } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await requireNewsletterAdmin(request, true)
    return newsletterResponse(await addNewsletterRecipient(await readNewsletterJson(request)))
  } catch (error) { return newsletterErrorResponse(error) }
}
