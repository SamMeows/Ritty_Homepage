'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

interface ScrollIndicatorProps {
  targetId: string
  ariaLabel: string
}

export default function ScrollIndicator({ targetId, ariaLabel }: ScrollIndicatorProps) {
  const handleClick = () => {
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.button
      onClick={handleClick}
      aria-label={ariaLabel}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[75px] h-[50px] flex items-center justify-center cursor-pointer bg-transparent border-none"
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: 1,
        y: [0, 15, 0],
      }}
      transition={{
        opacity: { delay: 1, duration: 0.5 },
        y: {
          delay: 1.5,
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        },
      }}
      whileHover={{
        scale: 1.2,
        transition: { type: 'spring', stiffness: 400, damping: 17 },
      }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        animate={{ rotate: 180 }}
        transition={{ duration: 0 }}
      >
        <Image
          src="/images/scroll-arrow.svg"
          alt=""
          width={75}
          height={50}
          className="w-[75px] h-[50px] object-contain"
        />
      </motion.div>
    </motion.button>
  )
}
