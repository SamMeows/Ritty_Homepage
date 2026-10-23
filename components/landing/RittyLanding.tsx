import { homeMarkup } from '@/lib/home-markup'
import { adVariants, type AdVariant } from '@/lib/ad-variants'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { PreRegisterProvider } from '@/lib/contexts/PreRegisterContext'
import AdLanding from '@/components/landing/AdLanding'
import { getNews } from '@/lib/news'

export default async function RittyLanding({ variant = 'cozy-life' }: { variant?: AdVariant }) {
  const config = adVariants[variant]
  const original = await getDictionary('kr')
  const dict = {...original, preRegister:{...original.preRegister,title:'리티 사전등록',releaseNote:'출시 소식을 가장 먼저 받아보세요'}}
  const markup = homeMarkup
    .replace('<div class="company-details">', '<div class="company-details" data-nosnippet>')
    .replace(/<a class="news-link"[\s\S]*?<\/a>/, '<div id="news-feed"></div>')
    .replace('<div id="news-feed"></div>', '<div id="news-feed"></div><p><a href="/news">리티 개발 소식과 공지 모두 보기 →</a></p>')
    .replace(/<div class="hero-copy"><p class="eyebrow">.*?<\/p><h1>.*?<\/h1><p class="hero-description">.*?<\/p>/, `<div class="hero-copy"><h1 class="ad-headline">${config.title}</h1><p class="eyebrow hero-genre">말하는 고양이와 함께하는 집사 생활 시뮬레이션 게임</p>`)
    .replace('오늘은 리티랑<br><em>뭐 하고 놀까?</em>', '오늘은 리티랑<br><em>뭐 할까?</em>')
    .replace(/<img class="hero-art"[^>]*>/, `<picture class="hero-picture"><source media="(max-width:700px)" srcset="/ritty/${config.mobileImage}.webp"><img class="hero-art" src="/ritty/${config.image}.webp" width="1672" height="941" alt="${config.alt}" fetchpriority="high"></picture>`)
    .replace(/<div class="join-card glass">.*?<\/div><\/section>/, '<div id="registration-form"></div></section>')
    .replace(/<dialog id="join-preview".*?<\/dialog>/, '')
    .replaceAll('href="#join"', 'href="#join" data-register')
    .replaceAll('사전등록 안내 보기', '사전등록하기')
    .replaceAll('사전등록 안내', '사전등록하기')
  return <PreRegisterProvider dict={dict} locale="kr"><AdLanding markup={markup} news={await getNews()} dict={dict} /></PreRegisterProvider>
}
