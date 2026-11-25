# Brief 3: n8n engine and AI — Career Coach

> **How to use this file:** start a new Claude chat (or a Claude Project for your role), attach this file
> plus the files under "Your files", and say: **"Read the brief and let's start with Step 1."**

## Instructions for Claude

You are helping the **n8n and AI owner** of a three-person student team. All AI work runs in n8n on the
course server (https://n8n.devplusops.com). The website calls n8n through webhooks; n8n reads and writes
Supabase with the service key. Work through the steps below in order, one at a time:

- For each step, explain in plain words what we're building, then give exact node-by-node settings, or an
  **importable n8n workflow JSON** when I ask for one, then go through the **Done when** checks with me
  before moving on.
- Before writing any workflow JSON, ask me for our n8n version (Step 1) and match node types and
  versions to it. Use credential names exactly as listed in Step 2, so imports pick them up.
- **Course rule:** the AI work and the data work happen in n8n's own nodes (Webhook, IF, Switch,
  Supabase, HTTP Request, Edit Fields, Merge, Information Extractor, Text Classifier, Basic LLM Chain,
  AI Agent, Respond to Webhook...). **Don't put logic in Code nodes.** A tiny one for formatting is the
  most that's allowed.
- I'm not allowed to write code by hand, but I must be able to explain every node, so explain each in a
  sentence.
- Never ask me for keys. Tell me which credential to create and where to paste the key from our vault.
- Don't change the **Shared contracts**. If an endpoint or code needs to change, draft a short message
  I can send my teammates.
- If I paste an n8n error or execution log, diagnose it before suggesting a fix.

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

You own the **engine**: the course n8n account where all final workflows live and are published, every
credential, Apify, the shared login-and-limits check, all AI workflows, logging to `ai_runs`, error
handling, and the AI evidence (A10 test sets, model comparison, guardrails).

## Your files (attach these to your Claude chat)

- `n8n_linkedin_import_guide.md`: node-by-node design of the `linkedin-import` workflow (Step 5)

---

## Step 1: Set up the engine account

1. Log in to https://n8n.devplusops.com with your course account. This account is the team's
   **engine**: final workflows live and are published here.
2. Find the n8n version (**Help → About n8n**, or at the bottom of the left sidebar). Post it in the team
   chat, and tell Claude.
3. Ask the instructor (or check the course page) how to set up the **course model** credential in n8n:
   the base URL, the model name, and where your key comes from (the course portal).
4. Optional but useful: tag every workflow `career-coach`.

**Done when:** the version is posted, and you know how to add the course model credential.

## Step 2: Create the credentials (names exactly as below)

Use **Credentials → Add credential**. Get every key from the vault, never from chat.

| Name | Type | Contents |
|---|---|---|
| `CC Supabase service` | Supabase API | Supabase project URL + **service_role** key |
| `CC Apify` | Header Auth | Name `Authorization`, value `Bearer <Apify token>` |
| `CC Model` | As the course instructs (often an OpenAI-compatible chat model) | Course model base URL and key |
| `CC Gmail` | Gmail OAuth2 (or SMTP) | The project Gmail (for alerts now, reminders later) |

Also note two values you'll type into nodes (not secret): the **Supabase URL** and the **anon key** (the
login check uses the anon key).

**Done when:** all four credentials save and test successfully, if the credential screen offers a test.

## Step 3: Choose the Apify actor

1. Create a free Apify account with your email, copy the API token into the vault, and use it in `CC Apify`.
2. In the Apify Store, search **"LinkedIn profile scraper no cookies"**. Pick two actors with recent
   updates and many users.
3. With permission, collect 10 classmates' LinkedIn profile links and run each actor on them from the
   Apify website.
4. Record a small table: actor, profiles returned, how often education and experience were filled, cost.
   Keep the best actor and the runner-up as a backup. Note the actor ID (`username~actor-name`) and its
   input field name (Input tab, usually `profileUrls` or `urls`).

**Done when:** the actor is chosen and its ID, input field name and backup are noted in the team chat.

## Step 4: The shared sub-workflow `cc-auth-and-limits`

Every webhook workflow calls this first. It answers "who is this, and are they allowed to run this
feature now?"

- **Trigger:** "When Executed by Another Workflow" (Execute Workflow Trigger), with inputs `token`
  (the full `Authorization` header) and `feature` (one of the feature names in the Shared contracts).
