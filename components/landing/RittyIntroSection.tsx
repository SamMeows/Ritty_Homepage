'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface RittyIntroSectionProps {
  dict: Dictionary
}

export default function RittyIntroSection({ dict }: RittyIntroSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const totalSlides = 3

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }

  return (
    <section
      id="ritty-intro"
      className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden snap-start snap-always"
      style={{
        background: 'linear-gradient(180deg, #6761fa 0%, #918dff 100%)',
      }}
    >
      {/* Label */}
      <motion.p
        className="font-paperlogy text-[20px] font-extrabold text-white text-center mb-2"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
      >
        {dict.sections.rittyIntro.label}
      </motion.p>

      {/* Title */}
      <motion.h2
        className="font-paperlogy text-[36px] lg:text-[48px] font-extrabold text-white text-center mb-4"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        {dict.sections.rittyIntro.title}
      </motion.h2>

      {/* Tagline Button */}
      <motion.div
        className="flex items-center justify-center gap-2 bg-white border border-white/30 rounded-full px-6 py-2 mb-8"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Image
          src="/images/logo-sparkle.svg"
          alt=""
          width={13}
          height={13}
          className="rotate-[22deg]"
        />
        <span className="font-paperlogy text-[13px] lg:text-[15px] font-semibold text-[#726df2]">
          {dict.sections.rittyIntro.tagline}
        </span>
        <Image
          src="/images/logo-sparkle.svg"
          alt=""
          width={13}
          height={13}
          className="rotate-[22deg]"
        />
      </motion.div>

      {/* Card Container with Arrows */}
      <div className="relative flex items-center justify-center w-full max-w-[900px] px-4">
        {/* Left Arrow */}
        <motion.button
          onClick={prevSlide}
          className="absolute left-0 lg:left-[-60px] z-10 p-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={dict.aria.previousSlide}
        >
          <svg
            width="50"
            height="75"
            viewBox="0 0 50 75"
            fill="none"
            className="rotate-180"
          >
            <path
              d="M10 20L35 37.5L10 55"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>

        {/* White Card */}
        <motion.div
          className="bg-white rounded-[40px] w-full max-w-[710px] h-[300px] lg:h-[393px] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center w-full h-full"
            >
              <p className="font-paperlogy text-[24px] text-gray-400">
                Slide {currentSlide + 1}
              </p>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right Arrow */}
        <motion.button
          onClick={nextSlide}
          className="absolute right-0 lg:right-[-60px] z-10 p-2"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={dict.aria.nextSlide}
        >
          <svg
            width="50"
            height="75"
            viewBox="0 0 50 75"
            fill="none"
          >
            <path
              d="M10 20L35 37.5L10 55"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </div>

      {/* Pagination Dots */}
      <motion.div
        className="flex items-center gap-4 mt-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-[22px] h-[22px] rounded-full border-[1.5px] border-white transition-all ${
              currentSlide === index
                ? 'bg-white'
                : 'bg-white/65'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </motion.div>
    </section>
  )
}
