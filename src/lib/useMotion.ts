// Site-wide motion helpers, used once in the page frame (PublicLayout). No libraries.
//
// 1. Scroll reveal: headings, cards and sections fade and slide in as they enter the screen.
//    Elements are found by the selectors below, so pages don't need any changes. Groups of siblings
//    (e.g. a row of cards) get a small stagger. New elements that appear later (after data loads)
//    are picked up too. Each element animates once.
// 2. Card spotlight: on devices with a mouse, cards get a soft glow that follows the cursor.
// Both switch off completely when the visitor has "reduce motion" turned on.
import { useEffect } from 'react'

const REVEAL = [
  '.page-head', '.sec-title', '.pub-sec > h2', '.pub-sec > div > h2', '.pub-sec > div > p', '.pub-sec > p',
  '.grid > .card', '.grid > article', '.journey > .step', '.faq > details', '.faq > h2',
  '.hero > .stack-m > *', '.hero-board-wrap', '.steps', '.placeholder',
].join(',')

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function useScrollReveal(root: HTMLElement | null, key: string) {
  useEffect(() => {
    if (!root || reduced() || !('IntersectionObserver' in window)) return

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('rv-in')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )

    const tag = () => {
      root.querySelectorAll<HTMLElement>(REVEAL).forEach((el) => {
        if (el.dataset.rv || el.classList.contains('view') || el.closest('.no-rv')) return
        el.dataset.rv = '1'
        // stagger by position among matching siblings (capped so long lists don't wait)
        const sibs = el.parentElement ? Array.from(el.parentElement.children).filter((c) => c.matches(REVEAL)) : [el]
        el.style.setProperty('--rv-i', String(Math.min(sibs.indexOf(el), 6)))
        el.classList.add('rv')
        io.observe(el)
      })
    }

    tag()
    let raf = 0
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(tag)
    })
    mo.observe(root, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [root, key])
}

export function useCardSpotlight() {
  useEffect(() => {
    if (reduced() || !window.matchMedia('(hover: hover)').matches) return
    const onMove = (ev: PointerEvent) => {
      const card = (ev.target as Element | null)?.closest<HTMLElement>('.grid > .card, .grid > article, .journey > .step')
      if (!card) return
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${ev.clientX - r.left}px`)
      card.style.setProperty('--my', `${ev.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    return () => document.removeEventListener('pointermove', onMove)
  }, [])
}

// Gentle parallax: writes the scroll position into a CSS variable (--sy) on the given element.
// Decorations use it in their transform. Only runs while that page is open.
export function useParallax(el: HTMLElement | null) {
  useEffect(() => {
    if (!el || reduced()) return
    let raf = 0
    const update = () => {
      raf = 0
      el.style.setProperty('--sy', String(Math.round(window.scrollY)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [el])
}
