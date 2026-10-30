import type { NewsArticle, NewsItem } from '../news'
import type { Locale } from './dictionaries'
import { newsCopy } from './news-copy'
export const localizeNewsTitle = (item:NewsItem, _locale:Locale) => item.title
export function localizeNewsArticle(article:NewsArticle, locale:Locale):NewsArticle {
  return {...article,displayLocale:locale,category:newsCopy(locale,article.category),languageLabel:undefined}
}
