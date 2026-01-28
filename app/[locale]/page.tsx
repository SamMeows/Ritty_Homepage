import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/landing/HeroSection'
import WorldviewSection from '@/components/landing/WorldviewSection'
import NewsSection from '@/components/landing/NewsSection'

type Props = {
  params: Promise<{ locale: Locale }>
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params
  const dict = await getDictionary(locale)

  const jsonLdOrganization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '삼냥이즈',
    url: 'https://ritty.me',
    logo: 'https://ritty.me/apple-touch-icon.png',
    sameAs: [
      'https://www.instagram.com/ritty_kr/',
      'https://www.youtube.com/@Ritty_meow',
      'https://www.tiktok.com/@rittymeow',
      'https://discord.gg/wghaFYCkCV',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['Korean', 'English'],
    },
  }

  const jsonLdApp = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '리티 Ritty',
    applicationCategory: 'GameApplication',
    operatingSystem: 'iOS, Android',
    description: dict.meta.description,
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
      url: 'https://ritty.me',
    },
    downloadUrl: [
      dict.links.appStore,
      dict.links.googlePlay,
    ],
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
      <Header dict={dict} locale={locale} />
      <main className="bg-dark-bg h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth">
        <HeroSection dict={dict} locale={locale} />
        <WorldviewSection dict={dict} />
        <NewsSection dict={dict} />
        <Footer dict={dict} />
      </main>
    </>
  )
}
