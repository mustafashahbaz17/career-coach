# Eliza's n8n workflows: opportunity-matches, daily-reminders, weekly-digest

From the 28 Nov 2026 workflow split. Build and test in your own n8n, then send the JSON to Muntaha to publish
on the engine account.

## What's in this pack

| File | Goes in the repo at | What it is |
|---|---|---|
| `07_matches_and_emails.sql` | `/supabase/` | New tables and database functions the three workflows need (run once in Supabase) |
| `opportunity-matches.json` | `/n8n/` | Webhook: eligibility filter (no AI), then the AI ranks the matches with "why you qualify" and "what you're missing" |
| `daily-reminders.json` | `/n8n/` | Schedule, 9:00 daily: deadline emails 3 days and 1 day before |
| `weekly-digest.json` | `/n8n/` | Schedule, Monday 8:00: the week's deadlines, up to 3 new matches and one AI suggestion |

Every node has a one-line note under it (shown on the canvas) for the presentation.

## What 07 adds (tested on Postgres 16 with two accounts)

| Thing | What it does | Who uses it |
|---|---|---|
| `plan_limits` rows for `opportunity-matches` | Free 4, Pro 20, Premium 40 refreshes a month (proposal) | `cc-auth-and-limits`, pricing page |
| `profiles.email_reminders` | One on/off switch for all emails (students can change it; plan and admin flag stay locked) | Website toggle, both email workflows |
| `matches_for_user(user)` | Same eligibility rules as `my_matches`, for any student; service key only | opportunity-matches, weekly-digest |
| `opportunity_matches` + `save_opportunity_matches()` | The latest AI-ranked list per student, replaced in one step | opportunity-matches writes, student reads own |
| `my_ranked_matches` (view) | The student's saved ranked list, open opportunities only | Matches page on load (no AI run) |
| `email_log` | One row per email sent or failed; unique indexes stop double sends | Both email workflows, admin page |
| `due_deadline_reminders()` | Saved cards with reminders on, due in exactly 3 or 1 days (PKT), not yet emailed | daily-reminders |
| `weekly_digest_recipients()` | Students with a deadline in the next 7 days or a new eligible opportunity from the last 7 days, not sent in the last 5 days | weekly-digest |

Checks that passed: re-running the file is safe; a student can't call any of the functions, can't write
`opportunity_matches`, sees only their own matches, can turn `email_reminders` off but can't change `plan`;
a second "sent" log for the same reminder is rejected; ineligible (CGPA, gender rule) and expired
opportunities never appear.

## Order of work

1. **Supabase:** SQL Editor → New query → paste all of `07_matches_and_emails.sql` → Run.
2. **Your n8n:** create the credentials with these exact names: `CC Supabase service` (Supabase API, service_role
   key), `CC Model` (course model), `CC Gmail` (the project Gmail, Gmail OAuth2).
3. Import `cc-auth-and-limits.json` from the repo first (opportunity-matches calls it).
4. Import the three workflows. In **opportunity-matches → Auth check**, pick `cc-auth-and-limits` from the list.
   Check each node with a key icon shows the right credential.
5. Test (below), then send the three exported JSON files to Muntaha.

## Tests ("done when")

### opportunity-matches
Get a test token: sign in on the live site, DevTools → Application → Local Storage → the `sb-…-auth-token`
entry → copy `access_token`. Then click **Listen for test event** on the Webhook node and run:

```
curl -s -X POST https://n8n.devplusops.com/webhook-test/opportunity-matches \
  -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" -d '{}'
```

- [ ] A finished test student gets `ok: true` with 5 matches (Free), each with `why_you_qualify` and, where
      there is one, `what_you_are_missing`, and rows appear in `opportunity_matches` and `ai_runs`
- [ ] No token or a wrong token gives HTTP 401 `not_signed_in`
- [ ] A student who hasn't finished onboarding gets `bad_input`
- [ ] A student with no eligible opportunities gets `ok: true, matches: []` and no `ai_runs` row
- [ ] Changing `model_name` in AI settings to something invalid gives `ai_unavailable` and a `failed` row
- [ ] The 5th refresh in a month on Free gives `limit_reached` with `limit: 4`
- [ ] Guardrail: two test students identical except gender produce the same **Build prompt** text in the
      execution log, and it never contains gender, nationality or birth year

### daily-reminders
Use a test account with tracker cards due in 3 days and in 1 day (status Saved, reminders on), and one due
in 3 days with status Applied. Click **Execute workflow**.

- [ ] Two emails arrive from the project Gmail; the Applied card gets none
- [ ] `email_log` has two `sent` rows; running again sends nothing
- [ ] With `email_reminders` off on the profile, nothing is sent

### weekly-digest
Same test account, plus one opportunity added in the last 7 days that the account is eligible for. Click
**Execute workflow**.

- [ ] One email with the week's deadlines, the new opportunity and a one-line suggestion
- [ ] `email_log` has a `weekly_digest` row and `ai_runs` has a `weekly-digest` row; running again sends nothing
- [ ] With an invalid `model_name` in Settings, the email still arrives with a plain suggestion, and
      `ai_runs` shows `failed`

## Proposed addition to the Shared contracts (needs all four to agree)

**Feature names:** add `opportunity-matches` (webhook, has `plan_limits` rows) and `weekly-digest`
(scheduled, logged in `ai_runs` per student, no `plan_limits` rows). `daily-reminders` uses no AI, so it isn't
logged in `ai_runs`.

**Endpoint 3: `opportunity-matches`**
- Body: `{}` (n8n reads the saved profile and eligibility itself).
- Called when the student clicks "Find my matches" / "Refresh". On page load, the website reads
  `my_ranked_matches` instead, so no AI run is spent.
- Success: `{"ok": true, "matches": [{"opportunity_id", "rank", "fit_score" (0-100), "why_you_qualify",
  "what_you_are_missing" (or null), "rule_reasons": [], "title", "organisation", "kind", "city", "remote",
  "deadline", "apply_url", "verified", "is_sample", "in_tracker"}], "total_eligible": n,
  "more_on_paid_plan": true|false}`. Free gets the top 5, Pro and Premium the top 8.
- Nothing eligible: `{"ok": true, "matches": [], "total_eligible": 0, "more_on_paid_plan": false}`
  (no AI run, doesn't count toward the limit).
- Writes `opportunity_matches` and `ai_runs`.
- Possible codes: `not_signed_in`, `bad_input` (onboarding not finished), `limit_reached`, `ai_unavailable`.

**Scheduled workflows:**
- `daily-reminders`: daily 9:00 PKT, from the project Gmail, for Saved cards with `remind = true`, 3 days and
  1 day before the deadline. Logs `email_log`.
- `weekly-digest`: Mondays 8:00 PKT, one email per student with something to report. Logs `email_log` and
  `ai_runs`.

## For Mustafa (website)

- Matches page: read `my_ranked_matches` on load; "Refresh matches" calls `opportunity-matches`. If
  `more_on_paid_plan` is true, show "See all your matches on Pro". Show "Sample" when `is_sample` is true and
  "Not yet verified" when `verified` is false.
- Profile or settings: an **Email reminders** on/off switch that updates `profiles.email_reminders`.
- Pricing page: the new `opportunity-matches` row will show as "Opportunity matches" by default; add a
  label such as "Match refreshes" to `LABELS` in `Pricing.tsx` if you prefer.
