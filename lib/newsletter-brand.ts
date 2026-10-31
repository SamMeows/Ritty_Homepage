import type { NewsletterLocale } from './newsletter-types'

export const NEWSLETTER_BRAND = {
  company: '삼냥이즈 · Sam-Meows Inc.',
  address: '서울특별시 강남구 역삼로 180 시드존 삼냥이즈',
  contact: 'hello@sam-meows.com',
} as const

export const NEWSLETTER_SUBJECT_PREFIXES: Record<NewsletterLocale, string> = {
  kr: '[리티 개발일지]',
  en: '[Ritty Dev Journal]',
  ja: '[リティ開発日誌]',
  'zh-tw': '[Ritty 開發日誌]',
}

export const NEWSLETTER_TEST_SUBJECT_PREFIXES: Record<NewsletterLocale, string> = {
  kr: '[테스트]',
  en: '[Test]',
  ja: '[テスト]',
  'zh-tw': '[測試]',
}