- **Nodes:**
  1. **HTTP Request:** GET `<Supabase URL>/auth/v1/user`, headers `apikey: <anon key>` and
     `Authorization: {{ $json.token }}`. On Error: *Continue (using error output)*. Error output →
     return `{ "ok": false, "code": "not_signed_in" }`.
  2. **Supabase** (`CC Supabase service`): get the `profiles` row where `id` = the user id → read `plan`.
  3. **Supabase:** get the `plan_limits` row where `plan` = that plan and `feature` = the feature →
     `monthly_limit` (treat missing as 0).
  4. **Supabase:** get rows from `monthly_usage` where `user_id` = the user and `feature` = the feature
     → `runs` (none = 0). Turn on "Always Output Data" so an empty result still continues.
  5. **IF** `runs >= monthly_limit` → return `{ "ok": false, "code": "limit_reached", "used": runs,
     "limit": monthly_limit, "user_id", "plan" }`; otherwise return `{ "ok": true, "user_id", "plan",
     "used": runs, "limit": monthly_limit }`.
- **In each webhook workflow:** Execute Workflow → IF `ok` → continue, or **Respond to Webhook** (401
  for `not_signed_in`, 200 with the reply for `limit_reached`). When a limit stops a run, also insert an
  `ai_runs` row with `status = limit_reached` for the admin page.
- **Remember:** only successful runs count toward a limit (`monthly_usage` counts `status = 'success'`),
  so failures never use up a student's allowance.

**Done when:** tested from a small test workflow, a wrong token gives `not_signed_in`; a free test
account gets `ok` for `cv-review` until two `success` rows exist for it in `ai_runs`, then
`limit_reached` with `limit` 2; and `interview-session` on Free gives `limit_reached` with `limit` 0.
(Add and delete test rows in `ai_runs` via the Supabase Table Editor.)

## Step 5: The `linkedin-import` workflow

Build it from `n8n_linkedin_import_guide.md` (node 2 now calls `cc-auth-and-limits` with feature
`linkedin-import`). You can ask Claude for importable JSON once it knows the n8n version.

- Set the Webhook node's **Allowed Origins (CORS)** to the live site address (from the website teammate).
- Set the AI node's chat model to `CC Model`.
- **Recording tokens and cost:** ask Claude how to read token counts from the chat model's output in
  our n8n version, and write `input_tokens`, `output_tokens` and the cost into `ai_runs`. For Apify, write
  the price per profile into `cost_usd` with `model = 'apify'`. If token counts can't be read in a later
  node, record them from the execution log during test runs, and mark those figures as estimates.

**Done when:**

- [ ] On the live site, 3 real profiles import and pre-fill the form
- [ ] A private or non-existent profile gives `profile_empty`
- [ ] A broken Apify token gives `import_failed`, plus a `failed` row in `ai_runs`
- [ ] A 4th import on Free in one month gives `limit_reached`
- [ ] The workflow is active (published) and exported to `/n8n/linkedin-import.json` in the repo

## Step 6: The `onboard-tracks` workflow (the first real AI result)

Contract: see endpoint 2 in the Shared contracts.

**Nodes:**

1. **Webhook** POST `onboard-tracks` (respond with a Respond to Webhook node; CORS = live site).
2. **Execute Workflow** `cc-auth-and-limits` with feature `onboard-tracks`; stop and reply if not `ok`.
3. **Supabase:** get the student's `profiles` row. Pass on **only** `degree`, `major`, `study_year`,
   `skills`, `experience` (titles and organisations), `university`. **Do not** pass gender, nationality
   or birth year to the model: tracks must never depend on them.
4. **Supabase:** get the student's rows from `quiz_track_scores` (filter `user_id`), and their
   `quiz_responses` text answers for `q9` and `q10`. If there are no scores, reply `bad_input`.
