// Shown instead of a crash if the Supabase settings haven't been added in Vercel.
export default function ConfigMissing() {
  return (
    <div className="wrap">
      <div className="placeholder err" role="alert" style={{ textAlign: 'left' }}>
        <div>
          <b>Sign-in isn’t available right now</b>
          <p style={{ margin: '.3em 0 0' }}>
            Accounts are being set up. Please try again later. (Team: add <span className="kbd">VITE_SUPABASE_URL</span> and{' '}
            <span className="kbd">VITE_SUPABASE_ANON_KEY</span> in Vercel, then redeploy.)
          </p>
        </div>
      </div>
    </div>
  )
}
