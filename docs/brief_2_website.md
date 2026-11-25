# Brief 2: Website — Career Coach

> **How to use this file:** start a new Claude chat (or a Claude Project for your role), attach this file
> plus the files under "Your files", and say: **"Read the brief and let's start with Step 1."**

## Instructions for Claude

You are helping the **website builder** of a three-person student team. The website is built with
**Lovable** (an AI website builder), stored in GitHub and hosted on Vercel. Work through the steps below
in order, one at a time:

- For each step, explain in plain words what we're doing, give me the **exact prompt to paste into
  Lovable** (or exact clicks), then go through the **Done when** checks with me before moving on.
- I'm not allowed to write code by hand, but I must be able to explain every page. When Lovable produces
  code, help me understand what each page and file does, in plain words.
- If Lovable produces an error or something looks wrong, ask me for the error text or a screenshot, then
  write a short, specific fix prompt for Lovable. If it keeps breaking, suggest reverting to Lovable's
  previous version.
- Never ask me for keys. The website only ever uses the Supabase URL, the anon key and the n8n base URL.
- Don't change the **Shared contracts**. If something there needs to change, draft a short message I
  can send my teammates.

## The project in brief

**Career Coach** is a website for Pakistani university students going through recruitment season
(internships, management-trainee programmes, graduate jobs). A student signs up, imports or types their
details, takes a short interest quiz, and gets career tracks, matched opportunities, a tracker with
deadline reminders, CV tailoring, and (on Premium) a timed interview simulator and salary-negotiation help.
A free "vent space" chat supports students through the stress.

It is a group project for a Gen AI course, marked on the **live product**: markers open the site as
strangers, sign up and try to use it. Features that don't work for them score nothing, and a feature we
call finished that doesn't work costs double, so working and honest beats big.

