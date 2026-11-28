# n8n workflows

Exported n8n workflows go here: one JSON file per workflow, re-exported after every change.

| Workflow | Trigger | What it does | Tables it writes |
|---|---|---|---|
| `linkedin-import` | Webhook `POST /webhook/linkedin-import` | Checks login and limit, reads the public LinkedIn profile through Apify (`harvestapi~linkedin-profile-scraper`, no cookies), copies roles, dates, education, skills and languages exactly, lets the course model pick the city, university entry and degree name and write one-line role descriptions, and replies with `mapped` (form pre-fill) and `extra` (other CV sections) | `linkedin_imports` (attempt, `raw`, `mapped`), `ai_runs` (every run, USD 0.004 per Apify call) |

## `linkedin-import` reply

Success: `{"ok": true, "mapped": {...}, "extra": {...}}`.

`mapped` is exactly as in the Shared contracts. Notes on its values:
- `experience[].start` / `end` are written like `Aug 2025`. `end` is `"Present"` for a current role and `null` when LinkedIn gives no end date.
- `education[].start` / `end` use the same format.
- Anything the profile doesn't show is `null` or `[]`; nothing is guessed.

`extra` holds the other CV-useful sections, copied straight from the scraper by Set-node expressions (no AI). It has
no links or images and is **not saved** to Supabase yet. Every key is always present; a section the profile doesn't
show is `[]`, and a missing value inside an item is `null`. All values are strings.

| Key | Each item |
|---|---|
| `honours_awards` | `title`, `issuer`, `date` (e.g. `Jun 2026`), `description`, `associated_with` (school or employer name) |
| `courses` | `title`, `number` (course code, e.g. `FINN 372`), `associated_with` |
| `certifications` | `title`, `issuer`, `date` (e.g. `Sep 2023`) |
| `projects` | `title`, `start`, `end`, `description`, `associated_with` |
| `publications` | `title`, `publisher` (e.g. journal name), `date` (as LinkedIn writes it, e.g. `Sep 5, 2023`) |
| `volunteering` | `role`, `org`, `start`, `end`, `cause` (e.g. `Social Services`), `description` |

Volunteering roles also appear in `mapped.experience` (title, org, dates), as before; `extra.volunteering` adds the
cause and full description.

Example (shortened):

```json
"extra": {
  "honours_awards": [{"title": "Dean's Honour List", "issuer": null, "date": "Jun 2026", "description": "Placed on the Dean's Honour List ...", "associated_with": "Lahore University of Management Sciences"}],
  "courses": [{"title": "Business Communication", "number": "MGMT212", "associated_with": "Lahore University of Management Sciences"}],
  "certifications": [],
  "projects": [{"title": "Organizational Behavior Project: Leadership, Motivation, and Teams", "start": null, "end": null, "description": "Researched how ...", "associated_with": "Lahore University of Management Sciences"}],
  "publications": [],
  "volunteering": [{"role": "Project Head - Wajood e Zan", "org": "PakSarZameen", "start": "Sep 2021", "end": "Jul 2023", "cause": "Social Services", "description": "Led Wajood-e-Zan ..."}]
}
```
