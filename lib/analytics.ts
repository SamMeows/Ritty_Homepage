import { captureAttribution } from './attribution'
declare global {
  interface Window {
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
