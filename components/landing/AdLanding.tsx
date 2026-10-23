'use client'

import '@/components/landing/ad-site.css'
import '@/components/landing/world-patterns.css'

import { useEffect, useRef } from 'react'
import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import MusicToggle from '@/components/ui/MusicToggle'
import LanguageDropdown from '@/components/ui/LanguageDropdown'
import PreRegisterModal from '@/components/pre-register/PreRegisterModal'
import type { Dictionary } from '@/lib/i18n/dictionaries'
import NewsFeed from '@/components/news/NewsFeed'
import type { NewsPage } from '@/lib/news'
import { usePreRegister } from '@/lib/contexts/PreRegisterContext'
import { captureAttribution } from '@/lib/attribution'
import { decorateLandingMarkup, mountLandingMotion } from '@/lib/landing-art'

export default function AdLanding({ markup, news, dict }: { markup: string; news:NewsPage; dict:Dictionary }) {
  const ref = useRef<HTMLDivElement>(null)
  const [newsTarget,setNewsTarget]=useState<Element|null>(null)
  const [toolsTarget,setToolsTarget]=useState<Element|null>(null)
  const [formTarget,setFormTarget]=useState<Element|null>(null)
  const staticMarkup=useMemo(()=><div ref={ref} dangerouslySetInnerHTML={{__html:decorateLandingMarkup(markup)}}/>,[markup])
  const { openPreRegister } = usePreRegister()
  useEffect(() => {
    captureAttribution()
    const node = ref.current!
    setNewsTarget(node.querySelector('#news-feed'))
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
    script.src = '/ritty/site.js?v=20261023-scene-dots-dialogue'
    node.appendChild(script)
    return () => {
      disposeMotion()
      node.removeEventListener('click', open); script.remove(); window.dispatchEvent(new Event('ritty:dispose'))
      const root = node.querySelector<HTMLElement>('.ritty-site')
      if (root) delete root.dataset.interactiveReady
    }
  }, [openPreRegister])
  return <>{staticMarkup}{newsTarget&&createPortal(<NewsFeed initial={news}/>,newsTarget)}{toolsTarget&&createPortal(<><MusicToggle ariaLabel="배경 음악 재생 또는 정지"/><LanguageDropdown currentLocale="kr" ariaLabel="언어 설정"/></>,toolsTarget)}{formTarget&&createPortal(<PreRegisterModal dict={dict} locale="kr" inline onClose={()=>{}}/>,formTarget)}</>
}
