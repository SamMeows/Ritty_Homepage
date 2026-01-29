'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { trackDownloadClick } from '@/lib/analytics'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface DownloadButtonsProps {
  dict: Dictionary
  locale: string
}

export default function DownloadButtons({ dict, locale }: DownloadButtonsProps) {
  const handleDownload = (platform: 'ios' | 'android', url: string) => {
    trackDownloadClick(platform, locale)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const buttonVariants = {
    hover: {
      scale: 1.08,
      y: -5,
      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 15,
      },
    },
    tap: {
      scale: 0.95,
      y: 0,
    },
  }

  return (
    <div className="flex gap-[clamp(16px,2.5vw,43px)]">
      <motion.button
        onClick={() => handleDownload('ios', dict.links.appStore)}
        aria-label={dict.aria.downloadIos}
        className="w-[clamp(140px,18vw,297px)] h-[clamp(49px,6.3vw,104px)] rounded-[clamp(14px,1.8vw,29px)] overflow-hidden cursor-pointer border-none"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Image
          src="/images/AppStoreButton-new.svg"
          alt={dict.alt.appStore}
          width={297}
          height={104}
          className="w-full h-full object-fill"
        />
      </motion.button>
      <motion.button
        onClick={() => handleDownload('android', dict.links.googlePlay)}
        aria-label={dict.aria.downloadAndroid}
        className="w-[clamp(140px,18vw,297px)] h-[clamp(49px,6.3vw,104px)] rounded-[clamp(14px,1.8vw,29px)] overflow-hidden cursor-pointer border-none"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Image
          src="/images/GooglePlayButton-new.svg"
          alt={dict.alt.googlePlay}
          width={297}
          height={104}
          className="w-full h-full object-fill"
        />
      </motion.button>
    </div>
  )
}
