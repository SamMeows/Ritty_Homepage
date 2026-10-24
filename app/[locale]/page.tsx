import RittyLanding from '@/components/landing/RittyLanding'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'
import { LAUNCH_PHASE } from '@/lib/launch'
import { serializeJsonLd } from '@/lib/seo'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function LandingPage({ params }: Props) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  const dict = await getDictionary(locale)
  // Store links only make sense while the app is downloadable.
  const isOnStores = LAUNCH_PHASE === 'store'

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://ritty.sam-meows.com/#organization',
    name: '삼냥이즈',
    alternateName: ['SamMeows', 'Sam-Meows', 'Sam-Meows Inc.'],
    url: 'https://sam-meows.com',
    logo: 'https://ritty.sam-meows.com/images/sammeows-logo.svg',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean', 'English', 'Japanese', 'Traditional Chinese'],
    },
    brand: {
      '@type': 'Brand',
      name: '리티',
      alternateName: ['Ritty', '리티 Ritty'],
      logo: 'https://ritty.sam-meows.com/apple-touch-icon.png',
      url: 'https://ritty.sam-meows.com',
    },
  }

  const jsonLdApp = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    '@id': 'https://ritty.sam-meows.com/#game',
    name: '리티 Ritty',
    alternateName: ['리티', 'Ritty', 'Ritty App', '리티 앱'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'iOS, Android',
    description: dict.meta.description,
    inLanguage: locale === 'kr' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh-tw' ? 'zh-Hant-TW' : 'en-US',
    url: 'https://ritty.sam-meows.com',
    publisher: {
      '@id': 'https://ritty.sam-meows.com/#organization',
    },
    sameAs: [
      'https://www.instagram.com/ritty_kr/',
      'https://www.instagram.com/ritty_meow/',
      'https://www.youtube.com/@Ritty_meow',
      'https://www.tiktok.com/@ritty_kr',
      'https://www.tiktok.com/@rittymeow',
      'https://discord.gg/wghaFYCkCV',
      'https://x.com/Ritty_kr',
      'https://www.facebook.com/people/%EB%A6%AC%ED%8B%B0-RITTY/61575225267956/',
    ],
    ...(isOnStores && {
      downloadUrl: [
        dict.links.appStore,
        dict.links.googlePlay,
      ],
      installUrl: [
        dict.links.appStore,
        dict.links.googlePlay,
      ],
    }),
  }

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': 'https://ritty.sam-meows.com/#website',
    name: '리티 Ritty',
    alternateName: ['리티', 'Ritty', '리티 공식 홈페이지'],
    url: 'https://ritty.sam-meows.com',
    publisher: {
      '@id': 'https://ritty.sam-meows.com/#organization',
    },
    about: { '@id': 'https://ritty.sam-meows.com/#game' },
    inLanguage: ['ko-KR', 'en-US', 'ja-JP', 'zh-Hant-TW'],
  }

  const jsonLdPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${locale === 'kr' ? 'https://ritty.sam-meows.com/' : `https://ritty.sam-meows.com/${locale}`}#webpage`,
    url: locale === 'kr' ? 'https://ritty.sam-meows.com' : `https://ritty.sam-meows.com/${locale}`,
    name: dict.meta.title,
    description: dict.meta.description,
    inLanguage: locale === 'kr' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh-tw' ? 'zh-Hant-TW' : 'en-US',
    isPartOf: { '@id': 'https://ritty.sam-meows.com/#website' },
    mainEntity: { '@id': 'https://ritty.sam-meows.com/#game' },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdWebsite) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLdPage) }} />
      <RittyLanding locale={locale} />
    </>
  )
}
