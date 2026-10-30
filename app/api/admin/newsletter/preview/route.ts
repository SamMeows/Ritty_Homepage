import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { newsletterErrorResponse, newsletterResponse, previewNewsletter, readNewsletterJson } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await requireNewsletterAdmin(request, true)
    return newsletterResponse(await previewNewsletter(await readNewsletterJson(request)))
  } catch (error) { return newsletterErrorResponse(error) }
}
