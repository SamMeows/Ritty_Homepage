'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface SocialSidebarProps {
  dict: Dictionary
}

const socialLinks = [
  { key: 'discord', icon: '/images/discord-sidebar.svg' },
  { key: 'instagram', icon: '/images/instagram-sidebar.svg' },
  { key: 'youtube', icon: '/images/youtube-sidebar.png' },
  { key: 'tiktok', icon: '/images/tiktok-sidebar.png' },
] as const

export default function SocialSidebar({ dict }: SocialSidebarProps) {
  const getLink = (key: string) => dict.links[key as keyof typeof dict.links]
  const getAria = (key: string) => {
    const ariaMap: Record<string, keyof typeof dict.aria> = {
      discord: 'joinDiscord',
      instagram: 'visitInstagram',
      youtube: 'subscribeYoutube',
      tiktok: 'followTiktok',
    }
    return dict.aria[ariaMap[key]]
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.8,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: 50, scale: 0.8 },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 15,
      },
    },
  }

  return (
    <motion.div
      className="fixed right-[42px] top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-[14px]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {socialLinks.map(({ key, icon }, index) => (
        <motion.a
          key={key}
          href={getLink(key)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={getAria(key)}
          className="w-[70px] h-[70px] rounded-[35px] bg-white/65 border-[1.5px] border-white flex items-center justify-center overflow-hidden"
          variants={itemVariants}
          whileHover={{
            scale: 1.15,
            rotate: [0, -5, 5, 0],
            backgroundColor: 'rgba(255,255,255,0.9)',
            transition: { duration: 0.3 },
          }}
          whileTap={{ scale: 0.9 }}
          animate={{
            y: [0, -5, 0],
            transition: {
              duration: 2,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            },
          }}
        >
          <Image
            src={icon}
            alt=""
            width={34}
            height={34}
            className="w-[34px] h-[34px] object-contain"
          />
        </motion.a>
      ))}
    </motion.div>
  )
}
