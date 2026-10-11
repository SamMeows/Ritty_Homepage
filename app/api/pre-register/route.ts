import { NextResponse } from 'next/server'
import {
  EMAIL_PATTERN,
  MAX_EMAIL_LENGTH,
  PLATFORMS,
  type Platform,
  type PreRegisterResult,
} from '@/lib/pre-register'

// Registrations are stored in a Notion database shared with the integration behind NOTION_TOKEN.
// Required properties: Email (title), Platform (select), Locale (select), Consented At (date),
// Consent Version (text), UTM Source (text), UTM Medium (text), UTM Campaign (text).
const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'
const MAX_NOTION_RETRIES = 2

// Bump whenever the consent wording in the dictionaries changes, so each row records what was agreed to
const CONSENT_VERSION = '2026-10'

type PreRegistration = {
  email: string
  platform: Platform
  locale: 'kr' | 'en'
  isBot: boolean
  utm: { source: string; medium: string; campaign: string }
}

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

function parseRequest(body: unknown): PreRegistration | null {
  if (typeof body !== 'object' || body === null) return null
  const data = body as Record<string, unknown>
  const consents = (data.consents ?? {}) as Record<string, unknown>
  const utm = (data.utm ?? {}) as Record<string, unknown>

  const email = text(data.email, MAX_EMAIL_LENGTH + 1).toLowerCase()
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) return null
  if (!PLATFORMS.includes(data.platform as Platform)) return null
  if (data.locale !== 'kr' && data.locale !== 'en') return null
  if (consents.age !== true || consents.privacy !== true || consents.marketing !== true) return null

  return {
    email,
    platform: data.platform as Platform,
    locale: data.locale,
    // Hidden field that only bots fill in
    isBot: text(data.website, 100) !== '',
    utm: {
      source: text(utm.source, 100),
      medium: text(utm.medium, 100),
      campaign: text(utm.campaign, 100),
    },
  }
}

async function notionRequest(
  path: string,
  payload: unknown,
  token: string,
  attempt = 0
): Promise<{ results?: unknown[] }> {
  const response = await fetch(`${NOTION_API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  // Notion allows about 3 requests per second, so back off and retry when a burst hits the limit
  if (response.status === 429 && attempt < MAX_NOTION_RETRIES) {
    const retryAfter = Math.min(Number(response.headers.get('retry-after')) || 1, 3)
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000))
    return notionRequest(path, payload, token, attempt + 1)
  }

  if (!response.ok) {
    throw new Error(`Notion ${path} failed with ${response.status}: ${await response.text()}`)
  }
  return response.json()
}

const richText = (content: string) => ({ rich_text: content ? [{ text: { content } }] : [] })

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const registration = parseRequest(body)
  if (!registration) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 })
  }

  // Pretend success so bots don't learn they were filtered out
  if (registration.isBot) {
    return NextResponse.json({ status: 'created' satisfies PreRegisterResult })
  }

  const token = process.env.NOTION_TOKEN
  const databaseId = process.env.NOTION_PRE_REGISTER_DB_ID
  if (!token || !databaseId) {
    console.error('Pre-registration is not configured: set NOTION_TOKEN and NOTION_PRE_REGISTER_DB_ID')
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }

  try {
    const existing = await notionRequest(
      `/databases/${databaseId}/query`,
      { filter: { property: 'Email', title: { equals: registration.email } }, page_size: 1 },
      token
    )
    if (existing.results?.length) {
      return NextResponse.json({ status: 'duplicate' satisfies PreRegisterResult })
    }

    await notionRequest(
      '/pages',
      {
        parent: { database_id: databaseId },
        properties: {
          Email: { title: [{ text: { content: registration.email } }] },
          Platform: { select: { name: registration.platform === 'ios' ? 'iOS' : 'Android' } },
          Locale: { select: { name: registration.locale } },
          'Consented At': { date: { start: new Date().toISOString() } },
          'Consent Version': richText(CONSENT_VERSION),
          'UTM Source': richText(registration.utm.source),
          'UTM Medium': richText(registration.utm.medium),
          'UTM Campaign': richText(registration.utm.campaign),
        },
      },
      token
    )
    return NextResponse.json({ status: 'created' satisfies PreRegisterResult })
  } catch (error) {
    console.error('Pre-registration failed', error)
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
