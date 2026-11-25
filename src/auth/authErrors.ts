// Turns Supabase's technical sign-in errors into plain messages a student understands.
import type { AuthError } from '@supabase/supabase-js'

export function friendlyAuthError(err: AuthError | Error | null | undefined): string {
  if (!err) return ''
  const code = 'code' in err ? (err as AuthError).code : undefined
  const msg = (err.message || '').toLowerCase()

  if (code === 'invalid_credentials' || msg.includes('invalid login credentials'))
    return 'That email and password don’t match an account. Check them, or reset your password.'
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered'))
    return 'An account with this email already exists — sign in instead.'
  if (code === 'weak_password' || msg.includes('password should'))
    return 'That password is too weak. Use at least 8 characters, mixing letters and numbers.'
  if (code === 'email_not_confirmed' || msg.includes('email not confirmed'))
    return 'Please confirm your email first — open the link we sent to your inbox (check spam too).'
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit'))
    return 'Too many attempts in a short time. Please wait a minute and try again.'
  if (code === 'validation_failed' || msg.includes('invalid email') || msg.includes('unable to validate email'))
    return 'That doesn’t look like a valid email address.'
  if (code === 'same_password')
    return 'Your new password must be different from your old one.'
  if (msg.includes('failed to fetch') || msg.includes('network'))
    return 'We couldn’t reach our servers. Check your internet connection and try again.'
  return 'Something went wrong. Please try again in a moment.'
}

// Our own check before sending a sign-up, so students get the message straight away.
export function passwordProblem(pw: string): string {
  if (pw.length < 8) return 'Use at least 8 characters for your password.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'That password is too weak. Mix letters and numbers.'
  return ''
}
