'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import FloatingParticles from '@/components/effects/FloatingParticles'
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
      {/* Floating Particles Background */}
      <FloatingParticles count={20} color="rgba(255, 255, 255, 0.4)" minSize={2} maxSize={5} />

      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top right large decoration */}
        <motion.div
          className="absolute -top-10 -right-20 w-[350px] h-[350px]"
          initial={{ opacity: 0, scale: 0.5, rotate: -154 }}
          whileInView={{ opacity: 0.68, scale: 1, rotate: -154 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
          animate={{
            y: [0, -20, 0],
            rotate: [-154, -150, -154],
          }}
          whileHover={{ scale: 1.1, rotate: -140 }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          >
            <Image
              src="/images/star-decoration.svg"
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Top center decoration */}
        <motion.div
          className="absolute top-10 right-1/4 w-[250px] h-[250px]"
          initial={{ opacity: 0, scale: 0.5, rotate: -154 }}
          whileInView={{ opacity: 0.68, scale: 1, rotate: -154 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8, type: 'spring' }}
          animate={{
            y: [0, 15, 0],
            x: [0, 10, 0],
          }}
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          >
            <Image
              src="/images/star-decoration.svg"
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Bottom right small decoration */}
        <motion.div
          className="absolute bottom-32 right-1/4 w-[180px] h-[180px]"
          initial={{ opacity: 0, scale: 0.5, rotate: -154 }}
          whileInView={{ opacity: 0.68, scale: 1, rotate: -154 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8, type: 'spring' }}
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          >
            <Image
              src="/images/star-decoration.svg"
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Left large decoration */}
        <motion.div
          className="absolute bottom-10 -left-20 w-[380px] h-[380px]"
          initial={{ opacity: 0, scale: 0.5, rotate: -154 }}
          whileInView={{ opacity: 0.68, scale: 1, rotate: -154 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35, duration: 0.8, type: 'spring' }}
          animate={{
            y: [0, 20, 0],
            rotate: [-154, -158, -154],
          }}
        >
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
          >
            <Image
              src="/images/star-decoration.svg"
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>

        {/* Center left decoration */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[280px] h-[280px]"
          initial={{ opacity: 0, scale: 0.5, rotate: 153 }}
          whileInView={{ opacity: 0.68, scale: 1, rotate: 153 }}
          viewport={{ once: true }}
          transition={{ delay: 0.45, duration: 0.8, type: 'spring' }}
          animate={{
            y: [0, -15, 0],
            x: [0, -10, 0],
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
          >
            <Image
              src="/images/star-decoration.svg"
              alt=""
              fill
              className="object-contain"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Title */}
      <motion.h2
        className="font-paperlogy text-[clamp(28px,5vw,80px)] font-extrabold text-white text-center mb-[1vh] z-10"
        style={{
          textShadow: '0 0 30px rgba(255, 255, 255, 0.5), 0 0 60px rgba(114, 109, 242, 0.3)',
        }}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
        whileHover={{ scale: 1.05, textShadow: '0 0 40px rgba(255, 255, 255, 0.8), 0 0 80px rgba(114, 109, 242, 0.5)' }}
      >
        {dict.sections.rittyIntro.title}
      </motion.h2>

      {/* Tagline Button */}
      <motion.div
        className="flex items-center justify-center gap-[clamp(8px,1vw,16px)] bg-white border border-white/30 rounded-full px-[clamp(16px,2vw,28px)] py-[clamp(8px,1vh,12px)] mb-[3vh] z-10 shadow-lg"
        style={{
          boxShadow: '0 4px 20px rgba(114, 109, 242, 0.3), 0 0 40px rgba(255, 255, 255, 0.2)',
        }}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
        whileHover={{ scale: 1.05, boxShadow: '0 6px 30px rgba(114, 109, 242, 0.5), 0 0 60px rgba(255, 255, 255, 0.3)' }}
        whileTap={{ scale: 0.98 }}
      >
        <motion.div
          animate={{ rotate: [22, 30, 22], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Image
            src="/images/sparkle-purple.svg"
            alt=""
            width={22}
            height={22}
            className="w-[clamp(14px,1.5vw,22px)] h-[clamp(14px,1.5vw,22px)]"
          />
        </motion.div>
        <span className="font-paperlogy text-[clamp(11px,1.4vw,22px)] font-semibold text-[#726df2]">
          {dict.sections.rittyIntro.tagline}
        </span>
        <motion.div
          animate={{ rotate: [22, 14, 22], scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <Image
            src="/images/sparkle-purple.svg"
            alt=""
            width={22}
            height={22}
            className="w-[clamp(14px,1.5vw,22px)] h-[clamp(14px,1.5vw,22px)]"
          />
        </motion.div>
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
          style={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(114, 109, 242, 0.2)',
          }}
          initial={{ opacity: 0, y: 30, rotateX: 10 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
          whileHover={{
            scale: 1.02,
            boxShadow: '0 30px 80px rgba(0, 0, 0, 0.4), 0 0 60px rgba(114, 109, 242, 0.3)',
          }}
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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, type: 'spring' }}
      >
        {Array.from({ length: totalSlides }).map((_, index) => (
          <motion.button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-[clamp(16px,1.6vw,26px)] h-[clamp(16px,1.6vw,26px)] rounded-full border-[2px] border-white transition-colors ${
              currentSlide === index
                ? 'bg-white'
                : 'bg-white/65'
            }`}
            aria-label={`Go to slide ${index + 1}`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={currentSlide === index ? {
              scale: [1, 1.2, 1],
              boxShadow: ['0 0 0px rgba(255,255,255,0)', '0 0 15px rgba(255,255,255,0.8)', '0 0 0px rgba(255,255,255,0)'],
            } : {}}
            transition={{ duration: 0.5 }}
          />
        ))}
      </motion.div>
    </section>
  )
}
