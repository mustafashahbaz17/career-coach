// Site-wide motion helpers, used once in the page frame (PublicLayout). No libraries.
//
// 1. Scroll reveal: headings, cards and sections fade and slide in as they enter the screen.
//    Elements are found by the selectors below, so pages don't need any changes. Groups of siblings
//    (e.g. a row of cards) get a small stagger. New elements that appear later (after data loads)
//    are picked up too. Each element animates once.
// 2. Card spotlight: on devices with a mouse, cards get a soft glow that follows the cursor.
// Both switch off completely when the visitor has "reduce motion" turned on.
import { useEffect, useState } from 'react'

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

    // Backup check (doesn't rely on IntersectionObserver): reveal anything that is on screen.
    // Runs after tagging, on scroll/resize, and shortly after new content appears. This guarantees
    // content can never stay invisible, whatever the browser's timing (e.g. iPhone Safari).
    const showVisible = () => {
      root.querySelectorAll<HTMLElement>('.rv:not(.rv-in)').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight - 8 && r.bottom > 0) {
          el.classList.add('rv-in')
          io.unobserve(el)
        }
      })
    }
    let tick = 0
    const onScroll = () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; showVisible() }) }
    let backup = 0
    let f1 = 0, f2 = 0
    const soon = () => {
      // two frames later (so the fade still plays), then once more after a moment for late layout
      cancelAnimationFrame(f1); cancelAnimationFrame(f2)
      f1 = requestAnimationFrame(() => { f2 = requestAnimationFrame(showVisible) })
      clearTimeout(backup); backup = window.setTimeout(showVisible, 900)
    }

    tag()
    soon()
    let raf = 0
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { tag(); soon() })
    })
    mo.observe(root, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      io.disconnect()
      mo.disconnect()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(tick)
      cancelAnimationFrame(f1)
      cancelAnimationFrame(f2)
      clearTimeout(backup)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      // When the page changes, this run stops. Un-tag anything it hadn't revealed yet, so the next
      // run picks it up again (otherwise elements tagged at the moment of navigation could stay hidden).
      root.querySelectorAll<HTMLElement>('.rv:not(.rv-in)').forEach((el) => {
        delete el.dataset.rv
        el.classList.remove('rv')
      })
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

// Scroll progress: writes how far down the page you are (0–1) into --scroll-p on <html>.
// The thin orange line under the top bar uses it. Cheap: one rAF per scroll frame.
export function useScrollProgress() {
  useEffect(() => {
    const root = document.documentElement
    let raf = 0
    const update = () => {
      raf = 0
      const max = root.scrollHeight - window.innerHeight
      root.style.setProperty('--scroll-p', String(max > 0 ? Math.min(1, window.scrollY / max) : 0))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    const ro = new ResizeObserver(on)
    ro.observe(document.body)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      ro.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])
}

// Which section is on screen: returns the id of the last section whose top has passed 40% of the screen.
// Used by the landing page's numbered side menu.
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      let cur = ids[0]
      for (const id of ids) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = id
      }
      // at the very bottom the last section can't reach the top, so light it up anyway
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      const last = document.getElementById(ids[ids.length - 1])
      if (atBottom && last && last.getBoundingClientRect().top < window.innerHeight) cur = ids[ids.length - 1]
      setActive(cur)
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [ids.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  return active
}

// Word-by-word brightening: as the element scrolls up through the screen, its words go from dim to bright.
// Sets --lit (0–1) on each word span. With reduce-motion, all words stay fully bright.
export function useWordScrub(el: HTMLElement | null) {
  useEffect(() => {
    if (!el) return
    const words = Array.from(el.querySelectorAll<HTMLElement>('.w'))
    if (reduced()) { words.forEach((w) => w.style.setProperty('--lit', '1')); return }
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      // 0 when the text's top is at 90% of the screen, 1 when it reaches 45%
      const p = Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (vh * 0.45)))
      const lit = p * words.length
      words.forEach((w, i) => w.style.setProperty('--lit', String(Math.max(0, Math.min(1, lit - i)))))
    }
    const on = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [el])
}
