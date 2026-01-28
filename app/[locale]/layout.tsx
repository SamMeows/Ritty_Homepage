import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'

type Props = {
  params: Promise<{ locale: Locale }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const dict = await getDictionary(locale)
  const url = locale === 'kr' ? 'https://ritty.me/kr' : 'https://ritty.me/en'
  const ogLocale = locale === 'kr' ? 'ko_KR' : 'en_US'

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: '리티' }],
    robots: 'index, follow',
    alternates: {
      canonical: url,
      languages: {
        ko: 'https://ritty.me/kr',
        en: 'https://ritty.me/en',
      },
    },
    verification: {
      other: {
        'naver-site-verification': 'b3e5901bdb736d1188a3bc5a8cf285e4c7a363fd',
      },
    },
    openGraph: {
      type: 'website',
      url,
      title: dict.meta.ogTitle,
      description: dict.meta.description,
      siteName: '리티 Ritty',
      locale: ogLocale,
      images: [
        {
          url: 'https://ritty.me/og-image.png',
          width: 800,
          height: 400,
          alt: dict.meta.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.ogTitle,
      description: dict.meta.description,
      images: ['https://ritty.me/og-image.png'],
    },
  }
}

export async function generateStaticParams() {
  return [{ locale: 'kr' }, { locale: 'en' }]
}

export default async function LocaleLayout({ children }: Props) {
  return <>{children}</>
}
