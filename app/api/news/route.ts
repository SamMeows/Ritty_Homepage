import { NextResponse } from 'next/server'
import { getNews } from '@/lib/news'
export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get('cursor') || undefined
  if (cursor && !/^[a-zA-Z0-9_-]{1,200}$/.test(cursor)) return NextResponse.json({error:'invalid cursor'},{status:400})
  const requestedLocale = new URL(request.url).searchParams.get('locale')
  const locale = requestedLocale === 'en' || requestedLocale === 'ja' || requestedLocale === 'zh-tw' ? requestedLocale : 'kr'
  const result = await getNews(cursor,locale)
  return NextResponse.json(result, { status: result.unavailable ? 503 : 200 })
}
