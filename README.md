# Career Coach

A recruitment-season co-pilot for university students in Pakistan. Gen AI course final project.

- **Website:** React + TypeScript (Vite), hosted on Vercel. Written by an AI coding tool (Claude); no code written by hand.
- **Sign-in and database:** Supabase.
- **AI work:** the course n8n, called through webhooks.

## Folders

```
/            website code
/supabase    SQL files, numbered (data lead)
/n8n         exported workflow JSON (n8n owner)
/docs        briefs, PAGES.md, proposal, test sets, report drafts
```

See `docs/PAGES.md` for what every page does.

## Environment variables (set in Vercel, never committed)

| Name | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_N8N_BASE_URL` | `https://n8n.devplusops.com/webhook` |
