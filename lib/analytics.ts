import { cleanAttribution, captureAttribution } from './attribution'
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag: (command: 'event' | 'config' | 'js', targetId: string | Date, params?: Record<string, unknown>) => void
  }
}
export type PreRegisterSource = 'hero' | 'floating' | 'link' | 'landing'
export const FUNNEL_VERSION = '2026-10-26-v1'
type FunnelEvent = 'landing_view' | 'pre_register_start' | 'pre_register_submit' | 'pre_register_error' | 'pre_register_duplicate' | 'pre_register_result' | 'pre_register_complete_view' | 'news_section_view' | 'news_card_click' | 'news_load_success' | 'news_load_error'
type Details = { form?: 'inline' | 'modal'; reason?: 'email' | 'platform' | 'consent' | 'server'; article_id?: string; status?: 'created' | 'duplicate' | 'error' }
export function isRegistrationTest() {
  try {
    const params = new URL(window.location.href).searchParams
    if (params.get('registration_test') === '1') {
      try { sessionStorage.setItem('ritty-registration-test', '1') } catch {}
      return true
    }
    return sessionStorage.getItem('ritty-registration-test') === '1'
  } catch { return false }
}
// No analytics dependency may affect application control flow. Never send form values or raw URLs.
function emit(event: string, language: string, details: Record<string, unknown> = {}) {
  try {
    if (typeof window === 'undefined' || isRegistrationTest()) return
    const entry = captureAttribution()
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || []
      window.gtag = function () { window.dataLayer!.push(arguments) }
    }
    window.gtag('event', event, {
      language, page_language: language, funnel_version: FUNNEL_VERSION, cta_copy_variant: new URL(window.location.href).searchParams.get('cta_copy') === 'launch-email-v1' ? 'launch-email-v1' : 'original',
      landing_variant: window.location.pathname ? cleanAttribution({landingPath: window.location.pathname}).variant : entry.variant,
      landing_path: window.location.pathname || entry.landingPath,
      utm_source: entry.source || 'direct', utm_medium: entry.medium || 'none',
      utm_campaign: entry.campaign || 'none', utm_content: entry.content || 'none', utm_term: entry.term || 'none',
      ...details,
    })
  } catch { /* Analytics is best effort. */ }
}
export const trackDownloadClick = (platform: 'ios' | 'android', language: string) => emit('download_click', language, { platform })
// Existing CTA event remains the single event for this action.
export const trackPreRegisterOpen = (source: PreRegisterSource, language: string) => emit('pre_register_open', language, { source })
export const trackPreRegisterComplete = (platform: 'ios' | 'android', language: string) => emit('generate_lead', language, { lead_source: 'pre_register', platform })
export function trackRegistrationFunnel(event: FunnelEvent, language: string, details: Details = {}) { emit(event, language, details) }
