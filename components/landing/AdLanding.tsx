'use client'

import '@/components/landing/ad-site.css'
import '@/components/landing/world-patterns.css'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import MusicToggle from '@/components/ui/MusicToggle'
import LanguageDropdown from '@/components/ui/LanguageDropdown'
import PreRegisterModal from '@/components/pre-register/PreRegisterModal'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'
import NewsFeed from '@/components/news/NewsFeed'
import type { NewsPage } from '@/lib/news'
import { usePreRegister } from '@/lib/contexts/PreRegisterContext'
import { captureAttribution } from '@/lib/attribution'
import { decorateLandingMarkup, mountLandingMotion } from '@/lib/landing-art'

export default function AdLanding({ markup, news, newsPreview = '', dict, locale = 'kr' }: { markup: string; news:NewsPage; newsPreview?:string; dict:Dictionary; locale?: Locale }) {
  const ref = useRef<HTMLDivElement>(null)
  const [newsTarget,setNewsTarget]=useState<Element|null>(null)
  const [toolsTarget,setToolsTarget]=useState<Element|null>(null)
  const [formTarget,setFormTarget]=useState<Element|null>(null)
  const staticMarkup=useMemo(()=><div ref={ref} dangerouslySetInnerHTML={{__html:decorateLandingMarkup(markup, locale).replace('<div id="news-feed"></div>', () => `<div id="news-feed">${newsPreview}</div>`)}}/>,[markup, locale, newsPreview])
  const { openPreRegister } = usePreRegister()
  // Replace the server preview with the identical interactive component before
  // painting. Without JavaScript, the real article links remain available.
  useLayoutEffect(() => {
    const target = ref.current?.querySelector('#news-feed')
    if (!target) return
    target.replaceChildren()
    setNewsTarget(target)
  }, [markup, locale, newsPreview])
  useEffect(() => {
    captureAttribution()
    const node = ref.current!
    setToolsTarget(node.querySelector('#header-tools'))
    setFormTarget(node.querySelector('#registration-form'))
    const disposeMotion = mountLandingMotion(node)
    const open = (event: MouseEvent) => {
      if ((event.target as Element).closest('[data-register]')) {
        event.preventDefault()
        openPreRegister('landing')
      }
    }
    node.addEventListener('click', open)
    const script = document.createElement('script')
    script.src = '/ritty/site.js?v=20261024-home-languages'
    node.appendChild(script)
    return () => {
      disposeMotion()
      node.removeEventListener('click', open); script.remove(); window.dispatchEvent(new Event('ritty:dispose'))
      const root = node.querySelector<HTMLElement>('.ritty-site')
      if (root) delete root.dataset.interactiveReady
    }
  }, [openPreRegister, markup, locale])
  return <>{staticMarkup}{newsTarget&&createPortal(<NewsFeed initial={news} locale={locale}/>,newsTarget)}{toolsTarget&&createPortal(<><MusicToggle ariaLabel={dict.aria.toggleMusic}/><LanguageDropdown currentLocale={locale} ariaLabel={dict.aria.changeLanguage}/></>,toolsTarget)}{formTarget&&createPortal(<PreRegisterModal dict={dict} locale={locale} inline onClose={()=>{}}/>,formTarget)}</>
}
