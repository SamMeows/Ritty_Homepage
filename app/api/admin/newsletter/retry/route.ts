import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { newsletterErrorResponse, newsletterResponse, readNewsletterJson, retryNewsletterJob } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    await requireNewsletterAdmin(request, true)
    return newsletterResponse(await retryNewsletterJob(await readNewsletterJson(request)), 202)
  } catch (error) { return newsletterErrorResponse(error) }
}
