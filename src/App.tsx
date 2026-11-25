// The list of pages (routes). Each URL path shows one page component.
import { Route, Routes } from 'react-router-dom'
import PublicLayout from './components/PublicLayout'
import Landing from './pages/Landing'
import Placeholder from './pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/pricing" element={<Placeholder title="Pricing" text="The full plan comparison is coming soon. For now, see the plans summary on the home page." />} />
        <Route path="/signup" element={<Placeholder title="Create your account" text="Sign-up is coming very soon." />} />
        <Route path="/signin" element={<Placeholder title="Sign in" text="Sign-in is coming very soon." />} />
        <Route path="/privacy" element={<Placeholder title="Privacy" text="Privacy policy coming soon." />} />
        <Route path="*" element={<Placeholder title="Page not found" text="We couldn't find that page." />} />
      </Route>
    </Routes>
  )
}
