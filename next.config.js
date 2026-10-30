/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/kr' },
      { source: '/privacy', destination: '/kr/privacy' },
      { source: '/news/:path*', destination: '/kr/news/:path*' },
      { source: '/ad/:path*', destination: '/kr/ad/:path*' },
    ] }
  },
  async headers() {
    const privateHeaders = [
      { key: 'Cache-Control', value: 'private, no-store, max-age=0' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, nosnippet' },
    ]
    return [{
      source: '/api/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, nosnippet' }],
    }, ...['/admin/newsletter/:path*', '/api/admin/newsletter/:path*', '/unsubscribe/:path*', '/api/marketing/unsubscribe'].map(source => ({ source, headers: privateHeaders }))]
  },
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
