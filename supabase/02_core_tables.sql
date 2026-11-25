-- =====================================================================
-- Career Coach: core tables (admin, AI run log, plan limits, usage, opportunities)
-- Run AFTER 01_supabase_onboarding.sql.
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ADMIN: a helper the policies use, and admin can read every profile
--    Make yourself admin once (Table Editor -> profiles -> is_admin = true,
--    or: update public.profiles set is_admin = true where email = 'you@example.com';)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles: admin reads all" on public.profiles;
create policy "profiles: admin reads all" on public.profiles
  for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. AI RUNS: one row for EVERY workflow run that calls a model or paid API,
--    successful or not. Written only by n8n (service key).
--    Feeds: limits (A7), admin page (A8), failure log (A9), usage charts (B9), costs (A11).
-- ---------------------------------------------------------------------
create table if not exists public.ai_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,   -- null for scheduled jobs
  workflow       text not null,          -- must match a feature name in plan_limits, e.g. 'linkedin-import'
  model          text,                   -- e.g. the course model name, or 'apify'
  input_tokens   int,
  output_tokens  int,
  cost_usd       numeric(10,6),
  cost_pkr       numeric(10,2),
  latency_ms     int,
  status         text not null check (status in ('success','failed','refused','limit_reached')),
  error_code     text,                   -- same codes the website shows, e.g. 'ai_unavailable'
  error_message  text,
  created_at     timestamptz not null default now()
);
create index if not exists ai_runs_user_month on public.ai_runs (user_id, workflow, created_at);

alter table public.ai_runs enable row level security;
drop policy if exists "ai_runs: read own or admin" on public.ai_runs;
create policy "ai_runs: read own or admin" on public.ai_runs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- No insert/update policy for students: only n8n writes here.

-- ---------------------------------------------------------------------
-- 3. PLAN LIMITS: runs per calendar month (Pakistan time), per plan, per feature
--    0 = not included in that plan. Edit numbers here, never in the website.
-- ---------------------------------------------------------------------
create table if not exists public.plan_limits (
  plan           text not null check (plan in ('free','pro','premium')),
  feature        text not null,
  monthly_limit  int  not null check (monthly_limit >= 0),
  primary key (plan, feature)
);
alter table public.plan_limits enable row level security;
drop policy if exists "plan_limits: read all" on public.plan_limits;
create policy "plan_limits: read all" on public.plan_limits for select to authenticated using (true);

insert into public.plan_limits (plan, feature, monthly_limit) values
  ('free','linkedin-import',3),   ('pro','linkedin-import',5),   ('premium','linkedin-import',5),
  ('free','onboard-tracks',3),    ('pro','onboard-tracks',5),    ('premium','onboard-tracks',5),
  ('free','cv-review',2),         ('pro','cv-review',15),        ('premium','cv-review',40),
  ('free','coach-message',10),    ('pro','coach-message',100),   ('premium','coach-message',300),
  ('free','interview-session',0), ('pro','interview-session',0), ('premium','interview-session',30),
  ('free','negotiation-draft',0), ('pro','negotiation-draft',0), ('premium','negotiation-draft',20),
  ('free','vent-message',600),    ('pro','vent-message',600),    ('premium','vent-message',600)
on conflict (plan, feature) do update set monthly_limit = excluded.monthly_limit;

-- This month's successful runs per user and feature (Pakistan calendar month)
create or replace view public.monthly_usage with (security_invoker = true) as
select user_id,
       workflow  as feature,
       count(*)  as runs
from public.ai_runs
where status = 'success'
  and created_at >= (date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi')
group by user_id, workflow;

-- ---------------------------------------------------------------------
-- 4. OPPORTUNITIES: the curated list the matching uses. Import from the CSV
--    template with Table Editor -> opportunities -> Insert -> Import data from CSV.
-- ---------------------------------------------------------------------
create table if not exists public.opportunities (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  organisation      text not null,
  kind              text not null check (kind in ('internship','management_trainee','graduate_job','scholarship','fellowship','competition','other')),
  industry          text,
  track_keys        text[] not null default '{}',   -- keys from career_tracks, e.g. {marketing,operations}
  city              text,
  remote            boolean not null default false,
  description       text,
  apply_url         text not null,
  deadline          date,
  min_cgpa          numeric(3,2),
  degrees           text[] not null default '{}',   -- empty = any degree
  grad_years        int[]  not null default '{}',   -- empty = any year
  age_max           int,
  nationality_rule  text,                           -- e.g. 'pakistani_only'; null = no rule
  gender_rule       text not null default 'any' check (gender_rule in ('any','female_only','male_only')),
  source_url        text,                           -- where you checked the details
  verified          boolean not null default false, -- true only after a person checked the source
  last_checked      date,
  is_sample         boolean not null default false, -- true = shown with a "Sample" label
  created_at        timestamptz not null default now()
);
create index if not exists opportunities_deadline on public.opportunities (deadline);

alter table public.opportunities enable row level security;
drop policy if exists "opportunities: read open" on public.opportunities;
create policy "opportunities: read open" on public.opportunities
  for select to authenticated using (deadline is null or deadline >= current_date);
