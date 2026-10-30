import type { NewsletterBlock, NewsletterDraft } from './newsletter-types'

type EmailOptions = {
  unsubscribeUrl: string
  companyName?: string
  contactEmail?: string
  companyAddress?: string
}

const copy = {
  kr: {
    lang: 'ko', eyebrow: '리티 개발 소식', action: '홈페이지에서 보기',
    reason: '리티의 개발 소식 수신에 동의하신 분께 보내드리는 이메일입니다.',
    unsubscribe: '이메일 수신거부', reservation: '이메일 수신을 중단해도 사전예약은 유지됩니다.',
    contact: '문의',
  },
  en: {
    lang: 'en', eyebrow: 'Ritty Development Update', action: 'View on our website',
    reason: 'You are receiving this email because you agreed to receive updates from Ritty.',
    unsubscribe: 'Unsubscribe', reservation: 'Unsubscribing from emails does not cancel your preregistration.',
    contact: 'Contact',
  },
  ja: {
    lang: 'ja', eyebrow: 'リティ開発だより', action: 'ホームページで見る',
    reason: 'リティの開発情報の受信に同意された方にお送りしています。',
    unsubscribe: 'メール配信停止', reservation: 'メールの配信を停止しても、事前登録は維持されます。',
    contact: 'お問い合わせ',
  },
  'zh-tw': {
    lang: 'zh-TW', eyebrow: 'Ritty 開發消息', action: '在官網查看',
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

function renderBlocks(blocks: NewsletterBlock[]): { html: string; text: string } {
  const html: string[] = [], text: string[] = []
  for (const block of blocks) {
    const content = escapeHtml(block.text).replace(/\r?\n/g, '<br>')
    const url = block.url ? httpsUrl(block.url, 'content URL') : undefined
    const children = renderBlocks(block.children || [])
    if (block.type === 'image') {
      if (url) {
        html.push(`<div style="margin:24px 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(block.text)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;">${content ? `<p style="font-size:12px;color:#66758b;line-height:1.6;">${content}</p>` : ''}</div>`)
        text.push([block.text, url].filter(Boolean).join('\n'))
      }
    } else if (block.type === 'divider') {
      html.push('<hr style="border:0;border-top:1px solid #e6edf5;margin:24px 0;">')
      text.push('---')
    } else if (/^heading_[123]$/.test(block.type)) {
      const tag = block.type === 'heading_1' ? 'h2' : 'h3'
      html.push(`<${tag} style="margin:28px 0 16px;line-height:1.5;color:#1f2937;">${content}</${tag}>`)
      text.push(block.text)
    } else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const tag = block.type === 'numbered_list_item' ? 'ol' : 'ul'
      // Adjacent list items share their container so numbered lists count correctly.
      const previous = html[html.length - 1]
      const item = `<li style="margin:8px 0;">${content}${children.html}</li>`
      if (previous?.endsWith(`</${tag}>`)) html[html.length - 1] = previous.slice(0, -(`</${tag}>`.length)) + item + `</${tag}>`
      else html.push(`<${tag} style="padding-left:24px;line-height:1.8;color:#374151;">${item}</${tag}>`)
      text.push(`${block.type === 'numbered_list_item' ? '1.' : '•'} ${block.text}`, children.text)
      continue
    } else if (block.type === 'quote' || block.type === 'callout') {
      html.push(`<blockquote style="margin:20px 0;padding:12px 18px;border-left:3px solid #a9c7ef;background:#f8fafc;line-height:1.8;">${content}</blockquote>`)
      text.push(block.text)
    } else if (block.type === 'code') {
      html.push(`<pre style="white-space:pre-wrap;word-break:break-word;background:#f8fafc;padding:16px;line-height:1.6;">${escapeHtml(block.text)}</pre>`)
      text.push(block.text)
    } else {
      if (content) html.push(`<p style="margin:0 0 16px;line-height:1.8;color:#374151;">${content}</p>`)
      if (url) html.push(`<p style="margin:0 0 16px;line-height:1.8;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#427fd6;">${escapeHtml(url)}</a></p>`)
      text.push(block.text, url || '')
    }
    html.push(children.html)
    text.push(children.text)
  }
  return { html: html.join(''), text: text.filter(Boolean).join('\n\n') }
}

export function renderNewsletterEmail(draft: NewsletterDraft, options: EmailOptions): { html: string; text: string } {
  const labels = copy[draft.locale]
  if (!labels) throw new Error('Unsupported newsletter language')
  if (!draft.title.trim() || (!draft.blocks && !draft.summary.trim())) throw new Error('Newsletter title and content are required')
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
  const paragraphs = draft.summary.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)
    .map(paragraph => `<p style="margin:0 0 16px;line-height:1.8;color:#374151;">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('')
  const cover = coverUrl
    ? `<tr><td><img src="${escapeHtml(coverUrl)}" alt="${escapedTitle}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>`
    : ''
  const body = renderBlocks(draft.blocks || [])
  const html = `<!doctype html>
<html lang="${labels.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapedTitle}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f7fb;font-family:Arial,'Apple SD Gothic Neo','Noto Sans',sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e6edf5;border-radius:16px;overflow:hidden;">
<tr><td style="padding:30px 32px 24px;"><div style="font-size:24px;font-weight:800;letter-spacing:2px;color:#427fd6;">RITTY</div><p style="margin:12px 0 0;font-size:13px;color:#66758b;">${escapeHtml(labels.eyebrow)}</p></td></tr>
${cover}
<tr><td style="padding:30px 32px;word-break:break-word;"><h1 style="margin:0 0 24px;font-size:26px;line-height:1.45;color:#1f2937;">${escapedTitle}</h1>${paragraphs}${body.html}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 4px;"><tr><td bgcolor="#427fd6" style="border-radius:8px;"><a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#427fd6;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">${escapeHtml(labels.action)}</a></td></tr></table></td></tr>
<tr><td style="padding:24px 32px;background:#f8fafc;font-size:12px;line-height:1.7;color:#64748b;">
<p style="margin:0 0 12px;">${escapeHtml(labels.reason)}<br>${escapeHtml(labels.reservation)}</p>
<p style="margin:0 0 12px;">${escapeHtml(companyName)}${companyAddress ? `<br>${escapeHtml(companyAddress)}` : ''}${contactEmail ? `<br>${escapeHtml(labels.contact)}: <a href="mailto:${escapeHtml(contactEmail)}" style="color:#526881;">${escapeHtml(contactEmail)}</a>` : ''}</p>
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#526881;text-decoration:underline;">${escapeHtml(labels.unsubscribe)}</a>
</td></tr></table></td></tr></table></body></html>`
  const text = [labels.eyebrow, draft.title, draft.summary.trim(), body.text, `${labels.action}: ${articleUrl}`,
    labels.reason, labels.reservation, companyName, companyAddress, contactText,
    `${labels.unsubscribe}: ${unsubscribeUrl}`].filter(Boolean).join('\n\n')
  return { html, text }
}
