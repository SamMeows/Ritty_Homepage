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
    <div className="flex gap-[14px]">
      <motion.button
        onClick={() => handleDownload('ios', dict.links.appStore)}
        aria-label={dict.aria.downloadIos}
        className="w-[272px] h-[72px] rounded-[20px] overflow-hidden cursor-pointer bg-black border-none p-0"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Image
          src="/images/AppStoreButton-new.png"
          alt={dict.alt.appStore}
          width={206}
          height={72}
          className="w-full h-full object-cover"
        />
      </motion.button>
      <motion.button
        onClick={() => handleDownload('android', dict.links.googlePlay)}
        aria-label={dict.aria.downloadAndroid}
        className="w-[272px] h-[72px] rounded-[20px] overflow-hidden cursor-pointer bg-[#100f0d] border-none p-0"
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 200, damping: 20 }}
      >
        <Image
          src="/images/GooglePlayButton-new.png"
          alt={dict.alt.googlePlay}
          width={206}
          height={72}
          className="w-full h-full object-cover"
        />
      </motion.button>
    </div>
  )
}
