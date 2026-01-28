import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { MusicProvider } from '@/lib/contexts/MusicContext'
import ClickEffect from '@/components/effects/ClickEffect'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ritty.me'),
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
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
      </head>
      <body>
        <MusicProvider>
          {children}
          <ClickEffect />
        </MusicProvider>
      </body>
    </html>
  )
}