- **Stack:** website built with Lovable, code in GitHub, hosted on Vercel · Supabase for sign-in,
  database and file storage · the course n8n (https://n8n.devplusops.com) runs all AI work, called by the
  website through webhooks · the course AI model, plus Apify for the optional LinkedIn import.
- **Plans:** Free / Pro / Premium, limits enforced in n8n using the `plan_limits` table.
- **Team of three:** Data and product lead · Website · n8n engine and AI.
- **Right now (week 1):** get the walking skeleton live: sign up → optional LinkedIn import → about-you
  form → interest quiz → AI-written career tracks, saved to the student's account.

## Your role

You own **every page the student sees**: the landing page, sign-up and sign-in, onboarding (about-you
form and quiz), dashboard, history and pricing pages, and later the tracker, CV studio, interview
simulator, vent space and admin page. You also own the GitHub repo and the live Vercel site.

## Your files (attach these to your Claude chat)

- `website_onboarding_prompt.md`: the full Lovable prompt for the about-you form and the quiz
  (use it in Step 5)

## Rules for working in Lovable

- **One person prompts at a time.** If a teammate wants a change, they ask you or wait their turn.
- **Small prompts, one change each.** Check the result in the preview before the next prompt.
- **After anything big works,** note it in the team chat. Lovable keeps a version history, so you can roll back.
- **No fake content.** No made-up testimonials, user counts or "trusted by" logos. Example content says "Sample".

---

## Step 1: Create the Lovable project and the GitHub repo

1. Sign in to lovable.dev with your own email and create a new project called **Career Coach**.
2. Connect GitHub (in Lovable's GitHub settings). This creates a repo in your GitHub account and keeps
   it in sync with Lovable.
3. In GitHub, open the repo → **Settings → Collaborators** → add both teammates.
4. Send the repo link to the data lead (they'll add the `/supabase`, `/n8n` and `/docs` folders).

**Done when:** the repo exists, both teammates are collaborators, and the link is in the team chat.

## Step 2: Landing page (needs nothing from anyone, so start here)

Ask Claude to refine this prompt, then paste it into Lovable:

> Build a landing page for **Career Coach**, a web app for Pakistani university students going through
> recruitment season (internships, management-trainee programmes, graduate jobs). React + TypeScript +
> Tailwind, mobile-first, calm teal primary colour, friendly and modern.
> Sections: (1) Hero: headline "Your recruitment season, handled.", subline "Find the programmes you're
> eligible for, tailor your CV to each, practise the interview, and never miss a deadline. Free to
> start.", buttons "Get started free" and "See plans". (2) Who it's for: final- and penultimate-year
> students in Pakistan. (3) How it works in 4 steps: import your profile and take a 3-minute quiz → see
> your career tracks and matched opportunities → track deadlines and tailor your CV → practise interviews
> and negotiate your offer (Premium). (4) Plans summary: Free (PKR 0), Pro (PKR 499/month), Premium (PKR
> 999/month), with a link to the full pricing page. (5) A short honest FAQ: Is my data private? Is this
> a replacement for a counsellor? (No.) What does the AI do? (6) Footer with a privacy link (placeholder
> page). No testimonials, no user counts, no partner logos.

**Done when:** the landing page looks right on a phone (use the preview's mobile view) and desktop, and
says who it's for, what it does and what it costs.

## Step 3: Connect Supabase and add accounts

1. Get the **Supabase project URL and anon key** from the vault (the data lead puts them there).
2. Connect Supabase using Lovable's built-in Supabase connection.
3. Prompt Lovable:

> Add email and password authentication with Supabase: sign-up, sign-in, sign-out, and "forgot
> password". After sign-in, read the user's row in the `profiles` table (it is created automatically on
> sign-up). If `onboarding_step` is not `'done'`, redirect to `/onboarding`; otherwise go to
> `/dashboard`. Protect `/onboarding`, `/dashboard`, `/history` and `/pricing/upgrade` so signed-out
> users go to sign-in. Show the user's email and a sign-out button in the top bar when signed in. Show
> clear error messages for a wrong password, an existing email and a weak password.

**Done when:** you can sign up, sign out and sign in. A new row appears in Supabase **Table Editor →
profiles** for each new account.

## Step 4: One shared helper for calling n8n

Every n8n call must behave the same way (see "Website ⇄ n8n webhook contract" in the Shared contracts).
Prompt Lovable:

> Create one helper `callWorkflow(path, body, options)` used for every call to our n8n backend.
> The base URL comes from the environment variable `VITE_N8N_BASE_URL` (e.g.
> `https://n8n.devplusops.com/webhook`); the full URL is base + '/' + path.
> It sends POST with a JSON body and the header `Authorization: Bearer <current Supabase session access_token>`.
> Timeout: `options.timeoutMs`, default 60000 ms.
> It returns `{ ok: true, data }` or `{ ok: false, code, message, retryable, used?, limit? }`, and never throws.
> Rules:
> - HTTP 401 → code `not_signed_in` (sign the user out and send them to sign-in).
> - A JSON reply with `ok: false` → use its `code`.
> - Timeout, network error or invalid JSON → code `ai_unavailable`.
> Map codes to these exact messages:
> - not_signed_in: "Please sign in again."
> - bad_input: "Something in the form isn't right. Please check it and try again."
> - bad_url: "That doesn't look like a LinkedIn profile link."
> - profile_empty: "We couldn't read details from that profile (it may be private). Please fill in the form below."
> - import_failed: "LinkedIn import isn't working right now. You can try again or fill in the form below."
> - limit_reached: if limit is 0, "This is part of the Premium plan."; otherwise "You've used all {limit} this month. They reset on the 1st, or you can upgrade."
> - ai_unavailable: "Our AI is having a moment. Your work is saved; please try again."
> Also make a small reusable `<ErrorNotice>` component that shows the message and a "Try again" button
> when `retryable` is true.

Then add `VITE_N8N_BASE_URL` as an environment variable (in Lovable now; in Vercel in Step 6).

**Done when:** the helper exists, and calling a path that doesn't exist shows the `ai_unavailable`
message instead of crashing.

## Step 5: Onboarding (about-you form and quiz)

1. Open `website_onboarding_prompt.md` and paste everything below its line into Lovable. If Lovable
   struggles with a prompt that long, paste it in two parts: Step 1 (about you) first, then Step 2 (the quiz).
2. Then paste this follow-up:

> Use `callWorkflow` for all n8n calls. LinkedIn import: `callWorkflow('linkedin-import', { linkedin_url },
> { timeoutMs: 90000 })`. After the last quiz answer is saved and `onboarding_step` is set to 'done',
> call `callWorkflow('onboard-tracks', {})`. If it succeeds, show its 3 tracks with their `reason` text,
> and if `needs_followup` is true, show the `followup_questions` as a friendly "Help us get this right"
> card. If it fails, still show the top 3 from `quiz_track_scores` (as now), with the error notice and a
> "Try again" button. Replace the placeholder `fetchAiTrackReasons()` with this.

Until the n8n teammate's workflows are live, the import and AI reasons will show their error messages.
That's expected, and it shows the failure handling works.

**Done when:**

- [ ] The form saves to `profiles`, and a refresh keeps the data
- [ ] The quiz loads its questions from the database, and a refresh mid-quiz resumes at the right question
- [ ] Answers appear in `quiz_responses`
- [ ] The results screen shows 3 tracks from `quiz_track_scores`
- [ ] It all works on a phone

## Step 6: Publish to Vercel

1. In vercel.com, sign in with GitHub → **Add New → Project** → import the repo.
2. Add environment variables: the Supabase URL and anon key (use the exact names Lovable's code
   expects; ask Claude to check the code) and `VITE_N8N_BASE_URL`. Deploy.
3. Send the live address to:
   - the **data lead**, to add it in Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs)
   - the **n8n owner**, to add it as the allowed origin (CORS) on every webhook

**Done when:** a brand-new account can sign up and finish onboarding on the live address, on a phone.

## Step 7: Dashboard and history pages

Prompt Lovable:

> `/dashboard`: greet the user by first name, show a profile summary card (university, major,
> graduation year) with an "Edit details" link back to the about-you form, and their latest
> `interest_results` (3 tracks with reasons), or the `quiz_track_scores` top 3 if there are none yet.
> Add placeholder cards for "Opportunity matches", "Tracker", "CV studio", "Interview practice
> (Premium)" and "Vent space", each clearly marked "Coming soon". Show the user's plan as a badge.
> `/history`: a list, newest first, of this user's `interest_results` and `linkedin_imports` with dates
> and status, each expandable to show details. A clear empty state when there's nothing yet.

**Done when:** both pages show only the signed-in user's data (check with a second account), with good
empty states.

## Step 8: Pricing page

Prompt Lovable:

> `/pricing`: three plan cards, Free (PKR 0), Pro (PKR 499/month), Premium (PKR 999/month). Read the
> limits from the `plan_limits` table so the numbers always match what's enforced, and show them as
> friendly rows (e.g. "CV reviews: 2 a month"; 0 shows as "—"). Feature names to labels:
> linkedin-import "LinkedIn imports", onboard-tracks "Career track reports", cv-review "CV reviews",
> coach-message "Coach messages", interview-session "Interview practice sessions", negotiation-draft
> "Negotiation email drafts", vent-message "Vent space messages". Highlight the signed-in user's current
> plan. For now the "Upgrade" buttons show "Coming soon" (a later n8n workflow will change the plan).
> Readable on a phone.

**Done when:** the numbers on the page match the `plan_limits` table exactly.

## Step 9: Break it on purpose

Test each of these and fix anything that shows a blank screen, an endless spinner or a confusing message:

- [ ] Set `VITE_N8N_BASE_URL` to a wrong address: the import and AI reasons show the `ai_unavailable` message
- [ ] Throttle to "Slow 3G" in the browser's developer tools: loading states show, nothing breaks
- [ ] Sign out in another tab, then press Continue: you're asked to sign in again
- [ ] A form with a CGPA of 4.5 on a 4.0 scale: a clear validation message appears
- [ ] Two accounts: neither ever sees the other's data

## Step 10: Write PAGES.md (for the presentation questions)

Ask Claude to help you write `/docs/PAGES.md`: one short paragraph per page saying what it does, which
tables it reads and writes, and which n8n webhooks it calls. Update it whenever a page changes. In the
presentation, each of you will be asked about parts you didn't build, so share it with the team.

**Done when:** PAGES.md covers every page and both teammates have read it.

## Coming next (week 2 onwards, don't start yet)

Tracker board, opportunity matches page, CV studio with accept/edit/reject suggestions, interview
simulator (Premium), vent space, admin page (owner only), and the upgrade button wired to n8n. Each one
starts with a new endpoint agreed in the Shared contracts.

## Shared contracts (identical in all three briefs)

Change anything in this section only when all three agree, then update all three briefs.

### Accounts and where things live

| Thing | Created by | Everyone else |
|---|---|---|
| Supabase project `career-coach` | Data lead | Invited by email to the Supabase organisation |
| Shared password vault (Bitwarden, free) | Data lead | Invited to the "Career Coach" collection |
| Project Gmail (product's sender address) | Data lead | Password in the vault |
| GitHub repo (created by connecting Lovable) | Website | Added as collaborators |
| Lovable project | Website | Invited if they need to prompt it (one person prompts at a time) |
| Vercel (live site) | Website | Nobody needs access: it redeploys on every push |
| Course n8n "engine" account (final workflows live and are published here) | n8n owner | Build elsewhere if needed, then send exported JSON to import |
| Apify account | n8n owner | Nobody |

### Secrets

- **The vault holds:** Supabase project URL, anon key, service_role key, database password, Apify token,
  course model key, project Gmail password.
- **The website only ever gets:** the Supabase URL, the anon key and the n8n webhook base URL.
- **The service_role key, Apify token and model key** live only in the vault and in n8n credentials.
- **Never** paste a key into a Claude chat, WhatsApp or the GitHub repo.

### Repo layout (GitHub)

```
/            website code (managed by Lovable)
/supabase    SQL files, numbered: 01_supabase_onboarding.sql, 02_core_tables.sql, 03_...
/n8n         exported workflow JSON, one file per workflow, re-exported after every change
/docs        these briefs, PAGES.md, the proposal, test sets, report drafts
```

### Database

The SQL files in `/supabase` are the truth. **Only the data lead runs schema changes**, always as a new
numbered file. Every table that holds a student's data has row-level security: a student sees only their
own rows; n8n uses the service key.

| Table / view | What it holds | Written by |
|---|---|---|
| `profiles` | One row per student: details, `onboarding_step`, `plan`, `is_admin` | Website (student's own fields only); plan/admin by n8n or dashboard |
| `linkedin_imports` | Each import attempt, raw and mapped data | n8n |
| `career_tracks` | The 10 tracks (key, name, description) | Data lead |
| `quiz_questions`, `quiz_options` | Quiz content and track weights | Data lead |
| `quiz_responses` | A student's answers (one row per chosen option, or one text answer) | Website |
| `quiz_track_scores` (view) | Score per track per student, from the weights (no AI) | (computed) |
| `interest_results` | The AI-written tracks with reasons and confidence | n8n |
| `ai_runs` | One row per workflow run using a model or paid API, success or failure | n8n |
| `plan_limits` | Monthly limit per plan and feature (0 = not on that plan) | Data lead |
| `monthly_usage` (view) | This month's successful runs per student and feature | (computed) |
| `opportunities` | Curated, verified programmes with eligibility rules | Data lead |

### Feature names

Used in `ai_runs.workflow`, `plan_limits.feature` and the limits check, spelled exactly:
`linkedin-import`, `onboard-tracks`, `cv-review`, `coach-message`, `interview-session`,
`negotiation-draft`, `vent-message`.

### Website ⇄ n8n webhook contract

- **Address:** `https://n8n.devplusops.com/webhook/<path>` (use `/webhook-test/<path>` only while
  building in the n8n editor).
- **Request:** `POST`, JSON body, header `Authorization: Bearer <the student's Supabase access token>`.
- **Success reply:** HTTP 200, `{"ok": true, ...data}`.
- **Failure reply:** HTTP 200, `{"ok": false, "code": "<code>", "retryable": true|false}`.
  The one exception: not signed in returns HTTP 401 `{"ok": false, "code": "not_signed_in"}`.
- **Website timeouts:** 90 seconds for `linkedin-import`, 60 seconds for everything else. A timeout
  or network error is shown like `ai_unavailable`.

| Code | Message the student sees |
|---|---|
| `not_signed_in` | "Please sign in again." (then send them to sign-in) |
| `bad_input` | "Something in the form isn't right. Please check it and try again." |
| `bad_url` | "That doesn't look like a LinkedIn profile link." |
| `profile_empty` | "We couldn't read details from that profile (it may be private). Please fill in the form below." |
| `import_failed` | "LinkedIn import isn't working right now. You can try again or fill in the form below." |
| `limit_reached` | Reply also has `used` and `limit`. If `limit` is 0: "This is part of the Premium plan." Otherwise: "You've used all {limit} this month. They reset on the 1st, or you can upgrade." |
| `ai_unavailable` | "Our AI is having a moment. Your work is saved; please try again." |

**Endpoints for week 1** (add new ones here, agreed by all three, before anyone builds them):

1. **`linkedin-import`**
   - Body: `{"linkedin_url": "https://www.linkedin.com/in/..."}`
   - Success: `{"ok": true, "mapped": {"full_name", "headline", "city", "university", "degree", "major",
     "grad_year", "skills": [], "languages": [], "experience": [{"title","org","start","end","description"}],
     "education": [{"school","degree","field","start","end"}]}}`. Empty fields are `null` or `[]`.
   - Writes `linkedin_imports` and `ai_runs`. **Does not** write `profiles`: the student confirms in the form.
   - Possible codes: `not_signed_in`, `bad_url`, `profile_empty`, `import_failed`, `limit_reached`.
2. **`onboard-tracks`**
   - Body: `{}` (n8n reads the saved profile and quiz answers itself).
   - Called by the website right after the last quiz answer is saved.
   - Success: `{"ok": true, "tracks": [{"track_key", "name", "score", "reason"}] (exactly 3, best first),
     "confidence": 0.0-1.0, "needs_followup": true|false, "followup_questions": ["..."] (0 to 2)}`.
   - Writes `interest_results` and `ai_runs`.
   - Possible codes: `not_signed_in`, `bad_input` (quiz not finished), `limit_reached`, `ai_unavailable`.

### Definition of done (for any feature)

1. It works on the live site for a brand-new account, on a phone.
2. A second account can't see the first account's data.
3. When something breaks, the student sees a clear message and can try again, and the failure is in `ai_runs`.
4. You can explain every page, node or table involved, without notes.

### Course rules that apply to all of us

- **No code written by hand.** AI tools write it, but we must be able to explain all of it.
- **AI and data work happen in n8n's own nodes,** not Code nodes. A short Code node for formatting is fine.
- **Every webhook checks who is calling.**
- **No invented traction.** No fake testimonials or user counts. Sample content is labelled "Sample".
  Every number in the report is measured by us or marked as an estimate.
- **Honest status.** Every feature is recorded as "works for a stranger", "works only for us" or "not built".
