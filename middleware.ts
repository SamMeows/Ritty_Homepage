import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAdVariant } from './lib/ad-variants'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestHeaders = new Headers(request.headers)
  const privateRoute = pathname === '/admin/newsletter' || pathname.startsWith('/admin/newsletter/')
    || pathname === '/unsubscribe' || pathname.startsWith('/unsubscribe/')
    || pathname === '/api/admin/newsletter' || pathname.startsWith('/api/admin/newsletter/')
    || pathname === '/api/marketing/unsubscribe'
  // Always overwrite the browser's value; this flag only controls rendering, never authorization.
  requestHeaders.set('x-ritty-private-route', privateRoute ? '1' : '0')

  // Randomize landing copy independently of advertising delivery.
  if (pathname === '/ad' || pathname === '/ad/') {
    const saved = request.cookies.get('ritty-copy-v1')?.value
    const variant = saved && isAdVariant(saved) ? saved
      : crypto.getRandomValues(new Uint32Array(1))[0] < 0x80000000 ? 'talking-cat' : 'cozy-life'
    const url = request.nextUrl.clone()
    url.pathname = '/ad/' + variant
    const response = NextResponse.redirect(url, 307)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    response.cookies.set('ritty-copy-v1', variant, {
      maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: 'lax', path: '/',
      secure: request.nextUrl.protocol === 'https:',
    })
    return response
  }

  // Skip for static files and api routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // files like favicon.png, sitemap.xml
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // Redirect /kr to / (301 permanent redirect for SEO)
  if (pathname === '/kr' || pathname.startsWith('/kr/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/kr/, '') || '/'
    return NextResponse.redirect(url, 301)
  }

  if (pathname === '/zh-tw/news' || pathname.startsWith('/zh-tw/news/')) {
    const url = request.nextUrl.clone()
    url.pathname = pathname.slice('/zh-tw'.length)
    return NextResponse.redirect(url, 301)
  }

  // Set the document language on the server, including the initial HTML response.
  requestHeaders.set('x-ritty-language', pathname === '/en' || pathname.startsWith('/en/') ? 'en' : pathname === '/ja' || pathname.startsWith('/ja/') ? 'ja' : pathname === '/zh-tw' || pathname.startsWith('/zh-tw/') ? 'zh-Hant-TW' : 'ko')

  // Internal Korean route mapping lives in next.config.js, after middleware.
  // Keeping it there avoids re-entering the /kr canonical redirect for dynamic pages.
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)', '/admin/newsletter/:path*', '/unsubscribe/:path*', '/api/admin/newsletter/:path*', '/api/marketing/unsubscribe'],
}
