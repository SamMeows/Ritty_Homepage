import type { NewsBlock } from './news'
import type { NewsletterBlock, NewsletterLocale } from './newsletter-types'

export function newsletterImagePath(articleId: string, locale: NewsletterLocale, path: string) {
  return `/api/news/${articleId}/image?locale=${locale}&path=${path}`
}

// Only links from the published article are used. The renderer never fetches them.
export function newsletterContent(blocks: NewsBlock[], articleId: string, locale: NewsletterLocale, origin: string, parent = ''): NewsletterBlock[] {
  return blocks.map((block, index) => {
    const path = parent ? `${parent}.${index}` : String(index)
    let url: string | undefined
    if (block.href) {
      try {
        const parsed = new URL(block.href)
        if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) {
          const imageKey = block.id && /^[a-f\d]{32}$/i.test(block.id) ? `block-${block.id}` : path
          url = block.type === 'image' ? new URL(newsletterImagePath(articleId, locale, imageKey), origin).href : parsed.href
        }
      } catch { /* Keep the block's readable text when its link is invalid. */ }
    }
    return { type: block.type, text: block.text || '', ...(url ? { url } : {}),
      ...(block.children?.length ? { children: newsletterContent(block.children, articleId, locale, origin, path) } : {}) }
  })
}
