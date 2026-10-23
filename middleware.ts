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

  // News is currently Korean only. Consolidate untranslated duplicate URLs.
  if (pathname === '/en/news' || pathname.startsWith('/en/news/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice(3)
    return NextResponse.redirect(url, 301)
  }

  // Set the document language on the server, including the initial HTML response.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-ritty-language', pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'ko')

  // Internal Korean route mapping lives in next.config.js, after middleware.
  // Keeping it there avoids re-entering the /kr canonical redirect for dynamic pages.
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
