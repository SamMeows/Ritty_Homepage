import 'server-only'
import type { NewsletterConfiguration } from './newsletter-types'

export const NEWSLETTER_MAX_RECIPIENTS = 500
export const NEWSLETTER_WORKFLOW = 'gmail-newsletter.yml'

export function newsletterOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ritty.sam-meows.com')
  if (url.username || url.password || (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
    throw new Error('Invalid newsletter site origin')
  }
  return url.origin
}

export function newsletterSigningSecret() {
  const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET || ''
  if (secret.length < 32) throw new Error('A stable MARKETING_UNSUBSCRIBE_SECRET of at least 32 characters is required')
  return secret
}

export function newsletterConfiguration(): NewsletterConfiguration {
  const required = ['NOTION_TOKEN', 'NOTION_PRE_REGISTER_DB_ID', 'NEWSLETTER_QUEUE_PAGE_ID',
    'NEWSLETTER_FROM_EMAIL', 'NEWSLETTER_GITHUB_TOKEN']
  const missing = required.filter(key => !process.env[key]?.trim())
  if ((process.env.MARKETING_UNSUBSCRIBE_SECRET || '').length < 32) missing.push('MARKETING_UNSUBSCRIBE_SECRET')
  const enabled = process.env.NEWSLETTER_ENABLED === 'true'
  return { ready: missing.length === 0 && enabled, missing, sender: process.env.NEWSLETTER_FROM_EMAIL || '', enabled }
}

export function newsletterId(id: string) {
  const normalized = id.replace(/-/g, '').toLowerCase()
  if (!/^[a-f0-9]{32}$/.test(normalized)) throw new Error('Invalid newsletter identifier')
  return normalized
}
