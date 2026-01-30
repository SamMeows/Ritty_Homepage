'use client'

import { useEffect, useState, useMemo } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
  opacity: number
}

interface FloatingParticlesProps {
  count?: number
  color?: string
  minSize?: number
  maxSize?: number
}

export default function FloatingParticles({
  count = 15,
  color = '#ffffff',
  minSize = 2,
  maxSize = 5,
}: FloatingParticlesProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: Math.random() * 3 + 4,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.4 + 0.2,
    }))
  }, [count, minSize, maxSize])

  if (!isClient) return null

  return (
    <>
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: var(--opacity);
          }
          50% {
            transform: translateY(-20px) translateX(10px) scale(1.1);
            opacity: calc(var(--opacity) * 1.3);
          }
        }
        .floating-particle {
          position: absolute;
          border-radius: 50%;
          will-change: transform, opacity;
          animation: float var(--duration) ease-in-out var(--delay) infinite;
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="floating-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: particle.size,
              height: particle.size,
              backgroundColor: color,
              boxShadow: `0 0 ${particle.size * 2}px ${color}`,
              '--duration': `${particle.duration}s`,
              '--delay': `${particle.delay}s`,
              '--opacity': particle.opacity,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  )
}
