'use client'

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from 'react'

interface MusicContextType {
  isPlaying: boolean
  toggleMusic: () => void
}

const MusicContext = createContext<MusicContextType | null>(null)

export function MusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/audio/bgm.mp3')
    audioRef.current.loop = true
    audioRef.current.volume = 0.3

    const savedPreference = localStorage.getItem('musicPlaying')
    if (savedPreference === 'true') {
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
      })
      setIsPlaying(true)
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const toggleMusic = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      localStorage.setItem('musicPlaying', 'false')
    } else {
      audioRef.current.play().catch(() => {
        console.warn('Audio playback failed')
      })
      localStorage.setItem('musicPlaying', 'true')
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <MusicContext.Provider value={{ isPlaying, toggleMusic }}>
      {children}
    </MusicContext.Provider>
  )
}

export function useMusic() {
  const context = useContext(MusicContext)
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider')
  }
  return context
}
