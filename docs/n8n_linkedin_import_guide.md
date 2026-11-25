# n8n workflow: `linkedin-import`

Built on the course n8n (https://n8n.devplusops.com). The website calls it; it calls Apify; it returns
pre-fill data. It never writes to `profiles` itself: the student confirms the details in the form first.

## Before you start

1. **Apify account** (free plan) → Settings → Integrations → copy your API token.
2. **Pick an actor.** Search the Apify Store for "LinkedIn profile scraper no cookies". Pick two candidates
   and run each on 10 classmates' profile links (with their permission). Keep the one that fills
   education and experience most often. Note its ID (for example `username~actor-name`) and the name of
   its input field (usually `profileUrls` or `urls`; check the actor's Input tab).
   Community actors break or go "under maintenance", so keep the runner-up as a backup.
3. **n8n credentials** (Credentials → New):
   - `CC Apify`: type *Header Auth*, name `Authorization`, value `Bearer <your Apify token>`.
   - `CC Supabase service`: type *Supabase API*, your project URL and the **service_role** key (never put
     this key in the website).
4. **n8n variables** (or a Set node at the top): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APIFY_ACTOR_ID`.

## The nodes, in order

| # | Node | Settings | On failure |
|---|------|----------|------------|
| 1 | **Webhook** | POST, path `linkedin-import`, Respond: *Using 'Respond to Webhook' node*. Options → Allowed Origins (CORS): your site's address (e.g. `https://career-coach.vercel.app`) | |
| 2 | **Execute Workflow** "cc-auth-and-limits" | Call the shared sub-workflow with `token` = `{{ $json.headers.authorization }}` and `feature` = `linkedin-import`. It returns `{ok, user_id, plan}` or `{ok:false, code}` (see Step 4 of the n8n brief). If you haven't built it yet, use an **HTTP Request** GET `{{SUPABASE_URL}}/auth/v1/user` with headers `apikey: {{SUPABASE_ANON_KEY}}` and `Authorization: <the header>`, On Error: *Continue (using error output)* | `ok` false → **Respond** with its code (401 for `not_signed_in`, 200 for `limit_reached`) |
| 3 | **IF** "Valid link?" | `{{ $('Webhook').item.json.body.linkedin_url }}` matches regex `^https?://(www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?$` | False → **Respond** 200 `{"ok":false,"code":"bad_url"}` |
| 4 | **Supabase** "Log attempt" | Create row in `linkedin_imports`: `user_id` = id from node 2, `linkedin_url`, `status` = `pending` | |
| 5 | **HTTP Request** "Apify" | POST `https://api.apify.com/v2/acts/{{APIFY_ACTOR_ID}}/run-sync-get-dataset-items`, credential *CC Apify*, JSON body `{"profileUrls": ["{{ link }}"]}` (use your actor's field name). Options → Timeout: `120000`. On Error: *Continue (using error output)* | Error output → node 9 |
| 6 | **IF** "Got a profile?" | Response is a non-empty array and has a name field | False → Supabase update `status = empty` → **Respond** `{"ok":false,"code":"profile_empty"}` |
| 7 | **Information Extractor** (AI) | Input: the profile JSON as text. Schema: `full_name, headline, city, university, degree, major, grad_year (number), skills (array), languages (array), experience (array of {title, org, start, end, description}), education (array of {school, degree, field, start, end})`. Instruction: "Use only what is in the profile. Leave a field empty if it is not there. Pick the most recent university education for university, degree, major and grad_year." | Error output → node 9 |
| 8 | **Supabase** "Save" + "Log run" + **Respond** | Update the `linkedin_imports` row: `status = success`, `raw`, `mapped`. Insert an `ai_runs` row: `workflow = linkedin-import`, `status = success`, model, tokens, cost, latency. Then Respond 200 `{"ok":true,"mapped": {...}}` | |
| 9 | **Supabase** "Mark failed" + "Log run" + **Respond** | Update row: `status = failed`, `error_message`. Insert an `ai_runs` row with `status = failed`, `error_code = import_failed` and the error text. Respond 200 `{"ok":false,"code":"import_failed","retryable":true}` | |

Why node 7 uses AI rather than a plain mapping: actors return education and dates in messy, inconsistent
shapes (and Pakistani degree names vary a lot). Turning that into clean fields the product then uses is
the "messy input to structured data" technique in A4, and it is easy to test: 20 real profile links with
the expected fields filled in by hand.

## Things that will bite you

- **The run must finish within 300 seconds** or Apify's sync endpoint times out (the run itself keeps going).
  Single profiles usually take far less; the website gives up after 90 seconds and offers the form.
- **Private or thin profiles** are common among students. Treat "empty" as normal, not an error.
- **LinkedIn's terms forbid scraping**, and these actors read public pages without LinkedIn's permission.
  Keep the import optional, never store more than you show the student, mention it in the report's
  "what we would not trust it with" section, and tell your instructor you're using it.
- **Cost:** pay-per-profile actors are listed at roughly USD 2 to 10 per 1,000 profiles. Every run is logged
  in `ai_runs` (nodes 8 and 9), so the A11 numbers include it.
- **Use the course rule on Code nodes:** none of the steps above needs one.
