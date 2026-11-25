# PAGES.md — what every page does

One short entry per page: what it does, which tables it reads and writes, and which n8n webhooks it calls.
Updated whenever a page changes. Read this before the presentation — you'll be asked about pages you didn't build.

## How the website is put together (plain words)

- **React + TypeScript app, built with Vite.** Each page is one file in `src/pages/`. Shared pieces (top bar, logo, icons) are in `src/components/`.
- **`src/App.tsx`** is the list of pages: it says which page shows for which web address (e.g. `/pricing` → the Pricing page), and which pages need sign-in.
- **`src/main.tsx`** starts the app, loads the styles, and wraps everything in the sign-in tracker (`AuthProvider`).
- **`src/styles/design.css`** is the design system copied exactly from our HTML design file (colours, fonts, buttons, cards). `src/styles/extra.css` holds a few additions.
- **`vercel.json`** tells Vercel to send every address to the app, so refreshing on `/pricing` doesn't show a 404.
- **Secrets:** the website only ever uses the Supabase URL, the publishable/anon key and the n8n base URL, set as environment variables in Vercel (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_N8N_BASE_URL`). No other keys are in this code.

## Sign-in plumbing (`src/lib`, `src/auth`)

- **`src/lib/supabase.ts`** — connects to our Supabase project using the URL and publishable/anon key. If those settings are missing, pages show "Sign-in isn't available right now" instead of crashing (`src/components/ConfigMissing.tsx`).
- **`src/auth/AuthProvider.tsx`** — remembers who is signed in on every page. After sign-in it reads the student's own row in **`profiles`** (row-level security means it can only ever get their own row). It also notices sign-out in another tab. `homeFor()` decides where a student lands: **`/onboarding`** until `profiles.onboarding_step` is `'done'`, then **`/dashboard`**.
- **`src/auth/RequireAuth.tsx`** — guards private pages. A signed-out visitor is sent to `/signin` with a "Please sign in to continue" note.
- **`src/auth/authErrors.ts`** — turns Supabase's technical errors into plain messages (wrong password, email already used, weak password, email not confirmed, too many attempts, no internet).

## Talking to n8n (`src/lib/callWorkflow.ts`, `src/components/ErrorNotice.tsx`)

- **`callWorkflow(path, body, options)`** is the ONE way the website calls n8n. It sends `POST` to `VITE_N8N_BASE_URL + '/' + path` with a JSON body and the header `Authorization: Bearer <student's Supabase access token>` (n8n checks this token to know who is calling).
- **Timeout:** 60 seconds by default; pages pass `{ timeoutMs: 90000 }` for `linkedin-import`.
- **It never throws.** It always returns `{ ok: true, data }` or `{ ok: false, code, message, retryable, used?, limit? }`, so a page can't crash because n8n is down.
- **Rules:** HTTP 401 → `not_signed_in` (the student is signed out and sent to sign-in). A reply with `ok: false` → n8n's own code. Timeout, network error, CORS block, a missing workflow (404) or a reply that isn't JSON → `ai_unavailable`.
- **Messages** are exactly the ones in the Shared contracts (e.g. `ai_unavailable` → "Our AI is having a moment. Your work is saved; please try again."; `limit_reached` with limit 0 → "This is part of the Premium plan.").
- **`<ErrorNotice>`** shows the message, a **Try again** button when `retryable` is true, a **See plans** button for limits, and a **Sign in** button when signed out.
- Tested against fake n8n replies for every case in the contract (success, 401, each error code, 404, bad JSON, timeout, network failure, missing base URL): 13/13 pass.

## Public pages (no sign-in needed)

### `/` — Landing page (`src/pages/Landing.tsx`)
Tells a stranger who Career Coach is for, what it does and what it costs. Sections: hero with a **Sample**-labelled tracker preview, who it's for, how it works in 4 steps, three honesty promises, plans summary (Free PKR 0, Pro PKR 499 est., Premium PKR 999 est.), and an FAQ.
- **Reads / writes / webhooks:** none. No testimonials, user counts or partner logos (course rule).

### `/pricing`, `/privacy` — Placeholders (`src/pages/Placeholder.tsx`)
"Coming soon" pages so no link is broken. Pricing is built in Step 8.

### Any other address — "Page not found"

## Account pages (full-screen two-column design, `src/pages/auth/`)

All use `AuthFrame.tsx`: dark panel with the pitch on the left, form on the right (on phones the form comes first, with the logo at the top).

### `/signup` — Create account (`SignUp.tsx`)
Full name, email, password (8+ characters, letters and numbers — checked before sending). Calls **Supabase Auth sign-up**; the name is stored on the account. The database then creates the student's **`profiles`** row automatically (data lead's trigger, id + email only), and on first sign-in the website copies the name into `profiles.full_name`. If Supabase has email confirmation on, it shows "Check your inbox"; the link brings them back to `/signin`. If the email is already used: "An account with this email already exists — sign in instead."
- **Writes:** a new Supabase Auth user (→ `profiles` row via trigger). **Webhooks:** none.

### `/signin` — Sign in (`SignIn.tsx`)
Email + password via **Supabase Auth**. Then reads **`profiles.onboarding_step`** and goes to `/onboarding` or `/dashboard`. Wrong password → "That email and password don't match an account." Already signed in → skips straight on.
- **Reads:** `profiles` (own row). **Webhooks:** none.

### `/forgot-password` — Reset request (`ForgotPassword.tsx`)
Sends a reset email via Supabase Auth. Shows the same message whether or not the account exists, so nobody can test which emails are registered.

### `/reset-password` — Choose a new password (`ResetPassword.tsx`)
Opened from the reset email (Supabase signs the student in from the link). Saves the new password, then goes on to onboarding or the dashboard. An expired or used link shows "This link has expired" with a button to get a new one.

## Private pages (sign-in required)

### `/onboarding`, `/dashboard`, `/history`, `/pricing/upgrade` — Temporary (`src/pages/app/ComingNext.tsx`)
Placeholders until Steps 5, 7 and 8. They show "Signed in as …" and the student's plan from **`profiles`**, which proves sign-in and data reading work.
- **Reads:** `profiles` (own row). **Writes / webhooks:** none.

### `/system-check` — Team-only test page (`src/pages/app/SystemCheck.tsx`)
Not linked anywhere. Shows which n8n base URL the site is using and has a button that calls a workflow that doesn't exist — it should show the polite `ai_unavailable` message with Try again, proving the failure handling works. Handy for Step 9 and for rehearsing the "we'll break something" part of the demo.
- **Webhooks:** calls a made-up path on purpose. **Reads / writes:** nothing.

## Shared frame

### Top bar and footer (`src/components/PublicLayout.tsx`)
Wraps every page except the account pages.
- **Signed out:** logo, Pricing, Sign in, Get started free (on phones Pricing is hidden in the bar and the button reads "Start free", so it fits on one line).
- **Signed in:** the student's email and a **Sign out** button (on phones the email shows in a line under the bar).
