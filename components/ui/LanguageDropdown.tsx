'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n/dictionaries'

interface LanguageDropdownProps {
  currentLocale: Locale
  ariaLabel: string
}

const languages = [
  { code: 'kr', label: '한국어', flag: '🇰🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
] as const

export default function LanguageDropdown({ currentLocale, ariaLabel }: LanguageDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentLanguage = languages.find(lang => lang.code === currentLocale)

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        className="w-[51px] h-[51px] rounded-full bg-white/65 border-[1.5px] border-white flex items-center justify-center hover:bg-white/80 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Image
          src="/images/globe-icon.png"
          alt=""
          width={29}
          height={29}
          className={`w-[29px] h-[29px] object-contain transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 overflow-hidden min-w-[140px]"
          >
            {languages.map((lang, index) => (
              <motion.div
                key={lang.code}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Link
                  href={`/${lang.code}`}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 ${
                    currentLocale === lang.code
                      ? 'bg-purple-start/10 text-purple-start'
                      : 'text-text-dark hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="font-pretendard text-sm font-medium">{lang.label}</span>
                  {currentLocale === lang.code && (
                    <motion.div
                      layoutId="activeLanguage"
                      className="ml-auto w-2 h-2 rounded-full bg-purple-start"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
