import type { NewsletterBlock, NewsletterDraft } from './newsletter-types'
import { NEWSLETTER_BRAND } from './newsletter-brand'

type EmailOptions = {
  unsubscribeUrl: string
  companyName?: string
  contactEmail?: string
  companyAddress?: string
}

const copy = {
  kr: {
    lang: 'ko', action: '리티 홈페이지 방문하기',
    reason: '리티의 개발 소식 수신에 동의하신 분께 보내드리는 이메일입니다.',
    unsubscribe: '이메일 수신거부', reservation: '이메일 수신을 중단해도 사전예약은 유지됩니다.',
    contact: '문의',
  },
  en: {
    lang: 'en', action: 'Visit Ritty',
    reason: 'You are receiving this email because you agreed to receive updates from Ritty.',
    unsubscribe: 'Unsubscribe', reservation: 'Unsubscribing from emails does not cancel your preregistration.',
    contact: 'Contact',
  },
  ja: {
    lang: 'ja', action: 'リティのホームページへ',
    reason: 'リティの開発情報の受信に同意された方にお送りしています。',
    unsubscribe: 'メール配信停止', reservation: 'メールの配信を停止しても、事前登録は維持されます。',
    contact: 'お問い合わせ',
  },
  'zh-tw': {
    lang: 'zh-TW', action: '前往 Ritty 官網',
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
        html.push(`<div style="margin:24px 0;"><img src="${escapeHtml(url)}" alt="${escapeHtml(block.text)}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;">${content ? `<p style="font-size:12px;color:#9581aa;line-height:1.6;">${content}</p>` : ''}</div>`)
        text.push([block.text, url].filter(Boolean).join('\n'))
      }
    } else if (block.type === 'divider') {
      html.push('<hr style="border:0;border-top:1px solid #ddd2ed;margin:24px 0;">')
      text.push('---')
    } else if (/^heading_[123]$/.test(block.type)) {
      const tag = block.type === 'heading_1' ? 'h2' : 'h3'
      html.push(`<${tag} style="margin:32px 0 16px;font-size:22px;line-height:1.6;color:#49375f;">${content}</${tag}>`)
      text.push(block.text)
    } else if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
      const tag = block.type === 'numbered_list_item' ? 'ol' : 'ul'
      // Adjacent list items share their container so numbered lists count correctly.
      const previous = html[html.length - 1]
      const item = `<li style="margin:8px 0;">${content}${children.html}</li>`
      if (previous?.endsWith(`</${tag}>`)) html[html.length - 1] = previous.slice(0, -(`</${tag}>`.length)) + item + `</${tag}>`
      else html.push(`<${tag} style="padding-left:24px;font-size:15px;line-height:2;color:#625571;">${item}</${tag}>`)
      text.push(`${block.type === 'numbered_list_item' ? '1.' : '•'} ${block.text}`, children.text)
      continue
    } else if (block.type === 'quote' || block.type === 'callout') {
      html.push(`<blockquote style="margin:20px 0;padding:12px 18px;border-left:3px solid #b7a5d1;background:#eee7f7;line-height:1.8;">${content}</blockquote>`)
      text.push(block.text)
    } else if (block.type === 'code') {
      html.push(`<pre style="white-space:pre-wrap;word-break:break-word;background:#eee7f7;padding:16px;line-height:1.6;">${escapeHtml(block.text)}</pre>`)
      text.push(block.text)
    } else {
      if (content) html.push(`<p style="margin:0 0 16px;font-size:15px;line-height:2;color:#625571;">${content}</p>`)
      if (url) html.push(`<p style="margin:0 0 16px;line-height:1.8;word-break:break-all;"><a href="${escapeHtml(url)}" style="color:#7861b9;">${escapeHtml(url)}</a></p>`)
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
  const logoUrl = new URL('/ritty/newsletter-logo-white.png', articleUrl).href
  const skyUrl = new URL('/ritty/newsletter-sky.png', articleUrl).href
  const unsubscribeUrl = httpsUrl(options.unsubscribeUrl, 'unsubscribe URL')
  const coverUrl = draft.coverUrl ? httpsUrl(draft.coverUrl, 'cover URL') : undefined
  const companyName = options.companyName?.trim() || NEWSLETTER_BRAND.company
  const companyAddress = options.companyAddress?.trim() || NEWSLETTER_BRAND.address
  const contactEmail = options.contactEmail?.trim() || NEWSLETTER_BRAND.contact
  if (contactEmail && !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(contactEmail)) {
    throw new Error('Invalid contact email')
  }
  const contactText = contactEmail ? `${labels.contact}: ${contactEmail}` : ''
  const escapedTitle = escapeHtml(draft.title)
  const paragraphs = draft.summary.trim().split(/\r?\n\s*\r?\n/).filter(Boolean)
    .map(paragraph => `<p style="margin:0 0 16px;font-size:15px;line-height:2;color:#625571;">${escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`).join('')
  const cover = coverUrl
    ? `<tr><td style="padding:0;"><img src="${escapeHtml(coverUrl)}" alt="${escapedTitle}" width="640" style="display:block;width:100%;max-width:640px;height:auto;border:0;"></td></tr>`
    : ''
  const body = renderBlocks(draft.blocks || [])
  const preheader = escapeHtml((draft.summary || draft.blocks?.find(block => block.text)?.text || draft.title).slice(0, 120))
  const html = `<!doctype html>
<html lang="${labels.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapedTitle}</title>
<style>@media only screen and (max-width:480px){.letter-outer{padding:12px 8px!important}.letter-gutter{padding-left:24px!important;padding-right:24px!important}.letter-title{font-size:27px!important}.letter-header{padding-top:28px!important;padding-bottom:26px!important}}</style></head>
<body style="margin:0;padding:0;color:#49375f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td class="letter-outer" align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f8f6fe" style="max-width:640px;background:#f8f6fe;border:1px solid #74639a;border-radius:20px;">
<tr><td class="letter-gutter letter-header" background="${escapeHtml(skyUrl)}" bgcolor="#25234d" style="padding:30px 40px;background:#25234d url('${escapeHtml(skyUrl)}') center center / cover no-repeat;border-radius:19px 19px 0 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td valign="middle"><a href="${escapeHtml(new URL('/', articleUrl).href)}" style="text-decoration:none;"><img src="${escapeHtml(logoUrl)}" alt="Ritty" width="132" height="60" style="display:block;width:132px;height:auto;border:0;color:#ffffff;font-size:32px;"></a></td><td width="106" align="right" valign="middle"><span style="display:inline-block;padding:8px 12px;border:1px solid #c8b7eb;border-radius:999px;font-size:9px;letter-spacing:1.2px;line-height:1.8;font-weight:700;color:#ffffff;background:#7560a6;white-space:nowrap;">DEV LETTER</span></td></tr></table>
</td></tr>
${cover}
<tr><td class="letter-gutter" style="padding:34px 40px 38px;word-break:break-word;overflow-wrap:anywhere;">
<h1 class="letter-title" style="margin:0 0 28px;font-size:32px;line-height:1.5;letter-spacing:-1px;font-weight:750;color:#49375f;">${escapedTitle}</h1>${paragraphs}${body.html}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:34px 0 0;border-top:1px solid #ddd2ed;"><tr><td style="padding-top:26px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#9b79d9" style="border:2px solid #d9c7ff;border-radius:999px;background:#9b79d9;"><a href="${escapeHtml(articleUrl)}" style="display:inline-block;padding:14px 24px;border-radius:999px;color:#ffffff;font-size:14px;line-height:1.6;font-weight:bold;text-decoration:none;">${escapeHtml(labels.action)} &nbsp;↗</a></td></tr></table></td></tr></table>
</td></tr>
<tr><td class="letter-gutter" style="padding:28px 40px 30px;background:#eee7f7;border-top:1px solid #ddd2ed;border-radius:0 0 16px 16px;font-size:11px;line-height:1.9;color:#877794;">
<p style="margin:0 0 14px;font-size:12px;font-weight:700;color:#66517e;">${escapeHtml(companyName)}</p>
<p style="margin:0 0 16px;">${escapeHtml(companyAddress)}<br>${escapeHtml(labels.contact)} &nbsp;<a href="mailto:${escapeHtml(contactEmail)}" style="color:#7861b9;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(contactEmail)}</a></p>
<p style="margin:0 0 14px;">${escapeHtml(labels.reason)}<br>${escapeHtml(labels.reservation)}</p>
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#806a99;text-decoration:underline;text-underline-offset:3px;">${escapeHtml(labels.unsubscribe)}</a>
</td></tr></table><!--[if mso]></td></tr></table><![endif]-->
<p style="margin:18px 0 0;font-size:9px;letter-spacing:1.5px;color:#a89ac3;">RITTY · SAM-MEOWS</p>
</td></tr></table></body></html>`
  const text = [draft.title, draft.summary.trim(), body.text, `${labels.action}: ${articleUrl}`,
    labels.reason, labels.reservation, companyName, companyAddress, contactText,
    `${labels.unsubscribe}: ${unsubscribeUrl}`].filter(Boolean).join('\n\n')
  return { html, text }
}
