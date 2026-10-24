import { residentChapter } from './ritty-residents'
import { homeEnglish, translateHomeMarkup } from './i18n/home-en'
import type { Locale } from './i18n/dictionaries'
import { lifePanelsMarkup } from './life-scenes'

const icon = (name: string) => `<span class="world-icon icon-${name}" aria-hidden="true"></span>`

export function decorateLandingMarkup(markup: string, locale: Locale = 'kr') {
  let result = markup
  result = result.replace(/<section class="cat-world"[\s\S]*?<\/section>/, residentChapter())
  result = result.replace(/(<a href="#meet-ritty" data-nav="meet-ritty"[^>]*>[\s\S]*?<\/a>)(<a href="#day" data-nav="day"[^>]*>[\s\S]*?<\/a>)/, '$2$1')
  result = result.replace(/(<section class="cat-world"[\s\S]*?<\/section>)(\s*)(<section class="day-intro compact-life"[\s\S]*?<\/section>)/, '$3$2$1')
  for (const [section, name] of [['home', 'home'], ['meet-ritty', 'paw'], ['day', 'garden'], ['news', 'letter']]) {
    result = result.replace(new RegExp(`(data-nav="${section}"[^>]*>)`), `$1${icon(name)}`)
  }
  result = result.replace('<main>', '<div class="reading-progress" aria-hidden="true"><span></span></div><main>')
  result = result.replace('<div class="hero-shade"></div>', '<div class="hero-shade"></div><div class="hero-meteors" aria-hidden="true"><span class="shooting-star"></span><span class="shooting-star"></span><span class="shooting-star"></span></div>')
  result = result.replace('<div class="cat-world-heading">', '<img class="raster-charm resident-planet" src="/ritty/art/cat-planet-v2.webp" alt="" width="320" height="320" loading="lazy" aria-hidden="true"><div class="cat-world-heading">')
  // Keep the life scene itself as the focus; the unrelated floating cottage is omitted.
  result = result.replace(/<div class="life-panel-copy"[^>]*>[\s\S]*?<\/div>/, '<div class="life-speech" id="life-speech" aria-live="polite"><span>리티</span><p id="life-dialogue">우와, 이거 네가 키운 거야?</p></div>' + lifePanelsMarkup())
  result = result.replace(/<div class="life-controls">[\s\S]*?<\/div>/, `<div class="life-controls"><button type="button" class="life-arrow" data-life-step="-1" aria-label="이전 생활 장면">‹</button><div class="life-dots" role="group" aria-label="생활 장면 선택">${['텃밭', '요리', '집 꾸미기', '낚시'].map((name, i) => `<button type="button" data-life-slide="${i}" aria-label="${name} 장면 보기" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div><button type="button" class="life-arrow" data-life-step="1" aria-label="다음 생활 장면">›</button></div>`)
  result = result.replace('<div class="news-heading">', '<img class="world-decoration news-island" src="/ritty/art/cat-planet-v2.webp" alt="" width="320" height="320" loading="lazy" aria-hidden="true"><div class="news-heading">')
  result = result.replace('<h2 id="life-heading">', `<h2 id="life-heading">${icon('garden')}`)
  result = result.replace('<h2>리티 소식</h2>', `<h2>${icon('letter')}리티 소식</h2>`)
  result = result.replace(/<div class="hero-sparkles"[^>]*>[\s\S]*?<\/div>/, '')
  result = result.replace(/<span class="cat-orbit-star"[^>]*>[\s\S]*?<\/span>/, '<img class="raster-charm resident-star" src="/ritty/art/star-cloud-v2.webp" alt="" width="160" height="160" loading="lazy" aria-hidden="true">')
  result = result.replace('<div class="hero-actions">', '<div class="hero-actions"><img class="raster-charm cta-charm" src="/ritty/art/star-cloud-v2.webp" alt="" width="160" height="160" aria-hidden="true">')
  result = result.replace('<footer class="ad-footer">', '<footer class="ad-footer"><img class="raster-charm footer-planet" src="/ritty/art/cat-planet-v2.webp" alt="" width="320" height="320" loading="lazy" aria-hidden="true">')
  result = result.replace(/[✦✧]/g, '')
  result = result.replace('<div class="cat-world-heading">', `<div class="scene-depth" aria-hidden="true"><div class="scene-plane scene-sky" data-depth="0.32"></div><div class="scene-plane scene-clouds" data-depth="0.16"></div><div class="scene-plane scene-hills" data-depth="-0.12"></div></div><div class="cat-world-heading">`)
  if (locale === 'en') {
    result = translateHomeMarkup(result).replace('<div class="ritty-site">', '<div class="ritty-site" lang="en">')
    result = result.replace('</main>', `<script type="application/json" id="landing-translations">${JSON.stringify(homeEnglish).replace(/</g, '\\u003c')}</script></main>`)
  }
  return result
}

export function mountLandingMotion(node: HTMLElement) {
  const root = node.querySelector<HTMLElement>('.ritty-site')
  if (!root) return () => {}
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const onNavigate = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[data-nav], a.brand[href="#home"]')
    if (!link || !root.contains(link)) return
    const target = root.querySelector<HTMLElement>(link.hash)
    if (!target) return
    event.preventDefault()
    if (location.hash !== link.hash) history.pushState(null, '', link.hash)
    window.scrollTo({
      top: Math.max(0, target.getBoundingClientRect().top + window.scrollY),
      behavior: reduced.matches ? 'instant' : 'smooth',
    })
  }
  root.addEventListener('click', onNavigate)
  const targets: [string, string][] = [
    ['.cat-world-heading', 'left'], ['.cat-profile-copy', 'left'], ['.cat-portrait-stage', 'right'],
    ['.compact-life>h2', 'up'], ['.life-picker', 'right'], ['.news-heading', 'left'],
    ['#news-feed', 'right'], ['.news-more', 'up'], ['.join-copy', 'left'], ['#registration-form', 'right'],
    ['.footer-socials', 'up'], ['.company-details', 'up'], ['.garden-island', 'left'], ['.news-island', 'right'],
  ]
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed')
      observer.unobserve(entry.target)
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' })
  for (const [selector, direction] of targets) root.querySelectorAll<HTMLElement>(selector).forEach(el => {
    const box = el.getBoundingClientRect()
    el.dataset.reveal = direction
    // Anchor links and the initial viewport must never wait for an animation.
    if (reduced.matches || (box.top < innerHeight && box.bottom > 0)) el.classList.add('is-revealed')
    else observer.observe(el)
  })
  root.classList.add('motion-ready')
  const depthTargets: [string, number][] = [
    ['.resident-planet', -.24], ['.resident-star', .28], ['.cat-portrait-crop', -.1],
    ['.garden-island', -.18], ['.news-island', -.2], ['.hero-charm', .25], ['.footer-planet', .2],
  ]
  for (const [selector, speed] of depthTargets) root.querySelectorAll<HTMLElement>(selector).forEach(el => {
    el.dataset.depth = String(speed)
    el.classList.add('parallax-art')
  })
  const planes = Array.from(root.querySelectorAll<HTMLElement>('[data-depth]')).map(el => ({
    el, speed: Number(el.dataset.depth), section: el.closest('section, footer') as HTMLElement,
  }))
  let frame = 0
  const update = () => {
    frame = 0
    const max = document.documentElement.scrollHeight - innerHeight
    root.style.setProperty('--reading-progress', String(max > 0 ? scrollY / max : 0))
    const stationary = reduced.matches || root.classList.contains('motion-paused')
    for (const { el, speed, section } of planes) {
      const box = section.getBoundingClientRect()
      if (stationary || (box.bottom > -100 && box.top < innerHeight + 100)) {
        // Each plane retains its own speed throughout a full chapter scroll.
        // A shared small cap made every layer stop together almost immediately.
        const limit = el.classList.contains('scene-plane') ? 200 : 110
        const distance = Math.max(-limit, Math.min(limit, -box.top * speed))
        el.style.setProperty('--depth-y', `${stationary ? 0 : distance}px`)
      }
    }
  }
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  reduced.addEventListener('change', onScroll)
  const motionObserver = new MutationObserver(onScroll)
  motionObserver.observe(root, { attributes: true, attributeFilter: ['class'] })
  update()
  return () => {
    observer.disconnect()
    root.removeEventListener('click', onNavigate)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    reduced.removeEventListener('change', onScroll)
    motionObserver.disconnect()
    cancelAnimationFrame(frame)
    root.classList.remove('motion-ready')
  }
}
