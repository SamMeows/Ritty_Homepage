'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import PreRegisterModal from '@/components/pre-register/PreRegisterModal'
import { trackPreRegisterOpen, type PreRegisterSource } from '@/lib/analytics'
import PreviewRegistration from '@/components/pre-register/PreviewRegistration'
import { LAUNCH_PHASE } from '@/lib/launch'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'
import { captureAttribution } from '@/lib/attribution'

interface PreRegisterContextType {
  openPreRegister: (source: PreRegisterSource) => void
}

const PreRegisterContext = createContext<PreRegisterContextType | null>(null)

interface PreRegisterProviderProps {
  dict: Dictionary
  locale: Locale
  children: ReactNode
  previewOnly?: boolean
}

export function PreRegisterProvider({ dict, locale, children, previewOnly = false }: PreRegisterProviderProps) {
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
    captureAttribution()
    if (LAUNCH_PHASE !== 'pre-register') return
    if (new URLSearchParams(window.location.search).has('pre-register')) {
      openPreRegister('link')
    }
  }, [openPreRegister])

  return (
    <PreRegisterContext.Provider value={{ openPreRegister }}>
      {children}
      {isOpen && (previewOnly ? <PreviewRegistration onClose={closePreRegister} /> : <PreRegisterModal dict={dict} locale={locale} onClose={closePreRegister} />)}
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
