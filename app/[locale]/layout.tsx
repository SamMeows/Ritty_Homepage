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
  if (localeParam !== 'kr' && localeParam !== 'en' && localeParam !== 'ja' && localeParam !== 'zh-tw') notFound()
  const locale = localeParam as Locale
  const dict = await getDictionary(locale)
  // Root (/) is the canonical for Korean, /en for English
  const url = locale === 'kr' ? 'https://ritty.sam-meows.com' : `https://ritty.sam-meows.com/${locale}`
  const ogLocale = locale === 'kr' ? 'ko_KR' : locale === 'ja' ? 'ja_JP' : locale === 'zh-tw' ? 'zh_TW' : 'en_US'
  const htmlLang = locale === 'kr' ? 'ko' : locale === 'zh-tw' ? 'zh-Hant-TW' : locale

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
        'ja': 'https://ritty.sam-meows.com/ja',
        'zh-TW': 'https://ritty.sam-meows.com/zh-tw',
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
      alternateLocale: locale === 'kr' ? ['en_US', 'ja_JP', 'zh_TW'] : locale === 'zh-tw' ? ['ko_KR', 'en_US', 'ja_JP'] : ['ko_KR', locale === 'ja' ? 'en_US' : 'ja_JP', 'zh_TW'],
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
  return [{ locale: 'kr' }, { locale: 'en' }, { locale: 'ja' }, { locale: 'zh-tw' }]
}

export default async function LocaleLayout({ params, children }: Props) {
  const { locale: localeParam } = await params
  if (localeParam !== 'kr' && localeParam !== 'en' && localeParam !== 'ja' && localeParam !== 'zh-tw') notFound()
  const locale = localeParam as Locale
  const htmlLang = locale === 'kr' ? 'ko' : locale === 'zh-tw' ? 'zh-Hant-TW' : locale

  return (
    <div lang={htmlLang}>
      {children}
    </div>
  )
}
