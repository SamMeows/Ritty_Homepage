'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import './pre-register.css'
import { trackPreRegisterComplete, trackRegistrationFunnel } from '@/lib/analytics'
import { EMAIL_PATTERN, MAX_EMAIL_LENGTH, type Platform, type PreRegisterResult } from '@/lib/pre-register'
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries'
import { captureAttribution } from '@/lib/attribution'

interface PreRegisterModalProps {
  dict: Dictionary
  locale: Locale
  inline?: boolean
  onClose: () => void
}

type Consents = { age: boolean; privacy: boolean; marketing: boolean }

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
]

function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-purple-start cursor-pointer"
      />
      <span>{children}</span>
    </label>
  )
}

export default function PreRegisterModal({ dict, locale, onClose, inline = false }: PreRegisterModalProps) {
  const t = dict.preRegister
  const started = useRef(false)
  const funnel = (event: Parameters<typeof trackRegistrationFunnel>[0], reason?: 'email' | 'platform' | 'consent' | 'server') =>
    trackRegistrationFunnel(event, locale, { form: inline ? 'inline' : 'modal', ...(reason ? { reason } : {}) })
  const overlayRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const [email, setEmail] = useState('')
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [consents, setConsents] = useState<Consents>({ age: false, privacy: false, marketing: false })
  const [honeypot, setHoneypot] = useState('')
  const [showPrivacyDetail, setShowPrivacyDetail] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<PreRegisterResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const allAgreed = consents.age && consents.privacy && consents.marketing
  const discordUrl = dict.social.find((social) => social.key === 'discord')?.url

  // Keep focus in the dialog without opening the mobile keyboard on arrival.
  useEffect(() => {
    if (inline) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    const previousStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      width: document.body.style.width,
      paddingRight: document.body.style.paddingRight,
    }
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    const paddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = `-${scrollX}px`
    document.body.style.width = '100%'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${paddingRight + scrollbarWidth}px`
    closeRef.current?.focus({ preventScroll: true })

    const viewport = window.visualViewport
    const updateViewport = () => {
      overlayRef.current?.style.setProperty('--register-height', `${viewport?.height ?? window.innerHeight}px`)
      overlayRef.current?.style.setProperty('--register-top', `${viewport?.offsetTop ?? 0}px`)
    }
    updateViewport()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), a[href]'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      Object.assign(document.body.style, previousStyle)
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' })
      previouslyFocused?.focus({ preventScroll: true })
    }
  }, [onClose, inline])

  useEffect(() => {
    if (result) closeRef.current?.focus()
  }, [result])

  // A validation message goes stale as soon as the user edits the form
  useEffect(() => {
    setError(null)
  }, [email, platform, consents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim()

    if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(trimmedEmail)) {
      funnel('pre_register_error', 'email')
      setError(t.errors.email)
      return
    }
    if (!platform) {
      funnel('pre_register_error', 'platform')
      setError(t.errors.platform)
      return
    }
    if (!allAgreed) {
      funnel('pre_register_error', 'consent')
      setError(t.errors.consent)
      return
    }

    setError(null)
    setIsSubmitting(true)
    funnel('pre_register_submit')
    try {
      const attribution = captureAttribution()
      const response = await fetch('/api/pre-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          platform,
          locale,
          consents,
          website: honeypot,
          attribution,
          utm: {
            source: attribution.source,
            medium: attribution.medium,
            campaign: attribution.campaign,
          },
        }),
      })
      if (!response.ok) throw new Error(`Pre-registration failed with ${response.status}`)

      const data: { status: PreRegisterResult } = await response.json()
      if (data.status !== 'created' && data.status !== 'duplicate') throw new Error('Unexpected registration response')
      if (data.status === 'created' && !honeypot) trackPreRegisterComplete(platform, locale)
      if (data.status === 'duplicate') funnel('pre_register_duplicate')
      setResult(data.status)
    } catch {
      funnel('pre_register_error', 'server')
      setError(t.errors.server)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = async () => {
    const path = window.location.pathname.startsWith('/ad/') ? window.location.pathname : locale === 'kr' ? '/' : `/${locale}`
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}?pre-register&utm_source=share`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className={inline ? "pre-register-inline" : "pre-register-overlay fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"}
      onClick={inline ? undefined : onClose}
    >
      <div
        ref={dialogRef}
        role={inline ? "region" : "dialog"}
        aria-modal={inline ? undefined : true}
        aria-labelledby={inline ? "inline-register-title" : "pre-register-title"}
        onClick={(e) => e.stopPropagation()}
        className="pre-register-panel relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-b from-[#1a1520] to-[#0d0a12] p-6 sm:p-8 text-white shadow-2xl break-keep"
      >
        {!inline && <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl leading-none transition-colors hover:bg-white/20"
        >
          ×
        </button>}

        {result ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <Image
              src="/images/sparkle-purple.svg"
              alt={dict.alt.sparkle}
              width={48}
              height={48}
              className="h-12 w-12 animate-sparkle"
            />
            <h2 id={inline ? "inline-register-title" : "pre-register-title"} className="font-paperlogy text-2xl font-extrabold">
              {result === 'created' ? t.successTitle : t.duplicateTitle}
            </h2>
            <p className="text-sm text-gray-300">
              {result === 'created' ? t.successBody : t.duplicateBody}
            </p>
            <div className="mt-2 flex w-full flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="h-12 w-full rounded-xl bg-white font-bold text-text-black transition hover:brightness-95"
              >
                {copied ? t.copied : t.copyLink}
              </button>
              {discordUrl && (
                <a
                  href={discordUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-12 w-full items-center justify-center rounded-xl border border-white/20 font-bold transition-colors hover:bg-white/10"
                >
                  {t.joinDiscord}
                </a>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} onFocusCapture={() => {
            if (!started.current) { started.current = true; funnel('pre_register_start') }
          }} noValidate className="flex flex-col gap-5">
            <div className="px-8 text-center">
              <p className="font-paperlogy text-sm font-bold text-[#fffbc0]">{t.releaseNote}</p>
              <h2 id={inline ? "inline-register-title" : "pre-register-title"} className="mt-1 font-paperlogy text-2xl font-extrabold">
                {t.title}
              </h2>
              <p className="mt-2 text-sm text-gray-300">{t.description}</p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold">{t.emailLabel}</span>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={MAX_EMAIL_LENGTH}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="h-12 rounded-xl border border-white/20 bg-white/10 px-4 text-white select-text placeholder:text-white/40 focus:border-purple-start focus:outline-none"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{t.platformLabel}</legend>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className={`flex h-12 items-center justify-center rounded-xl border font-semibold cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-white ${
                      platform === value
                        ? 'border-purple-start bg-purple-start/30'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="radio"
                      name={inline ? "inline-platform" : "platform"}
                      value={value}
                      checked={platform === value}
                      onChange={() => setPlatform(value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-4 text-sm">
              <ConsentCheckbox
                checked={allAgreed}
                onChange={(checked) => setConsents({ age: checked, privacy: checked, marketing: checked })}
              >
                <span className="font-bold">{t.agreeAll}</span>
              </ConsentCheckbox>
              <hr className="border-white/10" />
              <ConsentCheckbox
                checked={consents.age}
                onChange={(checked) => setConsents((prev) => ({ ...prev, age: checked }))}
              >
                {t.consents.age}
              </ConsentCheckbox>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <ConsentCheckbox
                    checked={consents.privacy}
                    onChange={(checked) => setConsents((prev) => ({ ...prev, privacy: checked }))}
                  >
                    {t.consents.privacy}
                  </ConsentCheckbox>
                  <button
                    type="button"
                    onClick={() => setShowPrivacyDetail((prev) => !prev)}
                    aria-expanded={showPrivacyDetail}
                    className="shrink-0 text-xs text-gray-400 underline hover:text-white"
                  >
                    {showPrivacyDetail ? t.hideDetail : t.showDetail}
                  </button>
                </div>
                {showPrivacyDetail && (
                  <div className="mt-2 ml-8 flex flex-col gap-2 rounded-xl bg-black/30 p-3 text-xs text-gray-300">
                    <dl className="flex flex-col gap-1.5">
                      {t.privacyTable.map((row) => (
                        <div key={row.label} className="flex gap-2">
                          <dt className="w-20 shrink-0 text-gray-400">{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <p>{t.privacyRefusal}</p>
                  </div>
                )}
              </div>
              <div>
                <ConsentCheckbox
                  checked={consents.marketing}
                  onChange={(checked) => setConsents((prev) => ({ ...prev, marketing: checked }))}
                >
                  {t.consents.marketing}
                </ConsentCheckbox>
                <p className="mt-1 ml-8 text-xs text-gray-400">{t.marketingDetail}</p>
              </div>
              <a
                href={dict.links.privacy}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start text-xs text-gray-400 underline hover:text-white"
              >
                {t.privacyPolicyLink}
              </a>
            </div>

            {/* Honeypot: hidden from people, filled in by bots */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />

            {error && (
              <p role="alert" className="text-center text-sm text-red-accent">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-14 rounded-2xl bg-gradient-to-r from-purple-start via-purple-mid to-purple-end font-paperlogy text-lg font-extrabold transition hover:brightness-110 disabled:opacity-60"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
