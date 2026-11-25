# Prompt for your website builder (Lovable, v0, Bolt or Claude)

Paste everything below the line into your AI website tool. It assumes Supabase is already connected
and that you have run `01_supabase_onboarding.sql` and `02_core_tables.sql`. Replace the value in CAPITALS (the n8n webhook address) first, or leave it as a placeholder until the workflow exists.

---

Build the onboarding flow for **Career Coach**, a web app that helps Pakistani university students through
recruitment season. Use React + TypeScript + Tailwind, the existing Supabase client for auth and data,
and make every screen work well on a phone (375 px wide) as well as desktop.

## Where it appears

After a user signs up or signs in, read their row from `profiles`. If `onboarding_step` is not `'done'`,
send them to `/onboarding` and resume at that step. Show a 2-step progress bar at the top:
**1. About you  2. Interest quiz**. Every step saves to Supabase as soon as the user presses Continue, so
closing the tab and coming back resumes where they left off.

## Step 1: About you (`onboarding_step = 'basic_info'`)

### 1a. Optional LinkedIn import (top of the page, in a card)

- Text field: "Your LinkedIn profile link (optional)" with placeholder `https://www.linkedin.com/in/your-name`.
- Button "Import my details". Validate the link first: it must match
  `^https?://(www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?$`. If not, show "That doesn't look like a
  LinkedIn profile link" under the field.
- On click, POST to `N8N_LINKEDIN_IMPORT_WEBHOOK_URL` with JSON `{ "linkedin_url": "<link>" }` and the header
  `Authorization: Bearer <the current Supabase session access_token>`. Show a spinner and the text
  "Reading your public profile, this can take up to a minute...". Abort after 90 seconds.
- The response looks like `{ "ok": true, "mapped": { full_name, headline, city, university, degree, major,
  grad_year, skills: [], languages: [], experience: [], education: [] } }`. Pre-fill the form below with any
  non-empty values and highlight pre-filled fields with a small "from LinkedIn" tag. Never overwrite a field
  the user has already typed in.
- If `ok` is false, or the request fails or times out, show a friendly message and let the user carry on:
  - `bad_url`: "That doesn't look like a LinkedIn profile link."
  - `profile_empty`: "We couldn't read details from that profile (it may be private). Please fill in the form below."
  - anything else: "LinkedIn import isn't working right now. You can try again or fill in the form below."
  Include a "Try again" button. The form must always be usable without the import.
- Save the link itself into `profiles.linkedin_url`.

### 1b. The form (everything the student fills or confirms)

Group into three short sections with clear labels. Required fields marked with *.

**You**
- Full name * (text)
- City * (select: Karachi, Lahore, Islamabad, Rawalpindi, Peshawar, Quetta, Faisalabad, Multan, Hyderabad, Other → free text)
- Year of birth (number, 1950 to 2015)

**Education**
- University * (searchable select with common Pakistani universities, plus "Other" → free text)
- Degree * (select: BS, BSc, BBA, BA, BE, MBBS, LLB, MS/MPhil, MBA, Other)
- Major / field of study * (text)
- Current year * (select: 1st, 2nd, 3rd, 4th, 5th, Graduated) → `study_year`
- Expected graduation year * (number) → `grad_year`
- CGPA (number with 2 decimals) and scale (4.0 or 5.0, default 4.0). Validate CGPA ≤ scale.

**Skills and experience**
- Skills (tag input, up to 15) → `skills`
- Languages (multi-select: English, Urdu, Punjabi, Sindhi, Pashto, Balochi, Saraiki, Arabic, French, German, Chinese, Other) → `languages`
- Experience list (add/remove rows: title, organisation, start month, end month or "Present", one-line
  description) → `experience` as JSON array of `{ title, org, start, end, description }`.
  Society roles and part-time jobs count; say so in the helper text.

**Optional, used only to check eligibility** (collapsed by default, with this exact helper text:
"Some programmes and scholarships are limited to women or to Pakistani nationals. We use these only to
check rules like that, never to decide what careers to suggest. You can skip them.")
- Gender (Female, Male, Other, Prefer not to say) → `gender` values `female | male | other | prefer_not_to_say`
- Nationality (select, default empty) → `nationality`

On **Continue**: validate, then `update` the user's `profiles` row with all fields and set
`onboarding_step = 'quiz'`. Do not send `plan` or `is_admin` (the database will reject them).

## Step 2: Interest quiz (`onboarding_step = 'quiz'`)

Render the quiz **from the database**, not hard-coded:
- Load `quiz_questions` where `active = true` ordered by `position`, and their `quiz_options` ordered by `position`.
- Show **one question per screen** as a focused card (feels like a pop quiz), with "Question 3 of 10",
  Back and Next buttons, and a smooth slide transition.
- `kind = 'single'`: large tappable option cards; selecting one enables Next.
- `kind = 'multi'`: tappable cards with checkmarks; enforce `max_choices` and show the `help` text
  (e.g. "Pick up to 3").
- `kind = 'text'`: a textarea (max 400 characters) with the `help` text; if `required = false` show "Skip".
- Saving an answer: for that question, first `delete` the user's existing rows in `quiz_responses`, then
  `insert` one row per selected option `{ user_id, question_id, option_key }`, or for text one row
  `{ user_id, question_id, text_answer }`. Do this when the user presses Next, so progress survives a refresh.
  When resuming, pre-select saved answers and jump to the first unanswered question.
- After the last question, show a short "Working out your career tracks..." screen, set
  `onboarding_step = 'done'`, then show the **results preview**: read `quiz_track_scores` for this user,
  join to `career_tracks`, and show the top 3 tracks as cards (name, description, a bar for relative score).
  Add the line "Your full report with matched opportunities is coming next." and a button to the dashboard.
  (Later this screen will call an n8n workflow that adds AI reasons; leave a clearly marked placeholder
  function `fetchAiTrackReasons()` that currently returns null.)

## Quality bar

- Clear loading, empty and error states everywhere; never a blank screen or an endless spinner.
- If any Supabase call fails, show "Something went wrong saving that. Please try again." with a retry
  button, and keep what the user typed.
- Accessible: labels on every input, keyboard navigable, visible focus, sufficient contrast.
- Clean, friendly, modern look; primary colour a calm teal; no stock "trusted by" logos or fake testimonials.
