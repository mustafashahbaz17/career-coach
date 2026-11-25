# Brief 1: Data and product lead — Career Coach

> **How to use this file:** start a new Claude chat (or a Claude Project for your role), attach this file
> plus the files under "Your files", and say: **"Read the brief and let's start with Step 1."**

## Instructions for Claude

You are helping the **data and product lead** of a three-person student team build their part of Career
Coach. Work through the steps below in order, one at a time:

- For each step, explain in plain words what we're doing and why, give exact clicks or text to paste,
  then go through the **Done when** checks with me before moving on.
- Write any SQL, CSV, prompt or document I need. I'm not allowed to write code by hand, but I must
  understand it, so explain each piece in a sentence or two.
- Never ask me for passwords or keys. Tell me where to paste them (the vault, Supabase, n8n).
- Don't change the **Shared contracts** section. If something there needs to change, draft a short
  message I can send my two teammates.
- If a step needs something from a teammate, tell me exactly what to ask for.
- If I paste an error or screenshot, diagnose it before suggesting a fix.

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

You own the **data and the product**: the Supabase project and every schema change, the shared accounts
and vault, the curated opportunity database, customer conversations, the M1 proposal, and stranger-testing
the site. Later you also own the admin page spec, the A11 cost numbers, recruiting real users (B1) and the report.

## Your files (attach these to your Claude chat)

- `01_supabase_onboarding.sql`: profiles, LinkedIn imports, quiz tables and quiz content
- `02_core_tables.sql`: admin helper, `ai_runs`, `plan_limits`, `monthly_usage`, `opportunities`
- `03_opportunities_template.csv`: column headers and one example row for the opportunity import

Both SQL files have been tested on Postgres 16 with a two-account security check. They are safe to re-run.

---

## Step 1: Create the shared accounts (first hour, before anything else)

1. **Supabase:** go to supabase.com, sign in with your own email, click **New project**. Name it
   `career-coach`, pick the region closest to Pakistan (for example Mumbai), generate a strong database
   password and save it straight into the vault (next point).
2. **Vault:** create a free Bitwarden account, then an organisation (free tier) with a collection called
   "Career Coach". Invite both teammates by email.
3. **Project Gmail:** create a new Gmail account just for the product (for example
   `careercoach.project@gmail.com`, or whatever's free). Save the password in the vault. Turn on 2-step
   verification. This address will send reminders and digests later.

**Done when:** the Supabase project shows "Healthy", the vault has the database password and Gmail
login, and both teammates have accepted the vault invite.

## Step 2: Build the database

1. In Supabase, open **SQL Editor → New query**, paste all of `01_supabase_onboarding.sql`, click **Run**.
2. New query again, paste all of `02_core_tables.sql`, click **Run**.
3. Go to **Authentication → Sign In / Providers**: make sure **Email** is on. While building, turn
   **Confirm email** off so test accounts work instantly. Note in the team chat that we must decide
   before marking day whether to turn it back on.

**Done when** Table Editor shows: `profiles`, `linkedin_imports`, `career_tracks` (10 rows),
`quiz_questions` (10 rows), `quiz_options` (44 rows), `quiz_responses`, `interest_results`, `ai_runs`,
`plan_limits` (21 rows), `opportunities`. If Run shows an error, paste it to Claude.

## Step 3: Invite the team and share the keys

1. Supabase **Organization settings → Team → Invite**: add both teammates.
2. Supabase **Project Settings → API** (or "API Keys"): copy into the vault, as separate items:
   - Project URL
   - `anon` / publishable key (safe for the website)
   - `service_role` / secret key (**n8n only**, label it "DO NOT put in website")
3. Post in the team chat: "Supabase is ready, keys are in the vault. Website: use the URL and anon key.
   n8n: use the URL and service_role key."

**Done when:** both teammates confirm they can see the project and the vault items.

## Step 4: Set up the repo folders (once the website teammate has created the GitHub repo)

1. Ask the website teammate for the repo link and to add you as a collaborator.
2. In GitHub (web is fine: **Add file → Upload files**), create the folders from the Shared contracts:
   upload the two SQL files and the CSV to `/supabase`, and the three briefs to `/docs`. Create `/n8n`
   with an empty `README.md` saying "Exported n8n workflows go here".

**Done when:** the repo has `/supabase`, `/n8n` and `/docs`, and the SQL files are in `/supabase`.

## Step 5: Customer conversations (this week, 6 in total, 2 each)

Ask Claude to turn this into a one-page interview guide and a notes template, then share both with the team:

- **Who:** final-year or penultimate-year students who went through (or are in) recruitment this year,
  ideally from different universities and majors.
- **Consent line to read first:** "This is for a university project. Can I take notes? I won't use your
  name anywhere."
- **Questions (keep it to about 15 minutes):**
  1. Walk me through your last recruitment season. What did you apply to, and how did you find it?
  2. How did you keep track of deadlines and applications?
  3. What was the most stressful or annoying part?
  4. How did you prepare your CV? Did you change it for different roles?
  5. How did you prepare for interviews? Did anyone help you practise?
  6. Did you ever negotiate an offer, or wish you had?
  7. Have you paid for anything to help (CV writing, counselling, courses)? How much?
  8. If a website did the most useful part of this for you, would you pay for it? What would feel fair per month?
- **Write down their words,** not your summary. Short quotes are gold for the proposal and report.

**Done when:** 6 notes files are in `/docs/customer-conversations/` and Claude has helped you write a
half-page summary: the top 3 pains, what they use today, what they'd pay.

## Step 6: Build the opportunity database (target: 50 real, currently open opportunities)

This is what makes matching useful, and markers will notice whether it's real.

1. **Where to look:** large employers' careers pages (FMCG, banks, Big 4 and consulting, telecoms, tech
   companies, energy), your university career office's emails, scholarship and fellowship portals,
   and society and competition pages.
