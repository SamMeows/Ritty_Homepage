export const NEWSLETTER_LOCALES = ['kr', 'en', 'ja', 'zh-tw'] as const
export type NewsletterLocale = (typeof NEWSLETTER_LOCALES)[number]

export type NewsletterBlock = { type: string; text: string; url?: string; children?: NewsletterBlock[] }
export type NewsletterRecipient = { email: string; pageIds: string[]; source: 'notion' | 'manual' }

export type NewsletterDraft = {
  articleId: string
  locale: NewsletterLocale
  title: string
  subject: string
  summary: string
  blocks?: NewsletterBlock[]
  articleUrl: string
  coverUrl?: string
  articleModifiedAt?: string
}

export type NewsletterPreview = {
  draft: NewsletterDraft
  html: string
  candidateCount: number
  approvalToken: string
  expiresAt: string
}

export type DeliveryStatus = 'pending' | 'sending' | 'submitted' | 'failed' | 'unknown' | 'skipped'
export type DeliveryRecord = {
  key: string
  pageIds: string[]
  email: string
  locale: NewsletterLocale
  status: DeliveryStatus
  updatedAt: string
  messageId?: string
  error?: string
  retryable?: boolean
}

export type NewsletterJobStatus = 'queued' | 'sending' | 'completed' | 'attention' | 'duplicate'
export type NewsletterJob = {
  id: string
  key: string
  draft: NewsletterDraft
  approvalToken: string
  approvedAt: string
  approvedBy?: string
  status: NewsletterJobStatus
  createdAt: string
  updatedAt: string
  prepared?: boolean
  error?: string
}

export type NewsletterJobView = NewsletterJob & {
  counts: Record<DeliveryStatus, number>
  total: number
  failures: Array<{ email: string; status: DeliveryStatus; error?: string; retryable?: boolean }>
}

export type NewsletterConfiguration = {
  ready: boolean
  missing: string[]
  sender: string
  enabled: boolean
}
