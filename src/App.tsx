// The list of pages (routes). Each URL path shows one page component.
// Pages wrapped in <RequireAuth> are private: signed-out visitors are sent to /signin.
import { useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Splash, { shouldShowSplash } from './components/Splash'
import PublicLayout from './components/PublicLayout'
import RequireAuth from './auth/RequireAuth'
import Landing from './pages/Landing'
import Placeholder from './pages/Placeholder'
import Pricing from './pages/Pricing'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ComingNext from './pages/app/ComingNext'
import SystemCheck from './pages/app/SystemCheck'
import Onboarding from './pages/onboarding/Onboarding'
import Dashboard from './pages/app/Dashboard'
import History from './pages/app/History'

export default function App() {
  // Welcome splash with Bara: decided once, when the site first loads (first visit this browser session).
  const { pathname } = useLocation()
  const [splash, setSplash] = useState(() => shouldShowSplash(pathname))

  return (
    <>
    {splash && <Splash onDone={() => setSplash(false)} />}
    {/* while the splash is open, the site behind it can't be focused or read out */}
    <div inert={splash}>
    <Routes>
      {/* Account pages: full-screen two-column design, no top bar */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<PublicLayout />}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Placeholder title="Privacy" text="Privacy policy coming soon." />} />

        {/* Private (sign-in required) */}
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><History /></RequireAuth>} />
        <Route path="/pricing/upgrade" element={<RequireAuth><ComingNext title="Upgrade" text="Upgrading is coming soon." /></RequireAuth>} />
        <Route path="/system-check" element={<RequireAuth><SystemCheck /></RequireAuth>} />

        <Route path="*" element={<Placeholder title="Page not found" text="We couldn't find that page." />} />
      </Route>
    </Routes>
    </div>
    </>
  )
}
