# Career Coach team pack: start here

Three briefs, one per person. Each person attaches their brief (plus their files) to their own Claude and
says **"Read the brief and let's start with Step 1."** Claude then walks them through it step by step.

## Who gets what

| Person | Brief | Also attach |
|---|---|---|
| Data and product lead | `brief_1_data_lead.md` | `01_supabase_onboarding.sql`, `02_core_tables.sql`, `03_opportunities_template.csv` |
| Website | `brief_2_website.md` | `website_onboarding_prompt.md` |
| n8n engine and AI | `brief_3_n8n_ai.md` | `n8n_linkedin_import_guide.md` |

All three briefs end with the same **Shared contracts** section: accounts, secrets, tables, feature
names and the exact website ⇄ n8n message format. That's what lets you build at the same time without
waiting on each other. Change it only when all three agree.

## Week 1 at a glance

| When | Data and product lead | Website | n8n and AI |
|---|---|---|---|
| Hour 1 | Steps 1–3: Supabase, vault, project Gmail, run both SQL files, put keys in the vault | Steps 1–2: Lovable and GitHub repo, landing page | Steps 1–3: n8n version, credentials, start Apify tests |
| Days 1–2 | Step 4 repo folders · Step 5 customer conversations | Steps 3–5: Supabase sign-in, `callWorkflow` helper, onboarding | Step 4 `cc-auth-and-limits` · Step 5 `linkedin-import` |
| Days 3–4 | Step 6 opportunity database · Step 7 M1 proposal | Steps 6–8: Vercel, dashboard, history, pricing | Step 6 `onboard-tracks` · Step 7 error handler |
| Day 5 | Step 8 stranger test with two accounts | Steps 9–10: break it on purpose, PAGES.md | Step 8 publish and export · Step 9 first test runs |
| End of week | **All three:** live demo of sign up → import → form → quiz → AI tracks (the M2 walking skeleton) | | |

Each person also talks to 2 students this week, using the data lead's interview guide.

## The handoffs (who waits for what)

| Waiting person | Needs | From | When |
|---|---|---|---|
| Website | Supabase URL and anon key (in the vault) | Data lead | Hour 1 |
| n8n | Supabase URL, anon key and service_role key (in the vault) | Data lead | Hour 1 |
| Data lead | GitHub repo link and collaborator invite | Website | Day 1 |
| Data lead (Supabase redirect URLs) and n8n (CORS) | The live site address | Website | Day 3 |
| Website | Webhooks live at `/webhook/linkedin-import` and `/webhook/onboard-tracks` | n8n | Days 2–4 (the site shows its error messages until then, which is fine) |

## Ten minutes a day

Post three lines in the group chat: **done**, **next**, **blocked by**. Fix blockers the same day.
Take turns demoing each week. In the final presentation each of you is asked two questions about a part
you didn't build.
