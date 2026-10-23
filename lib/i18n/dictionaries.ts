import 'server-only'
import { notFound } from 'next/navigation'

export type Locale = 'kr' | 'en'

const dictionaries = {
  kr: () => import('./dictionaries/kr.json').then((module) => module.default),
  en: () => import('./dictionaries/en.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => {
  if (locale !== 'kr' && locale !== 'en') notFound()
  return dictionaries[locale]()
}

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>
