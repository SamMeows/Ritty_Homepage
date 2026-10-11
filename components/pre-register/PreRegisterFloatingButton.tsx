'use client'

import { useEffect, useState } from 'react'
import { usePreRegister } from '@/lib/contexts/PreRegisterContext'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface PreRegisterFloatingButtonProps {
  dict: Dictionary
}

// Shown once the hero's button scrolls out of view, hidden again over the footer so it never covers its links
export default function PreRegisterFloatingButton({ dict }: PreRegisterFloatingButtonProps) {
  const { openPreRegister } = usePreRegister()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const targets = ['home', 'footer']
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)
    const inView = new Set<Element>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) inView.add(entry.target)
          else inView.delete(entry.target)
        })
        setIsVisible(inView.size === 0)
      },
      { threshold: 0.1 }
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return (
    <button
      onClick={() => openPreRegister('floating')}
      className={`fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:left-auto lg:right-[42px] lg:translate-x-0 h-14 px-8 rounded-full border-2 border-white/70 bg-gradient-to-r from-purple-start via-purple-mid to-purple-end font-paperlogy text-lg font-extrabold text-white shadow-lg animate-glow-pulse transition-all duration-300 ${
        isVisible ? 'visible opacity-100 translate-y-0' : 'invisible opacity-0 translate-y-4'
      }`}
    >
      {dict.preRegister.cta}
    </button>
  )
}
