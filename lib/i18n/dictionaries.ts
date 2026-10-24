import 'server-only'
import { notFound } from 'next/navigation'

export type Locale = 'kr' | 'en' | 'ja' | 'zh-tw'

const dictionaries = {
  kr: () => import('./dictionaries/kr.json').then((module) => module.default),
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  ja: () => import('./dictionaries/ja.json').then((module) => module.default),
  'zh-tw': () => import('./dictionaries/zh-tw.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => {
  if (locale !== 'kr' && locale !== 'en' && locale !== 'ja' && locale !== 'zh-tw') notFound()
  return dictionaries[locale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
