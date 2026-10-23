import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { homeMarkup } from '@/lib/home-markup'
import { adVariants, isAdVariant } from '@/lib/ad-variants'
import { getDictionary } from '@/lib/i18n/dictionaries'
import { PreRegisterProvider } from '@/lib/contexts/PreRegisterContext'
import AdLanding from '@/components/landing/AdLanding'
import { getNews } from '@/lib/news'

type Props = { params: Promise<{ locale: string; variant: string }> }
export const metadata: Metadata = {
  title: '리티 | 말하는 고양이와 함께 사는 생활게임',
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
}
export default async function Page({ params }: Props) {
  const { locale, variant } = await params
  if (locale !== 'kr' || !isAdVariant(variant)) notFound()
  const config = adVariants[variant]
  const original = await getDictionary('kr')
  const dict = {...original, preRegister:{...original.preRegister,title:'리티 사전등록',releaseNote:'출시 소식을 가장 먼저 받아보세요'}}
  const markup = homeMarkup
    .replace(/<a class="news-link"[\s\S]*?<\/a>/, '<div id="news-feed"></div>')
    .replace('<h1>고양이가<br>말을 한다.</h1>', `<h1 class="ad-headline">${config.title}</h1>`)
    .replace('말하는 고양이와 함께 살아가는 생활게임</p>', '말하는 고양이와 함께하는 집사 생활 시뮬레이션</p>')
    .replace(/<p class="hero-description">.*?<\/p>/, `<p class="hero-description">${config.description}</p>`)
    .replace('class="hero-art" src="/ritty/hero.webp"', `class="hero-art" src="/ritty/${config.image}.webp"`)
    .replace('햇살 드는 집에서 나와 눈을 맞추는 회색 리티', config.alt)
    .replace(/<div class="join-card glass">.*?<\/div><\/section>/, '<div id="registration-form"></div></section>')
    .replace(/<dialog id="join-preview".*?<\/dialog>/, '')
    .replaceAll('href="#join"', 'href="#join" data-register')
    .replaceAll('사전등록 안내 보기', '사전등록하기')
    .replaceAll('사전등록 안내', '사전등록하기')
  return <PreRegisterProvider dict={dict} locale="kr"><AdLanding markup={markup} news={await getNews()} dict={dict} /></PreRegisterProvider>
}
