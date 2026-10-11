'use client'

import { usePreRegister } from '@/lib/contexts/PreRegisterContext'
import type { Dictionary } from '@/lib/i18n/dictionaries'

interface PreRegisterButtonProps {
  dict: Dictionary
}

export default function PreRegisterButton({ dict }: PreRegisterButtonProps) {
  const { openPreRegister } = usePreRegister()

  return (
    // The release note sits above the button without taking layout space, so the button stays where the store buttons were
    <div className="relative flex justify-center">
      <span className="absolute bottom-full mb-[clamp(8px,1vw,14px)] whitespace-nowrap rounded-full bg-black/35 px-4 py-1 font-paperlogy text-[clamp(13px,1.2vw,18px)] font-bold text-white backdrop-blur-sm">
        {dict.preRegister.releaseNote}
      </span>
      <button
        onClick={() => openPreRegister('hero')}
        className="min-w-[clamp(220px,28vw,440px)] h-[clamp(52px,6.3vw,104px)] px-8 rounded-[clamp(14px,1.8vw,29px)] border-2 border-white/70 bg-gradient-to-r from-purple-start via-purple-mid to-purple-end font-paperlogy text-[clamp(18px,2.2vw,34px)] font-extrabold text-white animate-glow-pulse transition-transform duration-200 hover:scale-105 hover:-translate-y-1 active:scale-95"
      >
        {dict.preRegister.cta}
      </button>
    </div>
  )
}
