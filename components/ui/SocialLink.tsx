'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface SocialLinkProps {
  href: string
  icon: string
  alt: string
  ariaLabel: string
  variant?: 'default' | 'sidebar' | 'footer'
}

const variantStyles = {
  default: {
    container: 'w-[70px] h-[70px] bg-bg-light rounded-full',
    image: 'w-[34px] h-[34px]',
    hover: { scale: 1.1, y: -4, backgroundColor: '#dde0e6' },
  },
  sidebar: {
    container: 'w-12 h-12 bg-white/10 backdrop-blur-sm rounded-full',
    image: 'w-6 h-6',
    hover: { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' },
  },
  footer: {
    container: 'w-10 h-10 bg-white/10 rounded-full',
    image: 'w-5 h-5',
    hover: { scale: 1.1, backgroundColor: 'rgba(255,255,255,0.2)' },
  },
}

export default function SocialLink({
  href,
  icon,
  alt,
  ariaLabel,
  variant = 'default'
}: SocialLinkProps) {
  const styles = variantStyles[variant]

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`${styles.container} flex items-center justify-center cursor-pointer`}
      whileHover={styles.hover}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Image
        src={icon}
        alt={alt}
        width={34}
        height={34}
        className={`${styles.image} object-contain`}
      />
    </motion.a>
  )
}
