'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import DownloadButtons from './DownloadButtons'
import SocialSidebar from '@/components/ui/SocialSidebar'
import ScrollIndicator from '@/components/ui/ScrollIndicator'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface HeroSectionProps {
  dict: Dictionary
  locale: string
}

export default function HeroSection({ dict, locale }: HeroSectionProps) {
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
          src="/images/hero-bg-winter.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
      </motion.div>

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-[1440px] px-6 lg:px-12 flex flex-col items-center justify-center"
        variants={containerVariants}
        initial="hidden"
        animate={isLoaded ? 'visible' : 'hidden'}
      >
        {/* Hero Text */}
        <motion.div
          className="flex flex-col items-center text-center mb-12 lg:mb-16"
          variants={itemVariants}
        >
          <motion.p
            className="font-paperlogy text-[40px] lg:text-[62px] font-extrabold text-white leading-[1.42] [text-shadow:0_0_25px_rgba(54,34,25,1)]"
            variants={textVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {dict.hero.line1}
          </motion.p>
          <motion.h1
            className="font-paperlogy text-[52px] lg:text-[80px] font-extrabold text-white leading-[1.42] [text-shadow:0_0_25px_rgba(54,34,25,1)]"
            variants={textVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {dict.hero.line2}
          </motion.h1>
        </motion.div>

        {/* Download Buttons */}
        <motion.div variants={itemVariants}>
          <DownloadButtons dict={dict} locale={locale} />
        </motion.div>
      </motion.div>

      {/* Social Sidebar (desktop only) */}
      <SocialSidebar dict={dict} />

      {/* Scroll Indicator */}
      <ScrollIndicator targetId="ritty-intro" ariaLabel={dict.aria.scrollDown} />
    </section>
  )
}
