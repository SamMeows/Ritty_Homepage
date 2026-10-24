// Landing copy includes inline <br>/<em> tags. Keep those available for phrase
// matching, but never translate CSS hooks, URLs, runtime data, or executable code.
export function translateMarkupCopy(markup: string, translations: Record<string, string>) {
  const protectedValues: string[] = []
  const protect = (value: string) => `\uE000${protectedValues.push(value) - 1}\uE001`
  const copyAttributes = new Set(['alt', 'title', 'aria-label', 'aria-roledescription', 'placeholder'])
  let result = markup.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, protect)
  // The shared text-and-sparkle wordmark is brand artwork, not localized copy.
  result = result.replace(/<span\b[^>]*\bclass=["']official-wordmark["'][^>]*>\s*<span\b[^>]*>[\s\S]*?<\/span>\s*<img\b[^>]*>\s*<\/span>/gi, protect)
  result = result.replace(/(\s[\w:-]+\s*=\s*)(["'])([\s\S]*?)\2/g, (attribute, prefix: string, quote: string, value: string) => {
    const name = prefix.trim().split(/\s*=/)[0].toLowerCase()
    return copyAttributes.has(name) ? attribute : `${prefix}${quote}${protect(value)}${quote}`
  })
  for (const [source, translated] of Object.entries(translations).sort(([a], [b]) => b.length - a.length)) {
    result = result.replaceAll(source, () => translated)
  }
  return result.replace(/\uE000(\d+)\uE001/g, (_, index: string) => protectedValues[Number(index)])
}
