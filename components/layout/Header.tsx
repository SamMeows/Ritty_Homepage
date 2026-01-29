'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import MusicToggle from '@/components/ui/MusicToggle'
import LanguageDropdown from '@/components/ui/LanguageDropdown'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'

interface HeaderProps {
  dict: Dictionary
  locale: Locale
}

const navItems = [
  { key: 'home', href: '#home', external: false },
  { key: 'worldview', href: '#worldview', external: false },
  { key: 'rittyIntro', href: '#ritty-intro', external: false },
  { key: 'news', href: 'https://project-meow.notion.site/Notice-253423ba89b680e6b2c9c4c952c8847f', external: true },
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

  const scrollToSection = (href: string) => {
    const targetId = href.replace('#', '')
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    scrollToSection(href)
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
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${isScrolled ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)',
        }}
      />

      <div className="relative max-w-[1441px] mx-auto px-[50px] py-[25px] flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => scrollToSection('#home')}
          className="flex items-center group cursor-pointer"
          aria-label={dict.alt.logo}
        >
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
              animate={{
                rotate: [0, 15, -15, 0],
                scale: [1, 1.3, 1],
                filter: [
                  'drop-shadow(0 0 5px rgba(255,255,255,0.5))',
                  'drop-shadow(0 0 15px rgba(255,255,255,1))',
                  'drop-shadow(0 0 5px rgba(255,255,255,0.5))',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image
                src="/images/logo-sparkle.svg"
                alt={dict.alt.sparkle || 'sparkle'}
                width={27}
                height={28}
                className="w-[27px] h-[28px]"
              />
            </motion.div>
          </motion.div>
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8 lg:gap-12">
          {navItems.map(({ key, href, external }, index) => (
            <motion.a
              key={key}
              href={href}
              onClick={external ? undefined : (e) => handleNavClick(e, href)}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              onHoverStart={() => setActiveNav(key)}
              onHoverEnd={() => setActiveNav(null)}
              className="relative font-paperlogy text-[25px] font-bold text-white tracking-[0.83px] transition-colors flex items-center gap-1"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, type: 'spring', stiffness: 300, damping: 20 }}
              whileHover={{
                scale: 1.1,
                color: '#fffbc0',
                textShadow: '0 0 20px rgba(255, 251, 192, 0.8), 0 0 40px rgba(255, 251, 192, 0.4)',
              }}
              whileTap={{ scale: 0.95 }}
            >
              {dict.nav[key as keyof typeof dict.nav]}
              {external && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-1"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              )}
              {activeNav === key && !external && (
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
