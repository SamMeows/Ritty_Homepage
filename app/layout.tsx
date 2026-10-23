import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { headers } from 'next/headers'
import { MusicProvider } from '@/lib/contexts/MusicContext'
import ClickEffect from '@/components/effects/ClickEffect'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ritty.sam-meows.com'),
  icons: {
    icon: [{ url: '/icons/favicon-96.png', sizes: '96x96', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const requestHeaders = await headers()
  const language = requestHeaders.get('x-ritty-language') === 'en' ? 'en' : 'ko'
  return (
    <html lang={language} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@100;300;400;500;700;900&family=Poppins:wght@400;500;600&family=Righteous&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-RSYNTB8CZV"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-RSYNTB8CZV');
          `}
        </Script>
        <MusicProvider>
          {children}
          <ClickEffect />
        </MusicProvider>
      </body>
    </html>
  )
}