5. **Supabase:** get all `career_tracks`.
6. **Information Extractor** (model `CC Model`) with this output schema:

   ```json
   {
     "tracks": [
       { "track_key": "one of the given keys", "reason": "max 2 sentences, specific to this student" }
     ],
     "confidence": "number from 0 to 1",
     "followup_questions": ["0 to 2 short questions"]
   }
   ```

   and this instruction text (Claude can tune it with you):

   > You are a careers adviser for Pakistani university students. Choose the 3 career tracks, from the
   > list given, that best fit this student, best first. Base your choice on the quiz scores, their
   > profile and their own words. Never use or guess gender, nationality, religion or age. Don't invent
   > experience they don't have. Each reason must mention something specific from their answers or
   > profile, in plain, encouraging English, at most 2 sentences. Set confidence low (below 0.6) if
   > the top scores are close or their answers point in different directions; in that case write 2
   > short follow-up questions that would best tell the top tracks apart. Otherwise return no questions.
   > Return only track keys from the list.
   >
   > Career tracks: {{ list of key: name — description }}
   > Quiz scores (higher means a stronger fit): {{ scores }}
   > Profile: {{ the allowed fields only }}
   > Something they're proud of: {{ q9 }}
   > Careers or companies they're curious about: {{ q10 or "not given" }}

7. **IF:** exactly 3 tracks, all keys valid. If not, retry once, then treat as an AI failure.
8. **Merge / Edit Fields:** add each track's `name` (from `career_tracks`) and `score` (from
   `quiz_track_scores`); set `needs_followup` = `confidence < 0.6`.
9. **Supabase:** insert into `interest_results` (`user_id`, `tracks`, `confidence`, `needs_followup`, `model`).
10. **Supabase:** insert into `ai_runs` (`workflow = onboard-tracks`, `status = success`, model, tokens,
    cost, latency).
11. **Respond to Webhook:** `{ "ok": true, "tracks": [...], "confidence": ..., "needs_followup": ...,
    "followup_questions": [...] }`.
- **Error path:** turn on the error output for the model and Supabase nodes → insert `ai_runs` with
  `status = failed`, `error_code = ai_unavailable` and the error text → reply `{ "ok": false, "code":
  "ai_unavailable", "retryable": true }`.

**Done when:**

- [ ] A test student who finished the quiz gets 3 sensible tracks with specific reasons on the live site
- [ ] Rows appear in `interest_results` and `ai_runs`
- [ ] Changing the model name to something invalid gives the `ai_unavailable` message on the site, plus a `failed` row
- [ ] Exported to `/n8n/onboard-tracks.json`

## Step 7: The `cc-error-handler` workflow

Catches anything that crashes outright, so failures are never silent.

1. **Error Trigger** → **Supabase** insert into `ai_runs` (`workflow` = the failed workflow's name,
   `status = failed`, `error_message` = the error text) → **Gmail** (`CC Gmail`) to the team: workflow
   name, error and a link to the execution.
2. In every workflow's **Settings → Error workflow**, choose `cc-error-handler`.

**Done when:** a deliberately broken test workflow produces a `failed` row and an email.

## Step 8: Publish and export, every time

- **Activate** each workflow so its production URL (`/webhook/...`) works.
- **After every change,** download the workflow JSON (**⋯ → Download**) and upload it to `/n8n/` in the
  repo, replacing the old file. The exported files are part of the hand-in.
- Keep a short `/n8n/README.md` table: workflow, trigger, what it does, tables it writes.

**Done when:** the repo's `/n8n` files match what's live.

## Step 9: Start the evidence (A10), using real tests

The brief requires at least 20 test inputs with the expected result, a pass rate, then one change
(prompt, model or retrieval) and the pass rate again, including the cases that still fail. Start two
sets now in a shared Google Sheet with columns: `id, input, expected, actual, pass (yes/no), run date,
model, prompt version, notes`.

1. **LinkedIn import set:** 20 real profile links (with permission). Under `expected`, a teammate fills
   in the correct university, degree, major, graduation year and number of experiences. A pass means
   every one of those fields is right.
2. **Career tracks set:** 20 quiz answer sets written by the team to clearly suit one track (e.g. a
   student who loves spreadsheets, maths and high pay → finance or data), plus 5 deliberately mixed
   ones. A pass means the expected track is in the top 3, and mixed sets get `needs_followup = true`.
3. Run each set through the live product (or the workflow with test accounts) and record the results.
   Then change one thing (for example, add two worked examples to the instruction) and run again.

**Done when:** both sets have a first run recorded with a pass rate.

## Coming next (week 2 onwards, don't start yet)

`cv-review` (PDF CV → structured critique and tailored suggestions for approval), `coach-message`
(AI Agent with tools: search opportunities, read/update tracker, book a practice slot),
`daily-reminders` and `weekly-digest` (schedules), `vent-message` (safety check with Text Classifier
first), and model comparison (B13) plus the guardrail tests (B14).

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
