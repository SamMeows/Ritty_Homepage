import { newsArticlePath, newsListPath, newsLocale } from './news-languages'
import type { NewsArticle, NewsBlock } from '@/lib/news'

export const SITE_URL = 'https://ritty.sam-meows.com'

export const searchRobots = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-image-preview': 'large' as const,
  },
}

// Public editorial text can contain HTML-like strings. Keep JSON-LD inside its script.
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export function newsDescription(article: NewsArticle): string {
  const paragraphs: string[] = []
  function visit(blocks: NewsBlock[]) {
    for (const block of blocks) {
      if (['paragraph', 'bulleted_list_item', 'numbered_list_item', 'quote', 'callout'].includes(block.type) && block.text) {
        paragraphs.push(block.text)
      }
      if (block.children) visit(block.children)
    }
  }
  visit(article.blocks || [])
  return (paragraphs.join(' ').replace(/\s+/g, ' ').trim() || `${article.title}. 말하는 고양이와 함께하는 힐링 게임 리티의 새로운 소식을 만나보세요.`).slice(0, 160)
}

export function newsStructuredData(article: NewsArticle, description: string) {
  const locale = newsLocale(article.language || 'KO')
  const url = SITE_URL + newsArticlePath(article.language || 'KO',article.id)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsArticle',
        '@id': `${url}#article`,
        url,
        headline: article.title,
        description,
        datePublished: article.date,
        ...(article.modifiedAt ? { dateModified: article.modifiedAt } : {}),
        publisher: {
          '@type': 'Organization',
          '@id': `${SITE_URL}/#organization`,
          name: '삼냥이즈',
          alternateName: 'SamMeows Inc.',
          url: 'https://sam-meows.com',
        },
        about: { '@type': ['VideoGame', 'MobileApplication'], '@id': `${SITE_URL}/#game`, name: '리티 Ritty' },
        inLanguage: article.language === 'ZH-TW' ? 'zh-TW' : article.language === 'EN' ? 'en-US' : article.language === 'JA' ? 'ja-JP' : 'ko-KR',
        image: [article.cover || `${SITE_URL}/og-ritty-island-v2.png`],
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        isPartOf: { '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: '리티 Ritty', url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Ritty', item: SITE_URL + (locale === 'kr' ? '' : '/' + locale) },
          { '@type': 'ListItem', position: 2, name: locale === 'zh-tw' ? 'Ritty 最新消息' : locale === 'en' ? 'Ritty News' : locale === 'ja' ? 'Rittyのお知らせ' : '리티 소식', item: SITE_URL + newsListPath(locale) },
          { '@type': 'ListItem', position: 3, name: article.title, item: url },
        ],
      },
    ],
  }
}
