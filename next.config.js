/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return { beforeFiles: [
      { source: '/', destination: '/kr' },
      { source: '/news/:path*', destination: '/kr/news/:path*' },
      { source: '/ad/:path*', destination: '/kr/ad/:path*' },
    ] }
  },
  async headers() {
    return [{
      source: '/api/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, nosnippet' }],
    }]
  },
  images: {
    remotePatterns: [],
  },
}

module.exports = nextConfig
