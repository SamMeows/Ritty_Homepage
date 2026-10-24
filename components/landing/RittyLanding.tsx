import { homeMarkup } from '@/lib/home-markup'
import { adVariants, type AdVariant } from '@/lib/ad-variants'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'
import { PreRegisterProvider } from '@/lib/contexts/PreRegisterContext'
import AdLanding from '@/components/landing/AdLanding'
import { getNews } from '@/lib/news'

export default async function RittyLanding({ variant = 'cozy-life', locale = 'kr' }: { variant?: AdVariant; locale?: Locale }) {
  const config = adVariants[variant]
  const original = await getDictionary(locale)
  const dict = {...original, preRegister:{...original.preRegister,title:locale === 'en' ? 'Ritty Pre-registration' : '리티 사전등록',releaseNote:locale === 'en' ? 'Be the first to hear about the launch' : '출시 소식을 가장 먼저 받아보세요'}}
  const markup = homeMarkup
    .replace('<div class="company-details">', '<div class="company-details" data-nosnippet>')
    .replace(/<a class="news-link"[\s\S]*?<\/a>/, '<div id="news-feed"></div>')
    .replace('<div id="news-feed"></div>', '<div id="news-feed"></div><div class="news-actions"><a class="news-all" href="/news">리티 소식 모두 보기 →</a></div>')
    .replace(/<div class="hero-copy"><p class="eyebrow">.*?<\/p><h1>.*?<\/h1><p class="hero-description">.*?<\/p>/, `<div class="hero-copy"><h1 class="ad-headline">${config.title}</h1><p class="eyebrow hero-genre">말하는 고양이와 함께하는 집사 생활 시뮬레이션 게임</p>`)
    .replace('오늘은 리티랑<br><em>뭐 하고 놀까?</em>', '오늘은 리티랑<br><em>뭐 할까?</em>')
    .replace(/<img class="hero-art"[^>]*>/, `<picture class="hero-picture"><source media="(max-width:700px)" srcset="/ritty/${config.mobileImage}.webp"><img class="hero-art" src="/ritty/${config.image}.webp" width="1672" height="941" alt="${config.alt}" fetchpriority="high"></picture>`)
    .replace(/<div class="join-card glass">.*?<\/div><\/section>/, '<div id="registration-form"></div></section>')
    .replace(/<dialog id="join-preview".*?<\/dialog>/, '')
    .replaceAll('href="#join"', 'href="#join" data-register')
    .replaceAll('사전등록 안내 보기', '사전등록하기')
    .replaceAll('사전등록 안내', '사전등록하기')
  const localizedMarkup = locale === 'en' ? markup
    .replaceAll('https://project-meow.notion.site/1bd423ba89b680f4b37dcb1ec02aa36c?pvs=74', dict.links.privacy)
    .replaceAll('https://project-meow.notion.site/1bd423ba89b680cc9c4ffaa284da0d85?pvs=74', dict.links.terms)
    .replaceAll('https://www.instagram.com/ritty_kr/', 'https://www.instagram.com/ritty_meow/')
    .replaceAll('https://www.tiktok.com/@ritty_kr', 'https://www.tiktok.com/@rittymeow') : markup
  return <PreRegisterProvider dict={dict} locale={locale}><AdLanding markup={localizedMarkup} news={await getNews()} dict={dict} locale={locale} /></PreRegisterProvider>
}
