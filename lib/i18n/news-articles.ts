import type { NewsArticle, NewsItem } from '../news'
import type { Locale } from './dictionaries'
import { newsCopy } from './news-copy'
export const originalLanguageLabel = (locale:Locale) => locale === 'zh-tw' ? '韓文原文' : ''
export const localizeNewsTitle = (item:NewsItem, _locale:Locale) => item.title
export function localizeNewsArticle(article:NewsArticle, locale:Locale):NewsArticle {
  return {...article,displayLocale:locale,category:newsCopy(locale,article.category),languageLabel:locale==='zh-tw'?'本文目前僅提供韓文。':undefined}
}
export const newsLanguageNote = (locale:Locale) => locale==='zh-tw'?'新聞文章目前僅提供韓文。':''
