// Small helpers for showing deadlines (dates are stored as 'YYYY-MM-DD', meaning a day in Pakistan time).

// Today's date in Pakistan as 'YYYY-MM-DD'
export function todayPk(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

// Whole days from today (Pakistan) to the deadline: 0 = today, negative = passed, null = no deadline
export function daysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null
  const [y, m, d] = deadline.split('-').map(Number)
  const [ty, tm, td] = todayPk().split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

// "12 Dec 2026"
export function formatDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// "Closes 12 Dec 2026 · 5 days left", "Closes today", "Closed", "No deadline listed"
export function deadlineText(deadline: string | null | undefined): { text: string; urgent: boolean; past: boolean } {
  const n = daysLeft(deadline)
  if (n === null || !deadline) return { text: 'No deadline listed', urgent: false, past: false }
  if (n < 0) return { text: `Closed ${formatDate(deadline)}`, urgent: false, past: true }
  if (n === 0) return { text: 'Closes today', urgent: true, past: false }
  if (n === 1) return { text: `Closes tomorrow · ${formatDate(deadline)}`, urgent: true, past: false }
  return { text: `Closes ${formatDate(deadline)} · ${n} days left`, urgent: n <= 3, past: false }
}

// Links students paste: accept "example.com/jobs" as well as full https links
export function normaliseUrl(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const u = new URL(withScheme)
    return u.hostname.includes('.') ? u.toString() : null
  } catch {
    return null
  }
}
