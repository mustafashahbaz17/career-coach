// /onboarding — the 2-step set-up: 1. About you  2. Interest quiz  → then the results.
// Which step shows comes from `profiles.onboarding_step` ('basic_info' → form, 'quiz' → quiz, 'done' → results),
// so closing the tab and coming back resumes in the right place.
// /onboarding?edit=1 opens the About-you form again for a student who has finished (used by "Edit details").
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import ErrorNotice from '../../components/ErrorNotice'
import AboutYou from './AboutYou'
import Quiz from './Quiz'
import Results from './Results'
import BaraPose from '../../components/mascot/BaraPose'

export default function Onboarding() {
  const { profile, profileError, refreshProfile } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [justFinished, setJustFinished] = useState(false)
  const [, rerender] = useState(0)

  if (!profile) {
    return (
      <div className="wrap" style={{ paddingTop: 30 }}>
        {profileError ? (
          <ErrorNotice failure={{ code: 'load_failed', message: 'We couldn’t load your profile. Please try again.', retryable: true }} onRetry={() => void refreshProfile()} />
        ) : (
          <div className="card row" role="status"><span className="spinner" /><span className="muted">Loading…</span></div>
        )}
      </div>
    )
  }

  const step = profile.onboarding_step || 'basic_info'
  const editing = params.get('edit') === '1' && step === 'done'
  const view = editing ? 'about' : step === 'basic_info' ? 'about' : step === 'quiz' ? 'quiz' : 'results'
  const firstName = String(profile.full_name || '').split(' ')[0]

  const heading =
    view === 'about' ? (editing ? 'Edit your details' : `Welcome${firstName ? `, ${firstName}` : ''}! Let’s set up your season`)
    : view === 'quiz' ? 'A quick interest quiz'
    : 'Here’s where you could shine'
  const sub =
    view === 'about' ? (editing ? 'Changes are saved to your profile.' : 'Two short steps. Most students finish in about 3 minutes.')
    : view === 'quiz' ? 'There are no right answers — pick what sounds most like you.'
    : 'Based on your details and quiz answers.'

  return (
    <div className="wrap" style={{ paddingTop: 'clamp(16px,3vw,30px)' }}>
      <div className="page-head">
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3.4vw,36px)' }}>{heading}</h1>
          <p className="muted">{sub}</p>
        </div>
        {view === 'about' && !editing && <BaraPose pose="hello" size={124} motion="pop" />}
      </div>

      {!editing && (
        <div className="steps" style={{ marginBottom: 20 }} aria-label="Progress">
          <span className={`s ${view === 'about' ? 'on' : 'done'}`}><i>{view === 'about' ? 1 : '✓'}</i>About you</span>
          <span className="sep" />
          <span className={`s ${view === 'quiz' ? 'on' : view === 'results' ? 'done' : ''}`}><i>{view === 'results' ? '✓' : 2}</i>Interest quiz</span>
        </div>
      )}

      {view === 'about' && (
        <AboutYou editing={editing} onSaved={() => (editing ? navigate('/dashboard') : rerender((n) => n + 1))} />
      )}
      {view === 'quiz' && <Quiz onBackToDetails={() => rerender((n) => n + 1)} onFinished={() => setJustFinished(true)} />}
      {view === 'results' && <Results justFinished={justFinished} onRedoQuiz={() => { setJustFinished(false); rerender((n) => n + 1) }} />}
    </div>
  )
}
