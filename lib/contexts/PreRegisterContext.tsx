'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import PreRegisterModal from '@/components/pre-register/PreRegisterModal'
import { trackPreRegisterOpen, type PreRegisterSource } from '@/lib/analytics'
import { LAUNCH_PHASE } from '@/lib/launch'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'

interface PreRegisterContextType {
  openPreRegister: (source: PreRegisterSource) => void
}

const PreRegisterContext = createContext<PreRegisterContextType | null>(null)

interface PreRegisterProviderProps {
  dict: Dictionary
  locale: Locale
  children: ReactNode
}

export function PreRegisterProvider({ dict, locale, children }: PreRegisterProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openPreRegister = useCallback(
    (source: PreRegisterSource) => {
      trackPreRegisterOpen(source, locale)
      setIsOpen(true)
    },
    [locale]
  )

  const closePreRegister = useCallback(() => setIsOpen(false), [])

  // Links like /?pre-register open the form directly (SNS bios, ads, shared links)
  useEffect(() => {
    if (LAUNCH_PHASE !== 'pre-register') return
    if (new URLSearchParams(window.location.search).has('pre-register')) {
      openPreRegister('link')
    }
  }, [openPreRegister])

  return (
    <PreRegisterContext.Provider value={{ openPreRegister }}>
      {children}
      {isOpen && <PreRegisterModal dict={dict} locale={locale} onClose={closePreRegister} />}
    </PreRegisterContext.Provider>
  )
}

export function usePreRegister() {
  const context = useContext(PreRegisterContext)
  if (!context) {
    throw new Error('usePreRegister must be used within a PreRegisterProvider')
  }
  return context
}
