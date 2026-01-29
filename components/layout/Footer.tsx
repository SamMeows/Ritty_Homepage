'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
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
      className="bg-dark-header min-h-[274px] py-12 flex-shrink-0 flex flex-col items-center justify-center gap-8 snap-start"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.5 }}
    >
      {/* Social Links */}
      <motion.div className="flex justify-center gap-[28px]" variants={itemVariants}>
        {dict.social.map((social, index) => (
          <motion.a
            key={social.key}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={getAria(social.key)}
            className="flex items-center justify-center"
            whileHover={{
              scale: 1.15,
              transition: { duration: 0.3 },
            }}
            whileTap={{ scale: 0.9 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: 0.1 * index,
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            <Image
              src={social.sidebarIcon}
              alt=""
              width={40}
              height={34}
              className="h-[34px] w-auto object-contain"
            />
          </motion.a>
        ))}
      </motion.div>

      {/* Sammeows Logo */}
      <motion.div className="flex justify-center" variants={itemVariants}>
        <Image
          src="/images/sammeows-logo.svg"
          alt={dict.alt.sammeowsLogo}
          width={107}
          height={16}
          className="h-4 w-auto object-contain"
        />
      </motion.div>

      {/* Copyright */}
      <motion.p
        className="font-paperlogy text-[12px] font-bold text-white opacity-70 tracking-[0.83px]"
        variants={itemVariants}
      >
        {dict.footer.copyright}
      </motion.p>

      {/* Links */}
      <motion.div
        className="flex items-center justify-center gap-8 font-poppins text-[14px] text-[#9aa2ae]"
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
