'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import MusicToggle from '@/components/ui/MusicToggle'
import LanguageDropdown from '@/components/ui/LanguageDropdown'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'

interface HeaderProps {
  dict: Dictionary
  locale: Locale
}

const navItems = [
  { key: 'home', href: '#home' },
  { key: 'rittyIntro', href: '#ritty-intro' },
  { key: 'worldview', href: '#worldview' },
  { key: 'news', href: '#news' },
] as const

export default function Header({ dict, locale }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeNav, setActiveNav] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
    >
      {/* Header Background */}
      {isScrolled && (
        <motion.div
          className="absolute inset-0 bg-dark-header/95 backdrop-blur-sm shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      <Image
        src="/images/header-gradient.png"
        alt=""
        fill
        className={`object-cover object-center transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'}`}
        priority
      />

      <div className="relative max-w-[1441px] mx-auto px-[50px] py-[25px] flex items-center justify-between">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center group" aria-label={dict.alt.logo}>
          <motion.div
            className="relative flex items-start"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <span
              className="font-righteous text-[40px] lg:text-[52px] tracking-[0.83px] [text-shadow:0_0_10px_rgba(0,0,30,0.24)]"
              style={{
                background: 'linear-gradient(113deg, rgba(255,255,255,0.74) 0%, #fff 60%, rgba(255,255,255,0.84) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Ritty
            </span>
            <motion.div
              className="absolute -top-1 -right-7"
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/images/logo-sparkle.svg"
                alt=""
                width={27}
                height={28}
                className="w-[27px] h-[28px]"
              />
            </motion.div>
          </motion.div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center justify-between w-[526px]">
          {navItems.map(({ key, href }, index) => (
            <motion.a
              key={key}
              href={href}
              onClick={(e) => handleNavClick(e, href)}
              onHoverStart={() => setActiveNav(key)}
              onHoverEnd={() => setActiveNav(null)}
              className="relative font-paperlogy text-[25px] font-bold text-white tracking-[0.83px] transition-colors"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{ scale: 1.1, color: '#fffbc0' }}
              whileTap={{ scale: 0.95 }}
            >
              {dict.nav[key as keyof typeof dict.nav]}
              {activeNav === key && (
                <motion.div
                  layoutId="navUnderline"
                  className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.a>
          ))}
        </nav>

        {/* Right buttons */}
        <div className="flex items-center gap-[23px]">
          {/* Language Dropdown */}
          <LanguageDropdown currentLocale={locale} ariaLabel={dict.aria.changeLanguage} />

          {/* Music Toggle */}
          <MusicToggle ariaLabel={dict.aria.toggleMusic} />
        </div>
      </div>
    </motion.header>
  )
}
