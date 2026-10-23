import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { isAdVariant } from '@/lib/ad-variants'
import RittyLanding from '@/components/landing/RittyLanding'

type Props = { params: Promise<{ locale: string; variant: string }> }
export const metadata: Metadata = {
  title: '리티 (Ritty) | 말하는 고양이와 함께하는 힐링 게임',
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
}
export default async function Page({ params }: Props) {
  const { locale, variant } = await params
  if (locale !== 'kr' || !isAdVariant(variant)) notFound()
  return <RittyLanding variant={variant} />
}
