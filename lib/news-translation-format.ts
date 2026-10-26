import type { NewsArticle, NewsBlock } from './news'
export type NewsLocaleTranslation = { title: string; texts: string[] }
export type NewsTranslations = { en: NewsLocaleTranslation; ja: NewsLocaleTranslation }
export type StoredNewsTranslation = { version: 1; sourceHash: string; generatedAt: string; model: string; translations: NewsTranslations }
export const translationPageTitle = (hash: string) => `Ritty translations v1 · ${hash}`
export function articleTexts(article: NewsArticle): string[] {
  const result: string[] = []
  function walk(blocks: NewsBlock[]) {
    for (const block of blocks) {
      if (block.text.trim()) result.push(block.text)
      if (block.children) walk(block.children)
    }
  }
  walk(article.blocks || [])
  return result
}
export function validTranslations(value: unknown, count: number): value is NewsTranslations {
  if (!value || typeof value !== 'object') return false
  return ['en', 'ja'].every(locale => {
    const copy = (value as Record<string, NewsLocaleTranslation>)[locale]
    return copy && typeof copy.title === 'string' && copy.title.trim().length > 0 && copy.title.length <= 500
      && Array.isArray(copy.texts) && copy.texts.length === count
      && copy.texts.every(text => typeof text === 'string' && text.trim().length > 0 && text.length <= 15000)
  })
}
export function applyNewsTranslation(article: NewsArticle, copy: NewsLocaleTranslation, locale: string): NewsArticle {
  let index = 0
  function walk(blocks: NewsBlock[]): NewsBlock[] {
    return blocks.map(block => ({...block, text: block.text.trim() ? copy.texts[index++] : block.text, children: block.children ? walk(block.children) : undefined}))
  }
  return {...article, title: copy.title, blocks: walk(article.blocks || []), contentLanguage: locale, languageLabel: undefined}
}
