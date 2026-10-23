import { NextResponse } from 'next/server'
import { getNewsArticle, validNewsId } from '@/lib/news'

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  const {id} = await params
  if (!validNewsId(id)) return NextResponse.json({error: 'invalid id'}, {status: 400})
  try {
    const article = await getNewsArticle(id)
    return article ? NextResponse.json(article, {headers: {'Cache-Control': 'no-store'}})
      : NextResponse.json({error: 'not found'}, {status: 404})
  } catch {
    return NextResponse.json({error: 'unavailable'}, {status: 503})
  }
}
