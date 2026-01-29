'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

interface Snowflake {
  id: number
  x: number
  size: number
  duration: number
  delay: number
  opacity: number
  drift: number
}

interface SnowfallProps {
  count?: number
}

export default function Snowfall({ count = 200 }: SnowfallProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const snowflakes = useMemo<Snowflake[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 8 + 2,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.6 + 0.4,
      drift: Math.random() * 40 - 20,
    }))
  }, [count])

  if (!isClient) return null

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
      {snowflakes.map((flake) => (
        <motion.div
          key={flake.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${flake.x}%`,
            width: flake.size,
            height: flake.size,
            opacity: flake.opacity,
            filter: 'blur(0.5px)',
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
          }}
          initial={{
            y: -20,
            x: 0,
          }}
          animate={{
            y: '100vh',
            x: [0, flake.drift, 0, -flake.drift, 0],
          }}
          transition={{
            y: {
              duration: flake.duration,
              repeat: Infinity,
              ease: 'linear',
              delay: flake.delay,
            },
            x: {
              duration: flake.duration / 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: flake.delay,
            },
          }}
        />
      ))}
    </div>
  )
}
