'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import ScrollIndicator from '@/components/ui/ScrollIndicator'
import GlowingStars from '@/components/effects/GlowingStars'
import FloatingParticles from '@/components/effects/FloatingParticles'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface WorldviewSectionProps {
  dict: Dictionary
}

export default function WorldviewSection({ dict }: WorldviewSectionProps) {
  const renderStoryLine = (line: string, index: number, isLast: boolean) => {
    if (line === '') {
      return <p key={index} className="leading-[1.85] mb-0">&nbsp;</p>
    }

    // Handle bold text marked with {text}
    const parts = line.split(/(\{[^}]+\})/)
    return (
      <p key={index} className={`leading-[1.85] mb-0 ${isLast ? 'text-[25px] lg:text-[45px] mt-2' : ''}`}>
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
        staggerChildren: 0.05,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
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
      className="relative w-full h-screen flex items-center justify-center snap-start snap-always overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/worldview-bg.png"
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Gradient Overlay - darker in center */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(270deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0.75) 65%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Glowing Stars Effect */}
      <GlowingStars count={25} />

      {/* Floating Particles */}
      <FloatingParticles count={15} color="rgba(255, 255, 255, 0.6)" minSize={1} maxSize={3} />

      {/* Story Text */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center text-white font-paperlogy text-[16px] lg:text-[25px] font-normal px-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        {dict.sections.worldview.story.map((line, index, arr) => (
          <motion.div key={index} variants={itemVariants}>
            {renderStoryLine(line, index, index === arr.length - 1)}
          </motion.div>
        ))}
      </motion.div>

      {/* Scroll Indicator */}
      <ScrollIndicator targetId="ritty-intro" ariaLabel={dict.aria.scrollDown} />
    </section>
  )
}
