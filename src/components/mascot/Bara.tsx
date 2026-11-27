// Bara the capybara (the "Hi!" pose), built from separate SVG layers so each part can move on its own:
//   body + clipboard arm  →  .bara-body
//   the waving arm        →  .bara-wave   (rotates from the shoulder)
//   head                  →  .bara-head   (calm or happy eyes)
//   the orange            →  .bara-orange (wobbles)
// The shapes come from the same drawing code as the mascot sheet. Animations live in splash.css.
import { BODY, DEFS, HEAD_CALM, HEAD_HAPPY, ORANGE, WAVE_ARM } from './baraParts'

const LABEL = 'Bara the capybara, your career coach, waving hello with a clipboard and an orange balanced on his head'

export default function Bara({ happy = false, className }: { happy?: boolean; className?: string }) {
  return (
    <svg className={`bara ${className || ''}`} viewBox="0 0 240 250" role="img" aria-label={LABEL}>
      <title>{LABEL}</title>
      <defs dangerouslySetInnerHTML={{ __html: DEFS }} />
      <g className="bara-body" dangerouslySetInnerHTML={{ __html: BODY }} />
      <g className="bara-wave" dangerouslySetInnerHTML={{ __html: WAVE_ARM }} />
      <g className="bara-head" dangerouslySetInnerHTML={{ __html: happy ? HEAD_HAPPY : HEAD_CALM }} />
      <g className="bara-orange" dangerouslySetInnerHTML={{ __html: ORANGE }} />
    </svg>
  )
}
