// The 3 career-track cards (name, description, relative-score bar, and the AI's "Why" when there is one).
// Used by the onboarding results screen and the dashboard so both look the same.
export type ShownTrack = { key: string; name: string; description: string; score: number; reason?: string }

export default function TrackCards({ tracks, writing }: { tracks: ShownTrack[]; writing?: boolean }) {
  const max = Math.max(...tracks.map((x) => x.score), 0.0001)
  return (
    <div className="grid g3">
      {tracks.map((t, i) => {
        const pct = Math.round((t.score / max) * 100)
        return (
          <article key={t.key} className="card stack-s view">
            <div className="row between"><span className="chip teal num">#{i + 1}</span></div>
            <h3>{t.name}</h3>
            {t.description && <p className="small muted">{t.description}</p>}
            <div className="bar" style={{ marginTop: 4 }} aria-label={`Relative score ${pct} out of 100`}>
              <i style={{ width: `${Math.max(8, pct)}%` }} />
            </div>
            {t.reason ? <p className="small" style={{ color: 'var(--ink2)' }}><b>Why:</b> {t.reason}</p>
              : writing ? <p className="small muted">Writing your explanation…</p> : null}
          </article>
        )
      })}
    </div>
  )
}

// Turns a track from the database or n8n into a card, using `career_tracks` for the name and description.
export function toShownTrack(
  t: { track_key: string; name?: string; score: number | string; reason?: string },
  info: Record<string, { name: string; description: string }>,
): ShownTrack {
  return {
    key: t.track_key,
    name: info[t.track_key]?.name || t.name || t.track_key,
    description: info[t.track_key]?.description || '',
    score: Number(t.score) || 0,
    reason: t.reason,
  }
}
