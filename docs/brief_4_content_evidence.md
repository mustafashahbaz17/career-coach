# Brief 4: Content and evidence — Career Coach

> **How to use this file:** start a new Claude chat (or a Claude Project for your role), attach this file,
> and say: **"Read the brief and let's start with Step 1."**

## Instructions for Claude

You are helping the **content and evidence owner** of a four-person student team. This person
doesn't build pages or workflows. They prepare everything the product needs to be **accurate and provably
working**: privacy text, rubrics, question banks, salary data, test sets, stranger tests and the report. Work through the steps below in order, one at a time:

- For each step, explain in plain words what we're producing and why it matters for the marks, help me
  draft it, then go through the **Done when** checks with me before moving on.
- **Accuracy rules:** never invent facts, numbers, prices, phone numbers or sources. If something must
  be looked up (a helpline, a salary, a price), tell me what to search for and how to check it, and
  record the source link and date beside every figure. Anything not verified is labelled "estimate" or
  "unverified".
- Write content in plain, warm English that a stressed student would find clear. Where I ask, add a
  Roman Urdu version.
- Never ask me for passwords or keys. I don't need any for this role.
- Don't change the **Shared contracts**. If something there needs to change, draft a short message I
  can send my teammates.
- Deliverables go into the shared Google Drive folder "Career Coach evidence" (sheets) or into
  `/docs/content` and `/docs/evidence` in the GitHub repo (text). Tell me which, each time.

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
- **Team of four:** Data and product lead · Website · n8n engine and AI · Content and evidence.
- **Right now (week 1):** get the walking skeleton live: sign up → optional LinkedIn import → about-you
  form → interest quiz → AI-written career tracks, saved to the student's account.

## Your role

You own **content and evidence**: the privacy page text, the A10 test sets (you write the inputs and
expected answers; builders run them), the onboarding speed tests with strangers (B10, and the first real
users for B1), the interview and CV content for the Premium features, the salary benchmark data, the customer-side cost research for the numbers page, and
the report skeleton with the honest status table. You are the team's independent checker: you didn't
build the features, so your tests count.

## What you need

- A collaborator invite to the GitHub repo (from the website teammate)
- Edit access to nothing else: no Supabase, n8n or Lovable access needed
- A test account on the live site once it's up (sign up like a stranger)

---

## Step 1: Set up your workspace (day 1)

1. Create a Google Drive folder **"Career Coach evidence"** and share it with all three teammates (edit access).
2. Inside, create these Google Sheets (Claude will give you the column headers in each step):
   `A10 test sets`, `Interview question bank`, `Salary benchmarks`, `Customer-side costs`, `Status table`.
3. Ask the website teammate to add you to the GitHub repo. Create `/docs/content/` and `/docs/evidence/`
   (web upload is fine) with a one-line `README.md` in each.
4. Post in the team chat: "Evidence folder is ready: <link>. Test sets will appear in `A10 test sets`."

**Done when:** the folder and sheets exist and are shared, and the repo folders exist.

## Step 2: Interview simulator content (start this week; the feature is Premium)

1. **Question bank** (sheet `Interview question bank`), columns:
   `id, track_key, type, question, what_good_looks_like, follow_up`.
   - `track_key`: one of the 10 track keys, or `general`
   - `type`: `behavioural`, `motivational`, `technical_light` or `curveball`
   - Target: 20 `general` questions plus 8 per track (two of each type). Write them to suit entry-level
     candidates in Pakistan, and don't copy any company's real questions word for word.
2. **Grading rubric** (`/docs/content/interview_rubric.md`): 4 criteria (structure such as STAR,
   relevance to the question, specific evidence, clear communication), each scored 1 to 5 with a
   one-line description of what a 1, a 3 and a 5 look like.
3. **Interview grading test set** (tab `interview-grading`): 20 answers you write to 6 of the questions,
   deliberately strong, average or weak, with the expected band for each.
4. **What to wear** (`/docs/content/what_to_wear.md`): short guidance by setting (corporate and
   finance, FMCG and marketing, tech and startups, NGOs and government, video interviews), not tied to
   gender. Include both western formal and shalwar kameez as acceptable where they are, plus practical
   tips (ironed, simple, comfortable shoes, check the camera background).

