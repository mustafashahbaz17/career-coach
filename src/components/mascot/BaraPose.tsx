// Bara in any of his five moods, used around the site:
//   hello    – onboarding welcome, empty pages ("nothing here yet")
//   offer    – celebrating (your career tracks are ready)
//   oops     – something didn't work (error messages, page not found)
//   deadline – deadlines (Tracker)
//   vent     – calm, take your time (Vent space)
// By default Bara is decorative (hidden from screen readers) because the text next to him says what's
// going on. Pass `label` when he's the only thing explaining it.
// `motion`: 'idle' = slow gentle bob, 'pop' = springs in once, 'none' = still. All off with reduce-motion.
import { POSES, type BaraPoseName } from './baraPoses'

type Props = {
  pose: BaraPoseName
  size?: number | string // width; height follows the drawing
  label?: string
  motion?: 'idle' | 'pop' | 'none'
  className?: string
}

export default function BaraPose({ pose, size = 120, label, motion = 'idle', className }: Props) {
  const p = POSES[pose]
  return (
    <span className={`bara-pose bara-${motion} ${className || ''}`} style={{ width: typeof size === 'number' ? `${size}px` : size }}>
      <svg
        viewBox={p.viewBox}
        width="100%"
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
        dangerouslySetInnerHTML={{ __html: (label ? `<title>${label}</title>` : '') + p.svg }}
      />
    </span>
  )
}
