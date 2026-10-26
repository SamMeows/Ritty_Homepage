import { localizeNewsArticle } from '@/lib/i18n/news-articles'
import type { Locale } from '@/lib/i18n/dictionaries'
import { NextResponse } from 'next/server'
import { getNewsArticle, validNewsId } from '@/lib/news'

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  const requestedLocale = new URL(_request.url).searchParams.get('locale')
  const locale: Locale = requestedLocale === 'en' || requestedLocale === 'ja' || requestedLocale === 'zh-tw' ? requestedLocale : 'kr'
  if (!validNewsId(id)) return NextResponse.json({error: 'invalid id'}, {status: 400})
  try {
    const article = await getNewsArticle(id,locale)
    return article ? NextResponse.json(localizeNewsArticle(article, locale), {headers: {'Cache-Control': 'no-store'}})
      : NextResponse.json({error: 'not found'}, {status: 404})
  } catch {
    return NextResponse.json({error: 'unavailable'}, {status: 503})
  }
}
