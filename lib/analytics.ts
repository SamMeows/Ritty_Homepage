import { captureAttribution } from './attribution'
declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag: (
      command: 'event' | 'config' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void
  }
}

export type PreRegisterSource = 'hero' | 'floating' | 'link' | 'landing'

const getUtmParams = () => {
  const entry = captureAttribution()
  return {
    utm_source: entry.source || 'direct',
    utm_medium: entry.medium || 'none',
    utm_campaign: entry.campaign || 'none',
    utm_content: entry.content || 'none',
    utm_term: entry.term || 'none',
    landing_variant: entry.variant,
    landing_path: entry.landingPath,
  }
}

export const trackDownloadClick = (
  platform: 'ios' | 'android',
  language: string
) => {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'download_click', {
    platform,
    ...getUtmParams(),
    full_url: window.location.href,
    language,
  })
}

export const trackPreRegisterOpen = (
  source: PreRegisterSource,
  language: string
) => {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'pre_register_open', {
    source,
    ...getUtmParams(),
    language,
  })
}

// GA4 recommended lead event, sent only for new registrations
export const trackPreRegisterComplete = (
  platform: 'ios' | 'android',
  language: string
) => {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'generate_lead', {
    lead_source: 'pre_register',
    platform,
    ...getUtmParams(),
    language,
  })
}

// Queue events even when the afterInteractive GA bootstrap has not run yet.
// Only fixed funnel labels and sanitized attribution are sent; never form values.
export function trackRegistrationFunnel(
  event: 'landing_view' | 'pre_register_start' | 'pre_register_submit' | 'pre_register_error' | 'pre_register_duplicate',
  language: string,
  details: { form?: 'inline' | 'modal'; reason?: 'email' | 'platform' | 'consent' | 'server' } = {}
) {
  if (typeof window === 'undefined') return
  if (!window.gtag) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () { window.dataLayer!.push(arguments) }
  }
  window.gtag('event', event, { ...getUtmParams(), language, ...details })
}
