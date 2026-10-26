import type { Locale } from '@/lib/i18n/dictionaries'
import { newsListPath } from '@/lib/news-languages'
export default function NewsLanguageLinks({locale,alternatePaths={}}:{locale:Locale;alternatePaths?:Partial<Record<Locale,string>>}) {
  const labels={kr:'한국어',en:'English',ja:'日本語','zh-tw':'繁體中文'}
  return <nav className="news-language-links" aria-label="Language">{(['kr','en','ja','zh-tw'] as const).map(code=><a key={code} href={alternatePaths[code] || newsListPath(code)} hrefLang={code==='kr'?'ko':code==='zh-tw'?'zh-TW':code} aria-current={code===locale?'page':undefined}>{labels[code]}</a>)}</nav>
}
