import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import SocialSidebar from '@/components/ui/SocialSidebar'
import HeroSection from '@/components/landing/HeroSection'
import OfficialEntitySection from '@/components/landing/OfficialEntitySection'
import RittyIntroSection from '@/components/landing/RittyIntroSection'
import WorldviewSection from '@/components/landing/WorldviewSection'

type Props = {
  params: Promise<{ locale: string }>
}

export default async function LandingPage({ params }: Props) {
  const { locale: localeParam } = await params
  const locale = localeParam as Locale
  const dict = await getDictionary(locale)

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '삼냥이즈',
    alternateName: ['SamMeows', 'Sam-Meows', 'Sam-Meows Inc.'],
    url: 'https://ritty.sam-meows.com',
    logo: 'https://ritty.sam-meows.com/apple-touch-icon.png',
    sameAs: [
      'https://sam-meows.com',
      'https://www.instagram.com/ritty_kr/',
      'https://www.instagram.com/ritty_meow/',
      'https://www.youtube.com/@Ritty_meow',
      'https://www.tiktok.com/@ritty_kr',
      'https://www.tiktok.com/@rittymeow',
      'https://discord.gg/wghaFYCkCV',
      'https://x.com/Ritty_kr',
      'https://www.facebook.com/people/%EB%A6%AC%ED%8B%B0-RITTY/61575225267956/',
      'https://play.google.com/store/apps/details?id=com.sammeows.ritty',
      'https://apps.apple.com/app/id6743311040',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean', 'English'],
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
    name: '리티 Ritty',
    alternateName: ['리티', 'Ritty', 'Ritty App', '리티 앱'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'iOS, Android',
    description: dict.meta.description,
    url: 'https://ritty.sam-meows.com',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: locale === 'kr' ? 'KRW' : 'USD',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1250',
    },
    author: {
      '@type': 'Organization',
      name: '삼냥이즈',
      alternateName: 'SamMeows',
      url: 'https://ritty.sam-meows.com',
    },
    publisher: {
      '@type': 'Organization',
      name: '삼냥이즈',
      alternateName: 'SamMeows',
      url: 'https://ritty.sam-meows.com',
    },
    downloadUrl: [
      dict.links.appStore,
      dict.links.googlePlay,
    ],
    installUrl: [
      dict.links.appStore,
      dict.links.googlePlay,
    ],
  }

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: locale === 'kr' ? '리티 (Ritty) 공식 홈페이지' : 'Ritty Official Website',
    alternateName: ['리티 공식 홈페이지', 'Ritty Official Website', '리티 Ritty'],
    url: 'https://ritty.sam-meows.com',
    publisher: {
      '@type': 'Organization',
      name: '삼냥이즈',
      alternateName: 'SamMeows',
    },
    inLanguage: locale === 'kr' ? 'ko-KR' : 'en-US',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <Header dict={dict} locale={locale} />
      <SocialSidebar dict={dict} />
      <main className="bg-dark-bg h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        <HeroSection dict={dict} locale={locale} />
        <OfficialEntitySection dict={dict} />
        <WorldviewSection dict={dict} />
        <RittyIntroSection dict={dict} />
        <Footer dict={dict} />
      </main>
    </>
  )
}
