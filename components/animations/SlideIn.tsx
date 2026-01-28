'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

interface SlideInProps {
  children: ReactNode
  direction?: 'left' | 'right'
  delay?: number
  duration?: number
  className?: string
}

export default function SlideIn({
  children,
  direction = 'left',
  delay = 0,
  duration = 0.6,
  className = '',
}: SlideInProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  const xOffset = direction === 'left' ? -100 : 100

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: xOffset }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: xOffset }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
