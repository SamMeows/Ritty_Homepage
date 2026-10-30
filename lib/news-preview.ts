import { formatNewsDate, newsListPath } from './news-languages'
import { localizeNewsTitle } from './i18n/news-articles'
import type { NewsPage } from './news'
import type { Locale } from './i18n/dictionaries'
import { newsCopy } from './i18n/news-copy'

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[char]!))

// Mirrors NewsFeed's initial featured view. A parity check compares this with
// React's output so the server preview and interactive feed cannot drift.
export function newsPreviewMarkup(data: NewsPage, locale: Locale): string {
  const t = (value: string) => escape(newsCopy(locale, value))
  const [featured, ...rest] = data.items
  const meta = (item: NewsPage['items'][number]) => `<div class="news-meta"><span>${t(item.category)}</span><time dateTime="${escape(item.date)}">${escape(formatNewsDate(item.date,locale))}</time></div>`
  const href = (id: string) => `${newsListPath(locale)}/${escape(id)}`
  const art = featured?.cover ? `<img src="${escape(featured.cover)}" alt=""/>` : '<span class="official-wordmark"><span>Ritty</span><img src="/images/logo-sparkle.svg" alt="" width="27" height="28"/></span><span aria-hidden="true">NEWS</span>'
  return '<div class="news-board">'
    + `<div class="news-filters" aria-label="${t('소식 분류')}">${['전체', '공지사항', '개발 소식', '팀 레터'].map(name => `<button type="button" aria-pressed="${name === '전체'}">${t(name)}</button>`).join('')}</div>`
    + (featured ? `<div class="news-grid"><a class="news-feature" href="${href(featured.id)}"><div class="news-feature-art">${art}</div><div class="news-feature-copy">${meta(featured)}<h3>${escape(localizeNewsTitle(featured, locale))}</h3><span class="news-read">${t('읽어보기 →')}</span></div></a>${rest.length ? `<div class="news-rows">${rest.map(item => `<a href="${href(item.id)}">${meta(item)}<h3>${escape(localizeNewsTitle(item, locale))}</h3><span aria-hidden="true">→</span></a>`).join('')}</div>` : ''}</div>` : `<p class="news-empty" role="status">${t(data.unavailable ? '소식을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : '등록된 소식이 아직 없어요.')}</p>`)
    + (data.cursor || data.unavailable ? `<button class="news-more glass">${t(data.unavailable ? '다시 시도' : '소식 더 보기 ↓')}</button>` : '')
    + '</div>'
}
