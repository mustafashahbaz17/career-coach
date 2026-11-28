# Tests (A10 evidence)

`run_tests.py` signs in as the test student, sends each test case to the **live** n8n webhook and
writes the results to `tests/results/<workflow>_<date>_<time>.csv`.

## Before you run it

Set these in your terminal or in a gitignored `.env.local` at the repo root. Never commit them.

| Name | What it is | Where to get it |
|---|---|---|
| `TEST_EMAIL`, `TEST_PASSWORD` | The test student's login | Bitwarden |
| `VITE_SUPABASE_ANON_KEY` | The website's publishable key (same as in Vercel) | Bitwarden ("anon key") |
| `N8N_API_KEY` | Optional. Used to read the workflow's version | n8n → Settings → API |

## How to run

```powershell
py tests\run_tests.py onboard-tracks          # plan only: checks cases and limits, sends nothing
py tests\run_tests.py onboard-tracks --run    # asks you to type YES, then calls the live webhook
py tests\run_tests.py linkedin-import --run --only L1,L2
```

Options: `--only id1,id2` runs only some cases, and `--max N` runs the first N.

## What a run costs

- Each successful run counts toward the test account's monthly limit. Free allows 3 `onboard-tracks`
  and 3 `linkedin-import` runs. The runner stops when it gets `limit_reached`.
- Every `linkedin-import` case may call Apify (paid) as well as the model.
- **`onboard-tracks` deletes the test student's saved quiz answers before each case** and saves that
  case's answers instead, as the website does. Only use a dedicated test account.

## Case files (`tests/cases/`)

**`onboard_tracks.csv`**
- `kind`: `clear`, `mixed` or `error`.
- `answers_json`: the quiz answers, e.g. `{"q1":["a","d"],"q2":"b","q9":"text","q10":"text"}`. Use a list
  for multi-choice questions and a single key for single-choice ones. Keys are checked against the
  live quiz before anything is sent.
- `expected_track`: the track for a `clear` case.
- `expected_code`: for an error case, the code you expect, e.g. `bad_input`.
- **Pass rule:** a `clear` case passes if `expected_track` is in the top 3. A `mixed` case passes if
  there are 3 tracks and `needs_followup` is true. An error case passes if the reply has `expected_code`.

**`linkedin_import.csv`**
- Real profile links, used with the person's permission. A teammate fills in the expected university,
  degree, major, graduation year and number of experiences.
- **Pass rule:** every expected field you fill in must match (ignoring case and extra spaces). Blank
  fields aren't checked. `expected_code` works the same way, e.g. `profile_empty` or `bad_url`.

The rows starting with `EX` are examples. Replace them with the Content team's A10 set.

## Result columns

`id, workflow, input, expected, actual, pass, http_status, latency_ms, run_date, workflow_id,
workflow_version, workflow_updated_at, notes`. `workflow_version` is n8n's `versionId` for the
active workflow, so each result shows exactly which version it tested.

The access token, password and keys are never written to the CSV or shown on screen.
