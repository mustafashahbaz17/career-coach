# n8n workflows

Live on the course n8n (https://n8n.devplusops.com). After every change, re-export (⋯ → Download) and replace the file here.

| Workflow | Trigger | What it does | Tables it writes |
|---|---|---|---|
| `cc-auth-and-limits` | Called by other workflows | Checks the student's login token with Supabase, then their plan's monthly limit for the feature. Returns `ok` with user, plan, used and limit, or `not_signed_in` / `limit_reached`. | None (reads `profiles`, `plan_limits`, `monthly_usage`) |
| `onboard-tracks` | Webhook `POST /webhook/onboard-tracks` | Reads the saved profile (six allowed fields only) and quiz, asks the course model for 3 career tracks with reasons (one retry if the answer is invalid), then saves and returns them. | `interest_results`, `ai_runs` |
| `linkedin-import` | Webhook `POST /webhook/linkedin-import` | **Temporary (week 1):** checks login, limit and link, then replies `import_failed` so the website falls back to the form. Step 5 adds the Apify import. | `ai_runs` (only when a limit blocks a run) |

`cc-test-bench` is a private test harness and is deliberately not in the repo, because it holds a test account's password.