**Done when:** the sheet has at least 100 questions, the rubric and wear guide are in the repo, and the
grading set has 20 rows. (Start this week; finishing in week 2 is fine.)

## Step 3: Privacy page and AI disclaimer (day 2)

Draft the text for the site's privacy page (the website teammate turns it into a page), in plain words, under 500 words:

- What we collect (account, profile details, quiz answers, CVs later, vent messages) and why
- What's optional (LinkedIn link, gender, nationality, birth year) and that gender and nationality are
  used only for eligibility rules, never to choose career suggestions
- The LinkedIn import: it reads your public profile only when you ask, and you confirm everything before
  it's saved
- Who can see your data (you; the team's admin sees usage counts, not vent messages)
- AI use: suggestions can be wrong, so check before relying on them; we're not counsellors or financial advisers
- How to delete your data (a contact email for now: the project Gmail)
- That it's a university project, with a contact address

**Done when:** `/docs/content/privacy_page.md` is in the repo and the website teammate has the link.

## Step 4: A10 test sets for week 1 (inputs and expected answers)

You write; the n8n teammate runs. Use the `A10 test sets` sheet, one tab per set, with columns
`id, input, expected, actual, pass (yes/no), run date, model, prompt version, notes`. Leave `actual`
and `pass` for after the run.

1. **Tab `linkedin-import`:** 20 real LinkedIn profile links, collected with each person's permission.
   For each, open the profile yourself and fill `expected` with the correct university, degree, major,
   graduation year and number of experience entries. Include some hard ones: thin profiles, two degrees,
   non-English names, missing dates. A pass means every expected field matches.
2. **Tab `onboard-tracks`:** 25 quiz answer sets. Write 20 that clearly suit one track (for example: loves
   spreadsheets, strongest in maths, wants high pay, "love numbers" → expected top track finance or data)
   and 5 deliberately mixed ones (expected: `needs_followup = true`). For each, list the answers by
   question (q1 to q10, using the option letters from the quiz) and the expected track or tracks. A pass
   means the expected track is in the returned top 3, and mixed sets ask follow-up questions. Ask Claude to
   check your sets against the quiz options and weights in `01_supabase_onboarding.sql` (ask the data lead
   for it).
3. When the n8n teammate has run a set, calculate the pass rate, and list the failing cases with a
   one-line guess at why. Agree with them the one change to make before the second run.

**Done when:** both tabs are complete and the n8n teammate has been told they're ready to run.

## Step 5: Onboarding speed test with strangers (end of week 1, once the site is live)

Part B feature B10 asks that a new customer reaches a first result **in under three minutes**. You prove
it, and these sessions are also your first real users (B1).

1. Recruit 5 students outside the group (different universities and majors if you can). Tell them it's a
   university project and that you'll time them, not judge them.
2. Write a one-page test script with Claude: one task ("Sign up and get your career tracks"), no help
   from you, then 4 short questions afterwards (What was confusing? What did you expect to happen? Would you
   use it again? What would make you pay?).
3. In sheet `A10 test sets`, tab `onboarding-timing`, columns: `id, date, device (phone/laptop),
   used LinkedIn import (yes/no), seconds to first result, where they got stuck, quotes, bugs found`.
   Time from pressing "Get started" to seeing the 3 tracks.
4. Turn every bug into a GitHub Issue for the right teammate. Summarise the top 3 frictions in the
   team chat with a suggested fix for each.
5. After the team fixes them, repeat with 3 new people and record the new times. A before-and-after
   like this is exactly what the 90+ band asks for ("the product changed because of what they said").

**Done when:** 5 timed sessions are logged with quotes, the median time is reported, Issues are filed,
and the re-test is scheduled.

## Step 6: CV studio content and the CV test set (week 2)

1. **CV critique rubric** (`/docs/content/cv_rubric.md`): 6 criteria (impact verbs and results, numbers,
   relevance to the target role, structure and length, formatting and ATS-readability, spelling and
   consistency), each with what good looks like and the 3 most common fixes.
2. **CV template spec** (`/docs/content/cv_template.md`): section order for a Pakistani student CV
   (contact, education with CGPA, experience, leadership and societies, projects, skills, achievements),
   one page, fonts and spacing, for the website teammate to build the PDF export.
3. **CV test set** (tab `cv-parse`): 25 CVs collected with consent. Remove names, phone numbers, emails,
   addresses and CNIC numbers before saving them to the evidence folder. For each, fill `expected`: degree,
   university, CGPA, graduation year and the list of experience titles. Include messy ones: two-column
   layouts, scanned PDFs, Urdu names.

**Done when:** the rubric and template are in the repo, and `cv-parse` has 25 anonymised CVs with expected fields.

## Step 7: Salary benchmarks (week 2; used by the Premium negotiation desk)

Sheet `Salary benchmarks`, columns:
`role, track_key, city, level, monthly_low_pkr, monthly_median_pkr, monthly_high_pkr, source_name, source_url, date_collected, sample_size_if_known, notes`.

- Target: about 25 common entry-level roles (management trainee, audit associate, junior software
  engineer, business analyst, marketing executive and so on) in Karachi, Lahore and Islamabad where data exists.
- Use only public sources you can link to (salary survey pages, job ads that state a salary range,
  published reports). Every row needs a source link and date. Where sources are thin, leave the row out
  rather than guess.
- The product will show every figure as an estimate with its source, so mark rows from a single job ad
  as `notes: single listing`.

**Done when:** at least 40 sourced rows exist (role × city), and the data lead has the sheet to import later.

## Step 8: Customer-side costs (week 2; for the A11 numbers page)

The brief asks what the job costs students today, without our product. In sheet `Customer-side costs`,
record real prices with links and dates:

- Professional CV-writing services in Pakistan (a few local providers and freelancer marketplaces)
- Career counselling sessions (private counsellors, platforms)
- Mock interview or coaching services
- Time: from the customer conversations, how many hours a week students spent finding, tracking and
  preparing applications (quote the notes, and mark as reported by students)

**Done when:** at least 10 sourced price points, plus the time estimate from the conversations.

## Step 9: Report skeleton and the status table (start now, update weekly)

1. Create `/docs/report.md` with exactly the 8 sections the brief requires, and their page limits:
   1. The customer and the job (½ page)
   2. The product: the journey, with screenshots (2 pages)
   3. How it is built: one diagram, one workflow table (1 page)
   4. What the AI does, and the evidence that it works (1½ pages)
   5. The numbers (1 page)
   6. What goes wrong and what happens then (½ page)
   7. Which Part B features we built, with a screenshot of each (1 page)
   8. Status table, then what we wouldn't trust the product with yet (½ page)

   Total: at most 8 pages. Add a bullet list under each heading of what will go there and who provides it.
2. In the `Status table` sheet, list every feature mentioned anywhere (landing page, plan, briefs), with
   columns `feature, owner, status (works for a stranger / works only for us / not built), last checked,
   checked by, evidence (screenshot link)`. Update it every Friday by testing the live site yourself
   with a fresh account. **You decide the status, not the builder.**
3. Keep a `/docs/evidence/screenshots/` folder: a screenshot of each working feature, named by date and feature.

**Done when:** the report skeleton is in the repo and the status table lists every feature, with this
week's check done.

## Coming next (week 3 onwards, don't start yet)

- **Real users (B1):** grow the Step 5 group to regular users, collect feedback each week, and log what
  they said and what we changed.
- **Guardrail tests (B14):** inputs that try to make the CV tool invent experience or change grades, that
  stereotype by gender or nationality, or that get the coach agent off-topic.
- **Model comparison (B13):** with the n8n teammate, run one test set on two models and compare quality and cost.
- **The 5-minute screen recording** (hand-in item 7): a script, then a recording of a new account going
  from sign-up to result.

## Shared contracts (identical in all four briefs)

Change anything in this section only when all four agree, then update all four briefs.

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
| Google Drive folder "Career Coach evidence" (test sets, content sheets, salary data) | Content and evidence | Everyone, with edit access |

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
/docs        these briefs, PAGES.md, the proposal, report drafts
/docs/content   safety messages, privacy text, rubrics, question banks (content owner)
/docs/evidence  exported test sets and results, screenshots (content owner)
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

**Endpoints for week 1** (add new ones here, agreed by all four, before anyone builds them):

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
- **Tests are written by someone who didn't build the feature.** The content and evidence owner writes
  the inputs and expected results; builders run them. The work never grades itself.
