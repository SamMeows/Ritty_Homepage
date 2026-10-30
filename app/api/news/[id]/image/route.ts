import { getNewsArticle, validNewsId, type NewsBlock } from '@/lib/news'
import { NEWSLETTER_LOCALES, type NewsletterLocale } from '@/lib/newsletter-types'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' }

function findImage(blocks: NewsBlock[], id: string): string | undefined {
  for (const block of blocks) {
    if (block.id === id && block.type === 'image') return block.href
    const nested = findImage(block.children || [], id)
    if (nested) return nested
  }
}

// Resolve expiring Notion image URLs when the email is opened. No arbitrary URL
// parameter or server-side image fetch: the source must belong to a public article.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const query = new URL(request.url).searchParams
  const locale = query.get('locale') || 'kr'
  const path = query.get('path') || ''
  if (!validNewsId(id) || !NEWSLETTER_LOCALES.includes(locale as NewsletterLocale)
    || (path !== 'cover' && !/^block-[a-f\d]{32}$/i.test(path) && !/^\d{1,4}(?:\.\d{1,4}){0,8}$/.test(path))) return new Response(null, { status: 404, headers })
  try {
    const article = await getNewsArticle(id, locale as NewsletterLocale)
    if (!article) return new Response(null, { status: 404, headers })
    let source = path === 'cover' ? article.cover : undefined
    if (path.startsWith('block-')) source = findImage(article.blocks || [], path.slice(6))
    else if (path !== 'cover') {
      let blocks = article.blocks
      let block: NewsBlock | undefined
      for (const index of path.split('.')) {
        block = blocks?.[Number(index)]
        blocks = block?.children
      }
      if (block?.type === 'image') source = block.href
    }
    if (!source) return new Response(null, { status: 404, headers })
    const target = new URL(source)
    if (target.protocol !== 'https:' || target.username || target.password) return new Response(null, { status: 404, headers })
    return new Response(null, { status: 307, headers: { ...headers, Location: target.href } })
  } catch { return new Response(null, { status: 503, headers }) }
}
