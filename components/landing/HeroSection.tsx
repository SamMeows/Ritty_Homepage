'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import DownloadButtons from './DownloadButtons'
import PreRegisterButton from '@/components/pre-register/PreRegisterButton'
import ScrollIndicator from '@/components/ui/ScrollIndicator'
import Snowfall from '@/components/effects/Snowfall'
import FloatingParticles from '@/components/effects/FloatingParticles'
import { LAUNCH_PHASE } from '@/lib/launch'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface HeroSectionProps {
  dict: Dictionary
  locale: string
  refreshed?: boolean
}

export default function HeroSection({ dict, locale, refreshed = false }: HeroSectionProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  }

  const textVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 15,
      },
    },
  }

  return (
    <section
      id="home"
      className="relative w-full h-screen flex items-center justify-center overflow-hidden snap-start snap-always"
    >
      {/* Background Image with parallax effect */}
      <motion.div
        className="absolute inset-0 z-0"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <Image
          src={refreshed ? '/ritty/hero.webp' : '/images/hero-bg-winter.png'}
          alt={refreshed ? '햇살 드는 집에서 눈을 맞추는 회색 리티 · 콘셉트 아트' : dict.alt.heroBg}
          fill
          className={refreshed ? 'object-cover object-[73%_center] lg:object-center' : 'object-cover object-center'}
          priority
        />
      </motion.div>

      {/* Snowfall Effect - reduced for better INP */}
      {!refreshed && <Snowfall count={35} />}
      {refreshed && <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30" />}

      {/* Floating Particles - reduced for better INP */}
      <FloatingParticles count={12} color="rgba(255, 255, 255, 0.5)" minSize={2} maxSize={4} />

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-[1440px] px-6 lg:px-12 flex flex-col items-center justify-center pt-[5vh] lg:pt-[7vh]"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
      >
        {/* Hero Text */}
        <motion.div
          className={refreshed ? "flex flex-col items-center text-center mb-[36vh] lg:mb-[44vh]" : "flex flex-col items-center text-center mb-[30vh] lg:mb-[38vh]"}
          variants={itemVariants}
        >
          <motion.h1
            className="flex flex-col items-center"
            variants={textVariants}
          >
            {/* SEO-optimized sr-only text for search engines */}
            <span className="sr-only">{dict.meta.h1SrOnly}</span>
            <motion.span
              className={refreshed ? "font-paperlogy text-[clamp(28px,4vw,64px)] font-extrabold text-white leading-[1.42]" : "font-paperlogy text-[clamp(28px,5vw,80px)] font-extrabold text-white leading-[1.42]"}
              style={{
                textShadow: '0 0 25px rgba(54,34,25,1), 0 0 50px rgba(255,255,255,0.3)',
              }}
              whileHover={{
                scale: 1.05,
                textShadow: '0 0 30px rgba(54,34,25,1), 0 0 60px rgba(255,255,255,0.5), 0 0 100px rgba(255,200,150,0.3)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {dict.hero.line1}
            </motion.span>
            <motion.span
              className={refreshed ? "font-paperlogy text-[clamp(36px,6vw,90px)] font-extrabold text-white leading-[1.42]" : "font-paperlogy text-[clamp(36px,7vw,110px)] font-extrabold text-white leading-[1.42]"}
              style={{
                textShadow: '0 0 25px rgba(54,34,25,1), 0 0 50px rgba(255,255,255,0.3)',
              }}
              whileHover={{
                scale: 1.05,
                textShadow: '0 0 30px rgba(54,34,25,1), 0 0 60px rgba(255,255,255,0.5), 0 0 100px rgba(255,200,150,0.3)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {dict.hero.line2}
            </motion.span>
          </motion.h1>
        </motion.div>

        {/* Pre-registration or Download Buttons */}
        <motion.div variants={itemVariants}>
          {LAUNCH_PHASE === 'pre-register' ? (
            <PreRegisterButton dict={dict} />
          ) : (
            <DownloadButtons dict={dict} locale={locale} />
          )}
        </motion.div>
      </motion.div>

      
      {refreshed && <span className="absolute bottom-5 left-5 text-xs text-white bg-black/40 rounded-full px-3 py-1">콘셉트 아트 · 실제 플레이 화면 아님</span>}
      {/* Scroll Indicator */}
      <ScrollIndicator targetId="worldview" ariaLabel={dict.aria.scrollDown} />
    </section>
  )
}

