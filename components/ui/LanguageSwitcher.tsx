'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import type { Locale } from '@/lib/i18n/dictionaries'

interface LanguageSwitcherProps {
  currentLocale: Locale
  variant?: 'standalone' | 'header'
}

export default function LanguageSwitcher({
  currentLocale,
  variant = 'standalone'
}: LanguageSwitcherProps) {
  const targetLocale = currentLocale === 'kr' ? 'en' : 'kr'
  const label = currentLocale === 'kr' ? 'EN' : 'KR'
  const ariaLabel = currentLocale === 'kr' ? 'Switch to English' : '한국어로 변경'

  if (variant === 'header') {
    return (
      <Link
        href={`/${targetLocale}`}
        aria-label={ariaLabel}
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
      >
        <Image
          src="/images/globe-icon.png"
          alt=""
          width={24}
          height={24}
          className="w-6 h-6 object-contain"
        />
      </Link>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Link
        href={`/${targetLocale}`}
        aria-label={ariaLabel}
        className="fixed top-5 right-5 z-50 bg-white border-2 border-purple-start rounded-[25px] px-5 py-2.5 font-pretendard text-base font-semibold text-purple-start shadow-md hover:bg-purple-start hover:text-white transition-colors duration-300"
      >
        {label}
      </Link>
    </motion.div>
  )
}