2. **For each opportunity, fill one row of `03_opportunities_template.csv`** (open it in Google Sheets
   or Excel):
   - `track_keys`: one or more of `consulting, marketing, finance, tech, data, operations, people,
     policy, founder, creative`, written like `{marketing,operations}`
   - Eligibility (`min_cgpa`, `degrees`, `grad_years`, `age_max`, `nationality_rule`, `gender_rule`):
     **only if the source says so**; otherwise leave blank (or `any` for `gender_rule`)
   - `source_url`: the page where you checked it; `last_checked`: today's date
   - `verified`: `true` only after you personally opened the page and checked the deadline
   - `is_sample`: `false` for real ones
3. Delete the example row, export as CSV, then in Supabase **Table Editor → opportunities → Insert →
   Import data from CSV**.
4. Never invent an opportunity. If unsure whether something is still open, set `verified` to `false`
   and the website will label it.

**Done when:** at least 50 rows are imported, every row has `apply_url` and `source_url`, and at least
40 are `verified = true`.

## Step 7: Write the M1 proposal (one page)

Ask Claude to draft it from the customer-conversation summary, with exactly these parts, as the brief requires:

1. **The customer:** who exactly (from the conversations).
2. **The job they need done**, in their words.
3. **The journey in five steps:** sign up and onboard → profile and matches → tracker and CV tailoring
   → interview practice → reminders and offer help.
4. **The AI's job:** messy input to structured data (LinkedIn/CV import, offer letters), classification
   with a path for unsure cases (career tracks, vent-space safety check), drafts a person approves
   (CV changes, negotiation emails), an agent with tools (coach).
5. **The plans:** Free, Pro, Premium and what each includes.
6. **Who does what:** the three roles in this pack.
7. One line asking the instructor to confirm the product is different from last year's "graduate-programme
   adviser" and "CV screening" projects: ours runs the student's whole recruitment season, centred on the
   tracker, and works for the candidate, not the recruiter.

**Done when:** the team has read it and it's submitted on the LMS.

## Step 8: Test the live site as a stranger (every time something new goes live)

1. Make yourself admin: sign up on the live site, then in Supabase **Table Editor → profiles**, set
   `is_admin = true` on your row (students can't change this themselves; the database blocks it).
2. Run this checklist with two brand-new accounts (one in a private window), one of them on a phone:
   - [ ] Sign up, sign out, sign in again
   - [ ] LinkedIn import works, or shows a clear message and the form still works
   - [ ] About-you form saves; refresh the page and the data is still there
   - [ ] Quiz: answer 4 questions, refresh, and it resumes at question 5
   - [ ] Results show 3 tracks; with the n8n workflow live, each has a reason
   - [ ] Account B can't see anything of account A's
   - [ ] Every error message is from the Shared contracts table; there are no blank screens or endless spinners
3. Log every problem as a **GitHub Issue** (title, steps to reproduce, screenshot, who it's for).

**Done when:** the checklist passes for the walking skeleton. That's M2.

## Coming next (week 2 onwards, don't start yet)

- **Admin page spec** for the website teammate: sign-ups, plan, runs and cost per student, failed runs from `ai_runs`.
- **New schema changes** as numbered SQL files (`03_...sql`): tracker, CV versions, interview sessions, vent messages.
- **Numbers (A11):** cost per run and per customer from `ai_runs`.
- **Real users (B1):** recruit at least 5 students outside the group, collect feedback, and ship one change because of it.

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
/supabase    SQL files, numbered: 01_supabase_onboarding.sql, 02_core_tables.sql, 03_opportunity_scout.sql, 04_...
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
| `opportunities` | Curated, verified programmes with eligibility rules | Data lead; admins (approving scout finds) |
| `opportunity_sources` | Careers pages and feeds the opportunity scout reads | Data lead / admins; n8n updates `last_scouted_at`, `last_status`, `last_error` |
| `opportunity_candidates` | Openings the scout found, waiting for an admin to approve or reject | n8n via `scout_add_candidate()` (service key); admins via `approve_opportunity_candidate()` / `reject_opportunity_candidate()` |
| `opportunity_candidates_pending` (view) | Pending candidates whose deadline hasn't passed, soonest first | (computed) |

### Feature names

Used in `ai_runs.workflow`, `plan_limits.feature` and the limits check, spelled exactly:
`linkedin-import`, `onboard-tracks`, `cv-review`, `coach-message`, `interview-session`,
`negotiation-draft`, `vent-message`, `opportunity-scout` (scheduled job: logged in `ai_runs` with `user_id` null, no `plan_limits` rows).

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

**Scheduled workflows** (no webhook, agreed 25 Nov 2026):

- **`opportunity-scout`**: Mon and Thu 10:00 PKT. Reads active `opportunity_sources`, the AI extracts openings with an exact quote from the page, n8n keeps only rows whose quote is on the page, then calls `POST /rest/v1/rpc/scout_add_candidate` (reply `added` / `duplicate` / `expired`). Nothing reaches students until an admin approves it on the admin page. Spec: shared in the group chat on 25 Nov 2026.

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
