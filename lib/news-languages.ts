import type { Locale } from './i18n/dictionaries'
export type NewsLanguage = 'KO' | 'EN' | 'JA'
export const newsLanguage = (locale: Locale): NewsLanguage => locale === 'en' ? 'EN' : locale === 'ja' ? 'JA' : 'KO'
export const newsLocale = (language: NewsLanguage): Locale => language === 'EN' ? 'en' : language === 'JA' ? 'ja' : 'kr'
export const newsListPath = (locale: Locale) => locale === 'kr' ? '/news' : `/${locale}/news`
export const newsArticlePath = (language: NewsLanguage, id: string) => `${newsListPath(newsLocale(language))}/${id}`
export const formatNewsDate = (date: string, locale: Locale) => {
  const parsed = new Date(date.slice(0,10) + 'T00:00:00Z')
  if (!Number.isFinite(parsed.getTime())) return date
  return new Intl.DateTimeFormat(locale === 'kr' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh-tw' ? 'zh-TW' : 'en-US', {year:'numeric',month:locale === 'en' ? 'short' : 'long',day:'numeric',timeZone:'UTC'}).format(parsed)
}
