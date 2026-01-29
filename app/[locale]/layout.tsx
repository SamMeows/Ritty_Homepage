import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'

type Props = {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  const dict = await getDictionary(locale)
  const url = locale === 'kr' ? 'https://ritty.me/kr' : 'https://ritty.me/en'
  const ogLocale = locale === 'kr' ? 'ko_KR' : 'en_US'
  const htmlLang = locale === 'kr' ? 'ko' : 'en'

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    authors: [{ name: '삼냥이즈 (Sam-Meows)' }],
    robots: 'index, follow',
    alternates: {
      canonical: url,
      languages: {
        'ko': 'https://ritty.me/kr',
        'en': 'https://ritty.me/en',
        'x-default': 'https://ritty.me/kr',
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
      alternateLocale: locale === 'kr' ? 'en_US' : 'ko_KR',
      images: [
        {
          url: 'https://ritty.me/og-image.png',
          width: 1200,
          height: 630,
          alt: dict.meta.ogImageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: dict.meta.ogTitle,
      description: dict.meta.description,
      images: ['https://ritty.me/og-image.png'],
    },
    other: {
      'content-language': htmlLang,
    },
  }
}

export async function generateStaticParams() {
  return [{ locale: 'kr' }, { locale: 'en' }]
}

export default async function LocaleLayout({ params, children }: Props) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  const htmlLang = locale === 'kr' ? 'ko' : 'en'

  return (
    <div lang={htmlLang}>
      {children}
    </div>
  )
}
