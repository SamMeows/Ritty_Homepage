import type { Metadata } from 'next'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'
import { notFound } from 'next/navigation'
import { searchRobots } from '@/lib/seo'

type Props = {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params
  if (localeParam !== 'kr' && localeParam !== 'en') notFound()
  const locale = localeParam as Locale
  const dict = await getDictionary(locale)
  // Root (/) is the canonical for Korean, /en for English
  const url = locale === 'kr' ? 'https://ritty.sam-meows.com' : 'https://ritty.sam-meows.com/en'
  const ogLocale = locale === 'kr' ? 'ko_KR' : 'en_US'
  const htmlLang = locale === 'kr' ? 'ko' : 'en'

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: dict.meta.keywords,
    robots: searchRobots,
    alternates: {
      canonical: url,
      languages: {
        'ko': 'https://ritty.sam-meows.com',
        'en': 'https://ritty.sam-meows.com/en',
        'x-default': 'https://ritty.sam-meows.com',
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
          url: 'https://ritty.sam-meows.com/og-ritty-island-v2.png',
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
      images: ['https://ritty.sam-meows.com/og-ritty-island-v2.png'],
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
  if (localeParam !== 'kr' && localeParam !== 'en') notFound()
  const locale = localeParam as Locale
  const htmlLang = locale === 'kr' ? 'ko' : 'en'

  return (
    <div lang={htmlLang}>
      {children}
    </div>
  )
}
