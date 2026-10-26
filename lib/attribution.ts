import { isAdVariant } from './ad-variants'

export type Attribution = {
  variant: string
  landingPath: string
  referrer: string
  source: string
  medium: string
  campaign: string
  content: string
  term: string
}
const KEY = 'ritty-ad-entry-v1'
const limit = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''
export function cleanAttribution(input: unknown): Attribution {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const path = limit(data.landingPath, 300).split(/[?#]/)[0]
  const match = path.match(/^\/(?:(?:kr|en|ja|zh-tw)\/)?ad\/([^/]+)\/?$/)
  const variant = match && isAdVariant(match[1]) ? match[1] : 'main'
  let referrer = ''
  try { const url = new URL(limit(data.referrer, 1000)); if (['http:', 'https:'].includes(url.protocol)) referrer = url.origin } catch {}
  return {
    variant, landingPath: path.startsWith('/') && !path.startsWith('//') ? path : '/', referrer,
    source: limit(data.source), medium: limit(data.medium), campaign: limit(data.campaign),
    content: limit(data.content), term: limit(data.term),
  }
}

// A different ad link starts a new attribution window. Internal navigation keeps that entry.
export function resolveAttribution(url: URL, referrer: string, saved?: Attribution): Attribution {
  const params = url.searchParams
  const current = cleanAttribution({
    landingPath: url.pathname, referrer,
    ...Object.fromEntries(['source','medium','campaign','content','term'].map(key => [key, params.get('utm_' + key)])),
  })
  const tagged = ['source','medium','campaign','content','term'].some(key => params.has('utm_' + key))
  if (tagged || (current.variant !== 'main' && current.variant !== saved?.variant)) return current
  return saved ? cleanAttribution(saved) : current
}

export function captureAttribution(): Attribution {
  const url = new URL(window.location.href)
  let saved: Attribution | undefined
  try { const raw = sessionStorage.getItem(KEY); if (raw) saved = JSON.parse(raw) } catch {}
  const entry = resolveAttribution(url, document.referrer, saved)
  try { sessionStorage.setItem(KEY, JSON.stringify(entry)) } catch {}
  return entry
}
