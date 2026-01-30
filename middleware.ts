import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip for static files and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files like favicon.png, sitemap.xml
  ) {
    return NextResponse.next()
  }

  // Redirect /kr to / (301 permanent redirect for SEO)
  if (pathname === '/kr' || pathname.startsWith('/kr/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/kr/, '') || '/'
    return NextResponse.redirect(url, 301)
  }

  // /en routes - pass through to [locale] handler
  if (pathname === '/en' || pathname.startsWith('/en/')) {
    return NextResponse.next()
  }

  // Root and other paths - rewrite to /kr internally (no redirect)
  const url = request.nextUrl.clone()
  url.pathname = `/kr${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
