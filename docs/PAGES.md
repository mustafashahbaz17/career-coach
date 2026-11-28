# PAGES.md — what every page does

One short entry per page: what it does, which tables it reads and writes, and which n8n webhooks it calls.
Updated whenever a page changes. Read this before the presentation — you'll be asked about pages you didn't build.

## How the website is put together (plain words)

- **React + TypeScript app, built with Vite.** Each page is one file in `src/pages/`. Shared pieces (top bar, logo, icons) are in `src/components/`.
- **`src/App.tsx`** is the list of pages: it says which page shows for which web address (e.g. `/pricing` → the Pricing page), and which pages need sign-in.
- **`src/main.tsx`** starts the app, loads the styles, and wraps everything in the sign-in tracker (`AuthProvider`).
- **`src/styles/design.css`** is the design system from our HTML design file (fonts, buttons, cards, layout). `src/styles/extra.css` holds a few additions.
- **`src/styles/theme.css`** is the current look, loaded last: a **deep green background with white cards in front and a small orange accent** (the logo dot, deadline countdowns, the featured plan, and a dot on the page you're on). It works with colour variables: the green page sets light-on-dark text, and every white surface switches back to dark-on-light. Delete its import in `src/main.tsx` to go back to the old light look.
- **`src/styles/motion.css` + `src/lib/useMotion.ts`** add the motion and depth, with no animation library:
  - *Scroll reveal:* headings and cards fade and slide in as they scroll into view, with a small stagger for rows of cards. `useScrollReveal` finds them by CSS selector (so pages need no changes), also catches content that loads later, and animates each element once. A backup check (on scroll, on resize and right after new content appears) reveals anything on screen, so content can never get stuck invisible — this fixed a bug on iPhone Safari where the dashboard heading stayed hidden after signing in. Tested with the browser's visibility detection deliberately broken: everything still appears.
  - *Page fades:* each new page fades in (the page frame is keyed by the address).
  - *Depth:* a faint dot grid and film grain on the green, soft glows behind page titles, and on the landing page: glowing orbs and fine halo rings in the hero (moving slightly slower than the page — parallax via `useParallax`), a lighter band with curved edges around the middle sections, and small sparkle accents.
  - *Hero:* the last word of the headline has a soft green sheen, and three small floating cards ("Reminder set", "CV bullet approved", "Practice answer scored") sit around the Sample tracker board on desktop (hidden on phones; marked `aria-hidden` because they're decoration).
  - *Interactions:* cards lift with a deeper shadow and a soft cursor spotlight, icons nudge, buttons lift and press, primary buttons get a light sheen, quiz ticks pop, and the orange "you are here" dot pops in on the nav.
  - *Accessibility & performance:* only `opacity` and `transform` are animated (no layout shift); everything is off when the visitor has "reduce motion" turned on; decorations never cause sideways scrolling.
- **Scroll experience** (landing page, plus the progress line on every page). Content is unchanged; these only change how it scrolls:
  - *Progress line:* a thin orange line under the top bar fills as you scroll (`useScrollProgress` → `--scroll-p`).
  - *Numbered side menu* (wide screens only): 01 Who it's for · 02 How it works · 03 Plans · 04 Questions, taken from the page's own headings. It stays beside you, an orange marker slides to the section you're in (`useActiveSection`), and clicking scrolls there smoothly.
  - *Big orange section numbers* (01–04, in the Gambetta serif font) beside those headings.
  - *Word-by-word brightening:* the "Who it's for" sentence goes from dim to bright as you scroll through it (`useWordScrub`).
  - *Highlight sweep:* three phrases already in the promise cards get an orange marker that sweeps in when the card appears.
  - All of it is off (or fully shown) with "reduce motion". *Tested:* the landing text is word-for-word identical to before (checked automatically).
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

## Welcome splash with Bara (`src/components/Splash.tsx`, `src/components/mascot/`, `src/styles/splash.css`)
Shown **once per browser session** before the site (first page you open), using `sessionStorage` key `cc-splash-seen`. Not shown on `/signin` or `/reset-password`, because people reach those from email links.
- **What you see:** Bara the capybara (our mascot) waving, a speech bubble "Hi! Click here to meet your new career coach 🧡" (it types itself out), a glowing orange **Meet your coach** button, and a small **Skip** in the corner. Soft orange and mint circles drift slowly in the background.
- **Ways in:** the button, the speech bubble, Skip, or the **Escape** key. On click Bara does a happy hop (his eyes switch to happy), an orange wipe grows from what you clicked, and the site fades in underneath (~0.75s). You stay on the page you opened (e.g. `/pricing`).
- **Bara as SVG layers** (`Bara.tsx` + `baraParts.ts`): body and clipboard arm, the **waving arm** (rotates from the shoulder), the head (calm or happy eyes) and the **orange** (wobbles). The shapes are generated from the same drawing script as the mascot sheet (`docs/mascot/bara_drawing.py`), so they match the art exactly.
- **Animation:** CSS only, no library: fade-in, Bara rises with a gentle bounce, slow breathing/bobbing, waving, orange wobble, bubble pop + typewriter, button glow, exit wipe. Only transform/opacity/clip-path are animated.
- **Accessibility:** it's a modal dialog; focus starts on the main button and Tab stays inside it; the site behind is `inert` until you enter; Bara has a full text description; the bubble's button reads its whole sentence. With **reduce motion** on, nothing moves and clicking enters immediately.
- **Reads / writes / webhooks:** none (only `sessionStorage`).
- *Tested* (32/32) on desktop and phone: shows on first visit, focus and Tab trap, typewriter, idle animations, Enter → hop + wipe → site, not shown again this session, bubble/Skip/Escape all enter and keep the page, no splash on email-link pages, reduce-motion behaviour.

Mascot art (all five moods as SVGs + the sheet) is in `docs/mascot/`.

### Bara around the site (`src/components/mascot/BaraPose.tsx`, poses in `baraPoses.ts`)
One component shows Bara in any of his five moods (generated from the same drawing script, so they match the mascot sheet). He's decorative (hidden from screen readers) because the text beside him already says what's happening; he bobs gently or pops in once, and is still with reduce-motion.
- **hello** — onboarding welcome (About-you step), empty History, dashboard with no tracks yet.
- **offer** — the results screen when your career tracks appear.
- **oops** — every error message (`ErrorNotice`: "Our AI is having a moment…", saving failed, etc.) and the Page-not-found page.
- **deadline** — the dashboard's Tracker card (deadlines).
- **vent** — the dashboard's Vent space card, the Vent space page header, and next to each of Bara's replies there.
The Tracker card is still "Coming soon"; Bara moves into that page when it's built.

## Public pages (no sign-in needed)

### `/` — Landing page (`src/pages/Landing.tsx`)
Tells a stranger who Career Coach is for, what it does and what it costs. Sections: hero with a **Sample**-labelled tracker preview, 01 who it's for, 02 how it works in 4 steps, three honesty promises, 03 plans summary (Free PKR 0, Pro PKR 499 est., Premium PKR 999 est.), and 04 an FAQ — with a numbered side menu on wide screens.
- **Reads / writes / webhooks:** none. No testimonials, user counts or partner logos (course rule).

### `/pricing` — Plans (`src/pages/Pricing.tsx`)
Three plan cards: **Free (PKR 0)**, **Pro (PKR 499/month, est.)**, **Premium (PKR 999/month, est.)**. Each card lists its monthly limits, **read from the `plan_limits` table** — nothing is typed into the page, so the numbers always match what n8n enforces. Feature names map to friendly labels (`cv-review` → "CV reviews", etc.); `0` shows as "—" (not on that plan). A signed-in student's current plan is outlined and labelled "Your plan"; **Upgrade** buttons say "Coming soon" until the upgrade workflow exists. Signed-out visitors see the plans and prices with Start free buttons.
- **Note:** `plan_limits` is currently readable by **signed-in accounts only** (data lead's rule), so signed-out visitors see "Sign in to see each plan's exact monthly limits" instead of the numbers. If the data lead allows `anon` to read it, the numbers appear for everyone with no website change.
- **Reads:** `plan_limits`, `profiles.plan` (own). **Writes / webhooks:** none.
- *Tested:* all 21 limits match `supabase/02_core_tables.sql` exactly, on desktop and phone; plus signed-out view, current-plan highlight, Upgrade → Coming soon, and a load failure → message + Try again.

### `/privacy` — Privacy (`src/pages/Privacy.tsx`)
- Public page, linked from the footer and the sign-up page.
- **The words come from `docs/content/privacy_page.md`** (written by the content owner). The page reads that file when the site is built, so **to change the text, edit the .md file only**; the site updates on the next deploy. Supported formatting: `# ` title, `## ` headings, `- ` bullets, `**bold**`; email addresses become mailto links.
- Layout: title and intro on the green, an "On this page" list of section links (sticky on desktop, on top on phones) and the text in a white card, with Back to home / See plans at the end.
- *Tested:* every line of the .md appears on the page, desktop and phone, the contents links jump to their section, no sideways scrolling.

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

### `/onboarding` — Set-up in 2 steps, then results (`src/pages/onboarding/`)
`Onboarding.tsx` picks the screen from **`profiles.onboarding_step`**: `'basic_info'` → About you, `'quiz'` → Quiz, `'done'` → Results. So closing the tab and coming back resumes in the right place. A progress bar shows **1. About you  2. Interest quiz**. `/onboarding?edit=1` reopens the About-you form for a student who has finished (for "Edit details" on the dashboard).

**Step 1 — About you (`AboutYou.tsx`, lists and rules in `aboutYouData.ts`)**
- *Optional LinkedIn import:* checks the link looks like `linkedin.com/in/…`, then calls n8n **`linkedin-import`** via `callWorkflow` (90-second timeout) with "Reading your public profile, this can take up to a minute...". It fills in **only empty fields** (never what the student typed) and tags them "from LinkedIn". Errors: bad link, private/empty profile, limit reached, or anything else → "LinkedIn import isn't working right now…" with Try again. The form always works without it. The link is saved to `profiles.linkedin_url`.
- *Optional CV upload (PDF), next to the LinkedIn import:* the student picks or drags a PDF (up to 5 MB). The text is read **in the browser** with pdf.js (`src/lib/pdfText.ts`, first 6 pages, max 30,000 characters); the file itself is never uploaded or stored. The text is saved as the student's **Base CV** in `cv_versions` (one row; uploading again replaces it), then sent to n8n **`cv-import`** as `{"cv_text": "..."}` (60-second timeout). The reply uses the same `mapped` shape as `linkedin-import`, fills **only empty fields** and tags them "from your CV". Errors: not a PDF, over 5 MB, no readable text (scanned image) → shown under the upload box without calling n8n; `bad_input` → "We couldn't find your details in that CV…"; limit reached / signed out as usual; anything else → "CV import isn't working right now…" with Try again (reuses the text, no need to pick the file again). **`cv-import` is a proposed endpoint**: it needs the team to agree and add it to the Shared contracts and `plan_limits`; until the n8n workflow is live, the button shows the "isn't working right now" message.
- *The form:* You (name, city, year of birth), Education (university with search, degree, major, current year, graduation year, CGPA + 4.0/5.0 scale — a CGPA above the scale is rejected), Skills and experience (up to 15 skill tags, languages, experience rows), and a collapsed **"Optional, used only to check eligibility"** section (gender, nationality) with the exact helper text from the brief.
- *Continue:* checks every field, then **updates the student's `profiles` row** and sets `onboarding_step = 'quiz'`. Never sends `plan` or `is_admin`. If saving fails: "Something went wrong saving that. Please try again." with Try again, and nothing typed is lost.
- **Reads/writes:** `profiles` (own row), `cv_versions` (own, Base CV). **Webhooks:** `linkedin-import`, `cv-import` (proposed).

**Step 2 — Interest quiz (`Quiz.tsx`)**
- Loaded **from the database**: `quiz_questions` (active, by position) and `quiz_options` (by position). One question per screen with "Question 3 of 10", a progress bar, Back and Next.
- `single` = pick one; `multi` = pick up to `max_choices` (enforced, with a message); `text` = up to 400 characters, with **Skip** when `required = false`.
- On **Next**: deletes the student's `quiz_responses` rows for that question, then inserts the new ones (one per option, or one `text_answer`). A refresh resumes at the first unanswered question, with saved answers pre-selected. Back from question 1 returns to the About-you form.
- After the last question: "Working out your career tracks…", sets `onboarding_step = 'done'`, then shows Results.
- **Reads:** `quiz_questions`, `quiz_options`, `quiz_responses` (own). **Writes:** `quiz_responses` (own), `profiles.onboarding_step`.

**Results (`Results.tsx`, cards from `src/components/TrackCards.tsx`, shared with the dashboard)**
- Shows the top 3 tracks from **`quiz_track_scores`** (the view that adds up quiz weights — no AI) joined to **`career_tracks`** for names and descriptions, with a bar for relative score.
- Calls n8n **`onboard-tracks`** (replaces the brief's placeholder `fetchAiTrackReasons()`). On success it shows n8n's 3 tracks with their AI `reason`, the confidence, and — if `needs_followup` — the follow-up questions in a "Help us get this right" card. On failure the quiz-score tracks stay on screen with the error message and **Try again**.
- Coming back later shows the saved **`interest_results`** instead of calling the AI again (so it doesn't use up the monthly limit).
- "Your full report with matched opportunities is coming next." + **Go to my dashboard**.
- **Reads:** `career_tracks`, `quiz_track_scores`, `interest_results` (own). **Webhooks:** `onboard-tracks`.

*Tested* with a fake Supabase and fake n8n on desktop and phone: validation, LinkedIn import filling only empty fields, CGPA 4.5 on a 4.0 scale rejected, profile saved, refresh resumes the quiz, multi-choice limit, answers saved to `quiz_responses`, refresh mid-quiz resumes at the right question, AI failure → fallback + Try again → AI reasons and follow-ups. No JavaScript errors.

### `/dashboard` — Dashboard (`src/pages/app/Dashboard.tsx`)
Where a student lands after onboarding. Greets them by first name and shows their **plan** as a badge (links to Pricing).
- **Profile summary:** university, degree and major, current year, graduation year — with **Edit details**, which opens the About-you form at `/onboarding?edit=1` (saving there returns to the dashboard and never sends them back through the quiz).
- **Career tracks:** the latest **`interest_results`** row (3 tracks with the AI's reasons and the date). If there isn't one yet, the top 3 from **`quiz_track_scores`**, labelled "Based on your quiz answers". No quiz yet → "No career tracks yet" with a button to take it.
- **Coming soon** cards: Opportunity matches, Tracker, CV studio, Interview practice (Premium). The **Vent space** card is live and opens `/vent`.
- If onboarding isn't finished, a "Finish setting up" banner links back to it.
- **Reads:** `profiles` (own), `interest_results` (own), `quiz_track_scores` (own), `career_tracks`. **Writes / webhooks:** none.

### `/history` — History (`src/pages/app/History.tsx`)
Everything the student has run, **newest first**: career-track reports (**`interest_results`**) and LinkedIn imports (**`linkedin_imports`**), each with its date and status (Imported / Profile empty or private / Didn't work / Didn't finish). Tap a row to open it: a report shows its 3 tracks with reasons and confidence; an import shows what it found (name, university, degree, skills, roles) or a plain explanation of what went wrong. Empty state: "Nothing here yet" with a button to get career tracks.
- **Reads:** `interest_results` (own), `linkedin_imports` (own), `career_tracks`. **Writes / webhooks:** none.

**Only your own data:** every query on these pages filters by the signed-in student's id, and row-level security in Supabase blocks other students' rows anyway.

*Tested* with a fake Supabase (a student with results, a brand-new student, and a quiz-only student) on desktop and phone: 36/36 checks pass, including the Edit details round trip and that every query asks only for the student's own rows.

### `/vent` — Vent space (`src/pages/app/Vent.tsx`)
- **What it's for:** a calm, private chat with Bara about recruitment stress (every plan). Linked from the top bar and the dashboard's Vent space card.
- **Layout:** chat on the left (history, typing dots, message box with a 2,000-character counter; Enter sends, Shift+Enter adds a line), and two side cards: **Not a crisis service** (always shows Rescue 1122, plus "Show helplines") and **Your privacy** (who can see messages, "Delete my history" with an inline "this can't be undone" check).
- **Empty state:** three example starters; clicking one fills the box but sends nothing.
- **Sending:** calls n8n **`vent-message`** with `{"message": "..."}` (60-second timeout). Expected reply: `{"ok": true, "reply": "...", "safety_label": "ok"|"distress"|"crisis", "show_helplines": true|false}`; n8n saves both messages to `vent_messages`. If it fails, the bubble is taken back and the words go back in the box, with Try again. `bad_input` → "That message couldn't be sent…".
- **Safety:** when `show_helplines` is true (or the label is `crisis`), a clear helpline card appears above Bara's reply and the side list opens. On reload the card stays on that reply (`showed_helplines`). Helplines live in **`src/lib/helplines.ts`**: only numbers that two recent sources agree on (1122, 1166, Punjab 15 then 7, Taskeen 0316-8275336). The data lead should call each once to confirm.
- **`vent-message` is a proposed contract**: it needs the team to agree and add it to the Shared contracts. Until the n8n workflow is live, sending shows "Our AI is having a moment…" and nothing is lost.
- **Reads/writes:** reads own `vent_messages`; deletes own `vent_messages`. **Webhooks:** `vent-message` (proposed).

### `/pricing/upgrade` — Temporary (`src/pages/app/ComingNext.tsx`)
Placeholder until upgrades are wired to n8n.

### `/system-check` — Team-only test page (`src/pages/app/SystemCheck.tsx`)
Not linked anywhere. Shows which n8n base URL the site is using and has a button that calls a workflow that doesn't exist — it should show the polite `ai_unavailable` message with Try again, proving the failure handling works. Handy for Step 9 and for rehearsing the "we'll break something" part of the demo.
- **Webhooks:** calls a made-up path on purpose. **Reads / writes:** nothing.

## Shared frame

### Top bar and footer (`src/components/PublicLayout.tsx`)
Wraps every page except the account pages.
- **Signed out:** logo, Pricing, Sign in, Get started free (on phones Pricing is hidden in the bar and the button reads "Start free", so it fits on one line).
- **Signed in:** **Dashboard / History / Vent space / Pricing** links (the current page is highlighted), the student's email and a **Sign out** button. On phones the links and "Signed in as …" sit in a row under the bar.
