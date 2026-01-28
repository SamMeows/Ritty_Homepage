'use client'

import { motion } from 'framer-motion'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface NewsSectionProps {
  dict: Dictionary
}

export default function NewsSection({ dict }: NewsSectionProps) {
  return (
    <section
      id="news"
      className="bg-news-bg h-screen flex items-center justify-center overflow-hidden snap-start snap-always"
    >
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <motion.div
          className="flex flex-col items-center justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{
            type: 'spring',
            stiffness: 100,
            damping: 15,
            delay: 0.2,
          }}
        >
          <motion.h2
            className="font-paperlogy text-[48px] font-extrabold text-text-black mb-6 leading-[1.42]"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {dict.sections.news.title} sector
          </motion.h2>
        </motion.div>
      </div>
    </section>
  )
}
