declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void
  }
}

export type PreRegisterSource = 'hero' | 'floating' | 'link'

const getUtmParams = () => {
  const urlParams = new URLSearchParams(window.location.search)
  return {
    utm_source: urlParams.get('utm_source') || 'direct',
    utm_medium: urlParams.get('utm_medium') || 'none',
    utm_campaign: urlParams.get('utm_campaign') || 'none',
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
