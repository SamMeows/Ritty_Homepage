'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import FloatingParticles from '@/components/effects/FloatingParticles'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface FooterProps {
  dict: Dictionary
}

export default function Footer({ dict }: FooterProps) {
  const getAria = (key: string) => {
    const ariaMap: Record<string, keyof typeof dict.aria> = {
      discord: 'joinDiscord',
      instagram: 'visitInstagram',
      youtube: 'subscribeYoutube',
      tiktok: 'followTiktok',
    }
    return dict.aria[ariaMap[key]] || key
  }

  const getAlt = (key: string) => {
    const altMap: Record<string, keyof typeof dict.alt> = {
      discord: 'discord',
      instagram: 'instagram',
      youtube: 'youtube',
      tiktok: 'tiktok',
      X: 'x',
    }
    return dict.alt[altMap[key]] || key
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 20,
      },
    },
  }

  return (
    <motion.footer
      className="relative bg-dark-header min-h-[274px] py-12 flex-shrink-0 flex flex-col items-center justify-center gap-8 snap-start overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
    >
      {/* Background Particles */}
      <FloatingParticles count={15} color="rgba(255, 255, 255, 0.15)" minSize={1} maxSize={3} />

      {/* Social Links */}
      <motion.div className="flex justify-center gap-[28px] z-10" variants={itemVariants}>
        {dict.social.map((social, index) => (
          <motion.a
            key={social.key}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={getAria(social.key)}
            className="flex items-center justify-center relative"
            whileHover={{
              scale: 1.2,
              filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.6))',
              transition: { duration: 0.3 },
            }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{
              delay: 0.1 * index,
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            <Image
              src={social.sidebarIcon}
              alt={getAlt(social.key)}
              width={40}
              height={34}
              className="h-[34px] w-auto object-contain"
            />
          </motion.a>
        ))}
      </motion.div>

      {/* Sammeows Logo */}
      <motion.a
        href="https://sam-meows.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex justify-center z-10"
        variants={itemVariants}
        whileHover={{ scale: 1.1, filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))' }}
        whileTap={{ scale: 0.95 }}
      >
        <Image
          src="/images/sammeows-logo.svg"
          alt={dict.alt.sammeowsLogo}
          width={107}
          height={16}
          className="h-4 w-auto object-contain"
        />
      </motion.a>

      {/* Copyright */}
      <motion.p
        className="font-paperlogy text-[12px] font-bold text-white opacity-70 tracking-[0.83px] z-10"
        variants={itemVariants}
        whileHover={{ opacity: 1, scale: 1.02 }}
      >
        {dict.footer.copyright}
      </motion.p>

      {/* Links */}
      <motion.div
        className="flex items-center justify-center gap-8 font-poppins text-[14px] text-[#9aa2ae] z-10"
        variants={itemVariants}
      >
        <motion.a
          href={dict.links.terms}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          whileHover={{ scale: 1.05, color: '#ffffff' }}
        >
          {dict.footer.terms}
        </motion.a>
        <motion.a
          href={dict.links.privacy}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-white transition-colors"
          whileHover={{ scale: 1.05, color: '#ffffff' }}
        >
          {dict.footer.privacy}
        </motion.a>
      </motion.div>
    </motion.footer>
  )
}
