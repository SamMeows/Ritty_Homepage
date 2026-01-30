'use client'

import { useEffect, useRef, useCallback } from 'react'

const emojis = ['🐾', '✨', '💖', '⭐', '🌟']

export default function ClickEffect() {
  const containerRef = useRef<HTMLDivElement>(null)

  const createParticles = useCallback((x: number, y: number) => {
    const container = containerRef.current
    if (!container) return

    const particleCount = 5
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('span')
      const angle = (360 / particleCount) * i
      const distance = 50 + Math.random() * 30
      const radians = (angle * Math.PI) / 180
      const endX = Math.cos(radians) * distance
      const endY = Math.sin(radians) * distance - 15
      const scale = 0.7 + Math.random() * 0.4
      const rotation = Math.random() * 360

      particle.textContent = emojis[Math.floor(Math.random() * emojis.length)]
      particle.className = 'click-particle'
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        font-size: ${scale * 20}px;
        pointer-events: none;
        will-change: transform, opacity;
        --end-x: ${endX}px;
        --end-y: ${endY}px;
        --rotation: ${rotation}deg;
        animation: particle-burst 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      `
      fragment.appendChild(particle)

      setTimeout(() => particle.remove(), 600)
    }

    container.appendChild(fragment)
  }, [])

  useEffect(() => {
    let rafId: number | null = null

    const handleClick = (e: MouseEvent) => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        createParticles(e.clientX, e.clientY)
      })
    }

    window.addEventListener('click', handleClick, { passive: true })
    return () => {
      window.removeEventListener('click', handleClick)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [createParticles])

  return (
    <>
      <style jsx global>{`
        @keyframes particle-burst {
          0% {
            transform: translate(0, 0) scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--end-x), var(--end-y)) scale(1) rotate(var(--rotation));
            opacity: 0;
          }
        }
      `}</style>
      <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" />
    </>
  )
}
