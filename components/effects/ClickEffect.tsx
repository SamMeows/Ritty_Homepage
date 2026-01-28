'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Particle {
  id: number
  x: number
  y: number
  emoji: string
  angle: number
  distance: number
  scale: number
  rotation: number
}

const emojis = ['🐾', '✨', '💖', '⭐', '🌟', '💕', '🎀', '🐱']

export default function ClickEffect() {
  const [particles, setParticles] = useState<Particle[]>([])

  const createParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = []
    const particleCount = 6 + Math.floor(Math.random() * 4) // 6-9 particles

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        angle: (360 / particleCount) * i + Math.random() * 30 - 15,
        distance: 60 + Math.random() * 40,
        scale: 0.6 + Math.random() * 0.6,
        rotation: Math.random() * 360,
      })
    }

    setParticles((prev) => [...prev, ...newParticles])

    // Remove particles after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)))
    }, 800)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      createParticles(e.clientX, e.clientY)
    }

    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [createParticles])

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => {
          const radians = (particle.angle * Math.PI) / 180
          const endX = Math.cos(radians) * particle.distance
          const endY = Math.sin(radians) * particle.distance

          return (
            <motion.div
              key={particle.id}
              className="absolute text-2xl"
              style={{
                left: particle.x,
                top: particle.y,
                fontSize: `${particle.scale * 24}px`,
              }}
              initial={{
                opacity: 1,
                scale: 0,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                opacity: [1, 1, 0],
                scale: [0, particle.scale, particle.scale * 0.8],
                x: endX,
                y: endY - 20, // Slight upward bias
                rotate: particle.rotation,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.7,
                ease: [0.25, 0.46, 0.45, 0.94],
                opacity: { times: [0, 0.5, 1] },
              }}
            >
              {particle.emoji}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
