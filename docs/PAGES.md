# PAGES.md — what every page does

One short entry per page: what it does, which tables it reads and writes, and which n8n webhooks it calls.
Updated whenever a page changes. Read this before the presentation — you'll be asked about pages you didn't build.

## How the website is put together (plain words)

- **React + TypeScript app, built with Vite.** Each page is one file in `src/pages/`. Shared pieces (top bar, logo, icons) are in `src/components/`.
- **`src/App.tsx`** is the list of pages: it says which page shows for which web address (e.g. `/pricing` → the Pricing page).
- **`src/main.tsx`** starts the app and loads the styles.
- **`src/styles/design.css`** is the design system copied exactly from our HTML design file (colours, fonts, buttons, cards). `src/styles/extra.css` holds a few additions.
- **`vercel.json`** tells Vercel to send every address to the app, so refreshing on `/pricing` doesn't show a 404.
- **Secrets:** the website only ever uses the Supabase URL, the anon key and the n8n base URL, set as environment variables in Vercel. No other keys are in this code.

## Public pages (no sign-in needed)

### `/` — Landing page (`src/pages/Landing.tsx`)
Tells a stranger who Career Coach is for, what it does and what it costs. Sections: hero with a **Sample**-labelled tracker preview, who it's for, how it works in 4 steps, three honesty promises, plans summary (Free PKR 0, Pro PKR 499 est., Premium PKR 999 est.), and an FAQ.
- **Reads:** nothing. **Writes:** nothing. **Webhooks:** none.
- No testimonials, user counts or partner logos (course rule).

### `/pricing`, `/signup`, `/signin`, `/privacy` — Placeholders (`src/pages/Placeholder.tsx`)
Simple "coming soon" pages so no link is broken. Replaced in later steps (sign-in/sign-up in Step 4, pricing in Step 8).
- **Reads / writes / webhooks:** none.

### Any other address — "Page not found"
Uses the same placeholder page.

## Shared frame

### Top bar and footer (`src/components/PublicLayout.tsx`)
Wraps every public page. Desktop: logo, Pricing, Sign in, Get started free. Phone: Pricing is hidden in the bar (it's in the footer and the "See plans" button) and the button reads "Start free", so the bar fits on one line.
