// Shows a failed n8n call in plain words, with "Try again" when the failure is retryable.
// Usage: {failure && <ErrorNotice failure={failure} onRetry={run} />}
import { Link } from 'react-router-dom'
import type { WorkflowFailure } from '../lib/callWorkflow'
import BaraPose from './mascot/BaraPose'

type Props = {
  failure: Pick<WorkflowFailure, 'code' | 'message' | 'retryable'>
  onRetry?: () => void
  onDismiss?: () => void
  retrying?: boolean
}

export default function ErrorNotice({ failure, onRetry, onDismiss, retrying }: Props) {
  const title =
    failure.code === 'limit_reached' ? 'Monthly limit reached'
    : failure.code === 'not_signed_in' ? 'You’ve been signed out'
    : 'Something went wrong — nothing was lost'

  return (
    <div className="err has-bara" role="alert">
      <BaraPose pose="oops" size={52} motion="none" />
      <div className="grow">
        <b>{title}</b>
        <p style={{ margin: '.2em 0 0' }}>{failure.message}</p>
      </div>
      <div className="row">
        {failure.retryable && onRetry && (
          <button type="button" className="btn sm cor" onClick={onRetry} disabled={retrying}>
            {retrying ? <><span className="spinner" /> Trying…</> : 'Try again'}
          </button>
        )}
        {failure.code === 'limit_reached' && <Link className="btn sm pri" to="/pricing">See plans</Link>}
        {failure.code === 'not_signed_in' && <Link className="btn sm pri" to="/signin">Sign in</Link>}
        {onDismiss && <button type="button" className="btn sm ghost" onClick={onDismiss}>Dismiss</button>}
      </div>
    </div>
  )
}
