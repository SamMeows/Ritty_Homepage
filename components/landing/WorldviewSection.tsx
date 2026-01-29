'use client'

import { motion } from 'framer-motion'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface WorldviewSectionProps {
  dict: Dictionary
}

export default function WorldviewSection({ dict }: WorldviewSectionProps) {
  const renderStoryLine = (line: string, index: number) => {
    if (line === '') {
      return <br key={index} />
    }

    // Handle bold text marked with {text}
    const parts = line.split(/(\{[^}]+\})/)
    return (
      <p key={index} className="leading-[1.42] mb-0">
        {parts.map((part, i) => {
          if (part.startsWith('{') && part.endsWith('}')) {
            const text = part.slice(1, -1)
            return (
              <span key={i} className="font-bold">
                {text}
              </span>
            )
          }
          return <span key={i}>{part}</span>
        })}
      </p>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
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
        stiffness: 100,
        damping: 15,
      },
    },
  }

  return (
    <section
      id="worldview"
      className="bg-[#3c3c3c] w-full h-screen flex flex-col items-center justify-center snap-start snap-always overflow-hidden px-6"
    >
      <motion.div
        className="max-w-[1440px] mx-auto flex flex-col items-center text-center text-white"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* Label */}
        <motion.p
          className="font-paperlogy text-[20px] font-extrabold mb-6"
          variants={itemVariants}
        >
          {dict.sections.worldview.label}
        </motion.p>

        {/* Title */}
        <motion.div
          className="mb-16 lg:mb-20"
          variants={itemVariants}
        >
          <h2 className="font-paperlogy text-[32px] lg:text-[48px] font-extrabold leading-[1.42]">
            {dict.sections.worldview.title1}
          </h2>
          <h2 className="font-paperlogy text-[32px] lg:text-[48px] font-extrabold leading-[1.42]">
            {dict.sections.worldview.title2}
          </h2>
        </motion.div>

        {/* Story */}
        <motion.div
          className="font-paperlogy text-[18px] lg:text-[25px] font-normal text-center"
          variants={itemVariants}
        >
          {dict.sections.worldview.story.map((line, index) =>
            renderStoryLine(line, index)
          )}
        </motion.div>
      </motion.div>
    </section>
  )
}