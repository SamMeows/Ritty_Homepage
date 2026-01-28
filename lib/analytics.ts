declare global {
  interface Window {
    gtag: (
      command: 'event' | 'config' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void
  }
}

export const trackDownloadClick = (
  platform: 'ios' | 'android',
  language: string
) => {
  if (typeof window === 'undefined' || !window.gtag) return

  const urlParams = new URLSearchParams(window.location.search)
  const utmSource = urlParams.get('utm_source') || 'direct'
  const utmMedium = urlParams.get('utm_medium') || 'none'
  const utmCampaign = urlParams.get('utm_campaign') || 'none'

  window.gtag('event', 'download_click', {
    platform,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    full_url: window.location.href,
    language,
  })
}
