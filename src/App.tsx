// The list of pages (routes). Each URL path shows one page component.
// Pages wrapped in <RequireAuth> are private: signed-out visitors are sent to /signin.
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import RequireAuth from './auth/RequireAuth'
import Landing from './pages/Landing'
import Placeholder from './pages/Placeholder'
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import ComingNext from './pages/app/ComingNext'

export default function App() {
  return (
    <Routes>
      {/* Account pages: full-screen two-column design, no top bar */}
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<PublicLayout />}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Placeholder title="Pricing" text="The full plan comparison is coming soon. For now, see the plans summary on the home page." />} />
        <Route path="/privacy" element={<Placeholder title="Privacy" text="Privacy policy coming soon." />} />

        {/* Private (sign-in required) */}
        <Route path="/onboarding" element={<RequireAuth><ComingNext title="Let’s set up your season" text="Onboarding (your details and the interest quiz) is being built next." /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><ComingNext title="Dashboard" text="Your dashboard is coming soon." /></RequireAuth>} />
        <Route path="/history" element={<RequireAuth><ComingNext title="History" text="Your saved results will appear here." /></RequireAuth>} />
        <Route path="/pricing/upgrade" element={<RequireAuth><ComingNext title="Upgrade" text="Upgrading is coming soon." /></RequireAuth>} />

        <Route path="*" element={<Placeholder title="Page not found" text="We couldn't find that page." />} />
      </Route>
    </Routes>
  )
}
