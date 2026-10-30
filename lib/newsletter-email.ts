import type { NewsletterDraft } from './newsletter-types'

type EmailOptions = {
  unsubscribeUrl: string
  companyName?: string
  contactEmail?: string
  companyAddress?: string
}

const copy = {
  kr: {
    lang: 'ko', eyebrow: '리티 개발 소식', action: '홈페이지에서 이어 읽기',
    reason: '리티의 개발 소식 수신에 동의하신 분께 보내드리는 이메일입니다.',
    unsubscribe: '이메일 수신거부', reservation: '이메일 수신을 중단해도 사전예약은 유지됩니다.',
    contact: '문의',
  },
  en: {
    lang: 'en', eyebrow: 'Ritty Development Update', action: 'Read the full update',
    reason: 'You are receiving this email because you agreed to receive updates from Ritty.',
    unsubscribe: 'Unsubscribe', reservation: 'Unsubscribing from emails does not cancel your preregistration.',
    contact: 'Contact',
  },
  ja: {
    lang: 'ja', eyebrow: 'リティ開発だより', action: 'ホームページで続きを読む',
    reason: 'リティの開発情報の受信に同意された方にお送りしています。',
    unsubscribe: 'メール配信停止', reservation: 'メールの配信を停止しても、事前登録は維持されます。',
    contact: 'お問い合わせ',
  },
  'zh-tw': {
    lang: 'zh-TW', eyebrow: 'Ritty 開發消息', action: '前往官網閱讀完整消息',
    reason: '您收到這封郵件，是因為您已同意接收 Ritty 的開發消息。',
    unsubscribe: '取消訂閱', reservation: '取消訂閱郵件不會影響您的事前登錄。',
    contact: '聯絡我們',
  },
} as const

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]!)
}

/** URLs are rendered as links/images, never fetched by this renderer. */
function httpsUrl(value: string, field: string): string {
  if (/[\u0000-\u0020\u007f]/.test(value)) throw new Error(`Invalid ${field}`)
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error(`Invalid ${field}`)
  return url.href
}

export function renderNewsletterEmail(draft: NewsletterDraft, options: EmailOptions): { html: string; text: string } {
  const labels = copy[draft.locale]
  if (!labels) throw new Error('Unsupported newsletter language')
  if (!draft.title.trim() || !draft.summary.trim()) throw new Error('Newsletter title and summary are required')
  const articleUrl = httpsUrl(draft.articleUrl, 'article URL')
  const unsubscribeUrl = httpsUrl(options.unsubscribeUrl, 'unsubscribe URL')
  const coverUrl = draft.coverUrl ? httpsUrl(draft.coverUrl, 'cover URL') : undefined
  const companyName = options.companyName?.trim() || '삼냥이즈 · Sam-Meows Inc.'
  const companyAddress = options.companyAddress?.trim()
  const contactEmail = options.contactEmail?.trim()
  if (contactEmail && !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(contactEmail)) {
    throw new Error('Invalid contact email')
  }
  const contactText = contactEmail ? `${labels.contact}: ${contactEmail}` : ''
  const escapedTitle = escapeHtml(draft.title)
  const paragraphs = draft.summary.trim().split(/\r?\n\s*\r?\n/)
    .map(paragraph => `<p style="margin:0 0 16px;line-height:1.8;color:#374151;">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('')
  const cover = coverUrl
    ? `<tr><td><img src="${escapeHtml(coverUrl)}" alt="${escapedTitle}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`
    : ''
  const html = `<!doctype html>
<html lang="${labels.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f7fb;font-family:Arial,'Apple SD Gothic Neo','Noto Sans',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e6edf5;border-radius:16px;overflow:hidden;">
<tr><td style="padding:30px 32px 24px;"><div style="font-size:24px;font-weight:800;letter-spacing:2px;color:#427fd6;">RITTY</div><p style="margin:12px 0 0;font-size:13px;color:#66758b;">${escapeHtml(labels.eyebrow)}</p></td></tr>
${cover}
<tr><td style="padding:30px 32px;word-break:break-word;"><h1 style="margin:0 0 24px;font-size:26px;line-height:1.45;color:#1f2937;">${escapedTitle}</h1>${paragraphs}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 4px;"><tr><td bgcolor="#427fd6" style="border-radius:8px;"><a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#427fd6;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(labels.action)}</a></td></tr></table></td></tr>
<tr><td style="padding:24px 32px;background:#f8fafc;font-size:12px;line-height:1.7;color:#64748b;">
<p style="margin:0 0 12px;">${escapeHtml(labels.reason)}<br>${escapeHtml(labels.reservation)}</p>
<p style="margin:0 0 12px;">${escapeHtml(companyName)}${companyAddress ? `<br>${escapeHtml(companyAddress)}` : ''}${contactEmail ? `<br>${escapeHtml(labels.contact)}: <a href="mailto:${escapeHtml(contactEmail)}" style="color:#526881;">${escapeHtml(contactEmail)}</a>` : ''}</p>
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#526881;text-decoration:underline;">${escapeHtml(labels.unsubscribe)}</a>
</td></tr></table></td></tr></table></body></html>`
  const text = [labels.eyebrow, draft.title, draft.summary.trim(), `${labels.action}: ${articleUrl}`,
    labels.reason, labels.reservation, companyName, companyAddress, contactText,
    `${labels.unsubscribe}: ${unsubscribeUrl}`].filter(Boolean).join('\n\n')
  return { html, text }
}
