import { requireNewsletterAdmin } from '@/lib/newsletter-auth'
import { getNewsletterJob, listNewsletterJobs, newsletterErrorResponse, newsletterResponse } from '@/lib/newsletter-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    await requireNewsletterAdmin(request)
    const id = new URL(request.url).searchParams.get('id')
    return newsletterResponse(id === null ? { jobs: await listNewsletterJobs() } : { job: await getNewsletterJob(id) })
  } catch (error) { return newsletterErrorResponse(error) }
}
