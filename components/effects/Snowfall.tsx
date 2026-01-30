'use client'

import { useEffect, useState, useMemo } from 'react'

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

export default function Snowfall({ count = 50 }: SnowfallProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const snowflakes = useMemo<Snowflake[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 6 + 2,
      duration: Math.random() * 8 + 12,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.5 + 0.3,
      drift: Math.random() * 30 - 15,
    }))
  }, [count])

  if (!isClient) return null

  return (
    <>
      <style jsx>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-20px) translateX(0);
          }
          25% {
            transform: translateY(25vh) translateX(var(--drift));
          }
          50% {
            transform: translateY(50vh) translateX(0);
          }
          75% {
            transform: translateY(75vh) translateX(calc(var(--drift) * -1));
          }
          100% {
            transform: translateY(100vh) translateX(0);
          }
        }
        .snowflake {
          position: absolute;
          border-radius: 50%;
          background: white;
          will-change: transform;
          animation: snowfall var(--duration) linear var(--delay) infinite;
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="snowflake"
            style={{
              left: `${flake.x}%`,
              width: flake.size,
              height: flake.size,
              opacity: flake.opacity,
              boxShadow: '0 0 4px rgba(255, 255, 255, 0.6)',
              '--duration': `${flake.duration}s`,
              '--delay': `${flake.delay}s`,
              '--drift': `${flake.drift}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </>
  )
}
