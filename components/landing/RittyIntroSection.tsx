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
  const slideImages = dict.sections.rittyIntro.slides
  const totalSlides = slideImages.length

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
        backgroundColor: '#564596',
      }}
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top right large decoration */}
        <motion.div
          className="absolute -top-10 -right-20 w-[350px] h-[350px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.68 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={{ transform: 'rotate(-154deg)' }}
        >
          <Image
            src="/images/star-decoration.svg"
            alt=""
            fill
            className="object-contain"
          />
        </motion.div>

        {/* Top center decoration */}
        <motion.div
          className="absolute top-10 right-1/4 w-[250px] h-[250px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.68 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
          style={{ transform: 'rotate(-154deg)' }}
        >
          <Image
            src="/images/star-decoration.svg"
            alt=""
            fill
            className="object-contain"
          />
        </motion.div>

        {/* Bottom right small decoration */}
        <motion.div
          className="absolute bottom-32 right-1/4 w-[180px] h-[180px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.68 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          style={{ transform: 'rotate(-154deg)' }}
        >
          <Image
            src="/images/star-decoration.svg"
            alt=""
            fill
            className="object-contain"
          />
        </motion.div>

        {/* Left large decoration */}
        <motion.div
          className="absolute bottom-10 -left-20 w-[380px] h-[380px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.68 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.8 }}
          style={{ transform: 'rotate(-154deg)' }}
        >
          <Image
            src="/images/star-decoration.svg"
            alt=""
            fill
            className="object-contain"
          />
        </motion.div>

        {/* Center left decoration */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[280px] h-[280px]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.68 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.8 }}
          style={{ transform: 'rotate(153deg)' }}
        >
          <Image
            src="/images/star-decoration.svg"
            alt=""
            fill
            className="object-contain"
          />
        </motion.div>
      </div>

      {/* Title */}
      <motion.h2
        className="font-paperlogy text-[clamp(28px,5vw,80px)] font-extrabold text-white text-center mb-[1vh] z-10"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
      >
        {dict.sections.rittyIntro.title}
      </motion.h2>

      {/* Tagline Button */}
      <motion.div
        className="flex items-center justify-center gap-[clamp(8px,1vw,16px)] bg-white border border-white/30 rounded-full px-[clamp(16px,2vw,28px)] py-[clamp(8px,1vh,12px)] mb-[3vh] z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Image
          src="/images/sparkle-purple.svg"
          alt=""
          width={22}
          height={22}
          className="rotate-[22deg] w-[clamp(14px,1.5vw,22px)] h-[clamp(14px,1.5vw,22px)]"
        />
        <span className="font-paperlogy text-[clamp(11px,1.4vw,22px)] font-semibold text-[#726df2]">
          {dict.sections.rittyIntro.tagline}
        </span>
        <Image
          src="/images/sparkle-purple.svg"
          alt=""
          width={22}
          height={22}
          className="rotate-[22deg] w-[clamp(14px,1.5vw,22px)] h-[clamp(14px,1.5vw,22px)]"
        />
      </motion.div>

      {/* Card Container with Arrows */}
      <div className="relative flex items-center justify-center w-full max-w-[90vw] lg:max-w-[1200px] px-4 z-10">
        {/* Left Arrow */}
        <motion.button
          onClick={prevSlide}
          className="absolute left-2 lg:left-[-70px] z-10 w-[clamp(30px,3vw,50px)] aspect-[2/3]"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={dict.aria.previousSlide}
        >
          <Image
            src="/images/arrow-right.svg"
            alt=""
            width={50}
            height={75}
            className="rotate-180 w-full h-full"
          />
        </motion.button>

        {/* White Card */}
        <motion.div
          className="bg-white rounded-[clamp(20px,3vw,42px)] w-[clamp(300px,75vw,1000px)] aspect-[1000/540] flex items-center justify-center overflow-hidden p-[clamp(12px,1.5vw,20px)]"
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
              className="relative w-full h-full rounded-[clamp(16px,2vw,32px)] overflow-hidden bg-[#d2d2d2]"
            >
              <Image
                src={slideImages[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                fill
                className="object-cover"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right Arrow */}
        <motion.button
          onClick={nextSlide}
          className="absolute right-2 lg:right-[-70px] z-10 w-[clamp(30px,3vw,50px)] aspect-[2/3]"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label={dict.aria.nextSlide}
        >
          <Image
            src="/images/arrow-right.svg"
            alt=""
            width={50}
            height={75}
            className="w-full h-full"
          />
        </motion.button>
      </div>

      {/* Pagination Dots */}
      <motion.div
        className="flex items-center gap-[clamp(10px,1.2vw,18px)] mt-[2vh] z-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        {Array.from({ length: totalSlides }).map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-[clamp(16px,1.6vw,26px)] h-[clamp(16px,1.6vw,26px)] rounded-full border-[2px] border-white transition-all ${
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
