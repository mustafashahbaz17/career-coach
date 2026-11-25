-- =====================================================================
-- Career Coach: opportunity scout (finds openings automatically, a person approves)
-- Run AFTER 01_supabase_onboarding.sql and 02_core_tables.sql.
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to re-run.
--
-- How it works:
--   1. opportunity_sources: the careers pages / feeds the scout reads (data lead edits).
--   2. n8n (feature 'opportunity-scout', on a schedule) reads each source, the AI pulls
--      out openings, n8n checks the AI's quote really is on the page, then calls
--      scout_add_candidate() for each one. Duplicates are skipped automatically.
--   3. An admin reviews opportunity_candidates on the admin page and calls
--      approve_opportunity_candidate() or reject_opportunity_candidate().
--      Approving copies the row into opportunities with verified = true.
--   Nothing the AI finds is shown to students until a person approves it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SOURCES: where the scout looks
-- ---------------------------------------------------------------------
create table if not exists public.opportunity_sources (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,                       -- e.g. 'SBP careers'
  url                 text not null unique check (url like 'https://%'),
  kind                text not null default 'careers_page'
                      check (kind in ('careers_page','rss','job_board','other')),
  default_track_keys  text[] not null default '{}',        -- hint for the AI, e.g. {finance}
  active              boolean not null default true,
  last_scouted_at     timestamptz,                         -- set by n8n
  last_status         text check (last_status in ('ok','nothing_new','failed')),  -- set by n8n
  last_error          text,                                -- set by n8n when failed
  notes               text,
  created_at          timestamptz not null default now()
);

alter table public.opportunity_sources enable row level security;
drop policy if exists "sources: admin all" on public.opportunity_sources;
create policy "sources: admin all" on public.opportunity_sources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- Students see nothing here. n8n uses the service key.

-- ---------------------------------------------------------------------
-- 2. CANDIDATES: what the scout found, waiting for a person
--    Same fields as opportunities, plus where it came from and the review.
-- ---------------------------------------------------------------------
create table if not exists public.opportunity_candidates (
  id                uuid primary key default gen_random_uuid(),
  source_id         uuid references public.opportunity_sources(id) on delete set null,
  title             text not null,
  organisation      text not null,
  kind              text not null check (kind in ('internship','management_trainee','graduate_job','scholarship','fellowship','competition','other')),
  industry          text,
  track_keys        text[] not null default '{}',
  city              text,
  remote            boolean not null default false,
  description       text,
  apply_url         text not null check (apply_url like 'https://%'),
  deadline          date,
  min_cgpa          numeric(3,2),
  degrees           text[] not null default '{}',
  grad_years        int[]  not null default '{}',
  age_max           int,
  nationality_rule  text,
  gender_rule       text not null default 'any' check (gender_rule in ('any','female_only','male_only')),
  source_url        text not null check (source_url like 'https://%'),
  evidence          text not null,          -- exact words from the page showing it is open (checked by n8n)
  ai_confidence     numeric(3,2) check (ai_confidence between 0 and 1),
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  review_note       text,
  reviewed_by       uuid references auth.users(id) on delete set null,
  reviewed_at       timestamptz,
  opportunity_id    uuid references public.opportunities(id) on delete set null,
  ai_run_id         uuid references public.ai_runs(id) on delete set null,
  found_at          timestamptz not null default now()
);

-- One candidate per organisation + title + deadline, so re-scouting the same page adds nothing.
create unique index if not exists opportunity_candidates_dedupe
  on public.opportunity_candidates (lower(organisation), lower(title), deadline) nulls not distinct;
create index if not exists opportunity_candidates_status on public.opportunity_candidates (status, deadline);

alter table public.opportunity_candidates enable row level security;
drop policy if exists "candidates: admin reads" on public.opportunity_candidates;
create policy "candidates: admin reads" on public.opportunity_candidates
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: n8n adds rows through scout_add_candidate(),
-- admins change them only through approve/reject below.

-- Pending items still worth reviewing (deadline not passed), soonest first.
create or replace view public.opportunity_candidates_pending with (security_invoker = true) as
select c.*, s.name as source_name
from public.opportunity_candidates c
left join public.opportunity_sources s on s.id = c.source_id
where c.status = 'pending'
  and (c.deadline is null or c.deadline >= current_date)
order by c.deadline nulls last, c.found_at;

-- ---------------------------------------------------------------------
-- 3. n8n ADDS A CANDIDATE (service key only)
--    Returns 'added', 'duplicate' (already a candidate or already in opportunities),
--    or 'expired' (deadline already passed). Bad input raises an error.
-- ---------------------------------------------------------------------
create or replace function public.scout_add_candidate(p jsonb)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_deadline date := nullif(p->>'deadline','')::date;
  v_org      text := trim(p->>'organisation');
  v_title    text := trim(p->>'title');
begin
  if v_deadline is not null and v_deadline < (now() at time zone 'Asia/Karachi')::date then
    return 'expired';
  end if;

  if exists (select 1 from public.opportunities o
             where lower(o.organisation) = lower(v_org) and lower(o.title) = lower(v_title)
               and o.deadline is not distinct from v_deadline) then
    return 'duplicate';
  end if;

  insert into public.opportunity_candidates (
    source_id, title, organisation, kind, industry, track_keys, city, remote, description,
    apply_url, deadline, min_cgpa, degrees, grad_years, age_max, nationality_rule, gender_rule,
    source_url, evidence, ai_confidence, ai_run_id)
  values (
    nullif(p->>'source_id','')::uuid, v_title, v_org, p->>'kind', p->>'industry',
    coalesce(array(select jsonb_array_elements_text(p->'track_keys')), '{}'),
    p->>'city', coalesce((p->>'remote')::boolean, false), p->>'description',
    p->>'apply_url', v_deadline, nullif(p->>'min_cgpa','')::numeric,
    coalesce(array(select jsonb_array_elements_text(p->'degrees')), '{}'),
    coalesce(array(select jsonb_array_elements_text(p->'grad_years'))::int[], '{}'),
    nullif(p->>'age_max','')::int, nullif(p->>'nationality_rule',''),
    coalesce(nullif(p->>'gender_rule',''), 'any'),
    p->>'source_url', p->>'evidence', nullif(p->>'ai_confidence','')::numeric,
    nullif(p->>'ai_run_id','')::uuid)
  on conflict do nothing;

  if found then return 'added'; else return 'duplicate'; end if;
end; $$;

revoke all on function public.scout_add_candidate(jsonb) from public, anon, authenticated;
grant execute on function public.scout_add_candidate(jsonb) to service_role;

-- ---------------------------------------------------------------------
-- 4. ADMIN APPROVES OR REJECTS (website admin page: supabase.rpc(...))
--    p_checked must be true: the admin confirms they opened source_url and the
--    deadline is right. That is what makes verified = true honest.
-- ---------------------------------------------------------------------
create or replace function public.approve_opportunity_candidate(
  p_id uuid, p_checked boolean, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  c public.opportunity_candidates;
  v_opp uuid;
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_checked is not true then raise exception 'not_checked'; end if;

  select * into c from public.opportunity_candidates where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if c.status <> 'pending' then raise exception 'not_pending'; end if;
  if c.deadline is not null and c.deadline < (now() at time zone 'Asia/Karachi')::date then
    raise exception 'deadline_passed';
  end if;

  insert into public.opportunities (
    title, organisation, kind, industry, track_keys, city, remote, description, apply_url,
    deadline, min_cgpa, degrees, grad_years, age_max, nationality_rule, gender_rule,
    source_url, verified, last_checked, is_sample)
  values (
    c.title, c.organisation, c.kind, c.industry, c.track_keys, c.city, c.remote, c.description,
    c.apply_url, c.deadline, c.min_cgpa, c.degrees, c.grad_years, c.age_max, c.nationality_rule,
    c.gender_rule, c.source_url, true, (now() at time zone 'Asia/Karachi')::date, false)
  returning id into v_opp;

  update public.opportunity_candidates
     set status = 'approved', opportunity_id = v_opp, reviewed_by = auth.uid(),
         reviewed_at = now(), review_note = p_note
   where id = p_id;
  return v_opp;
end; $$;

create or replace function public.reject_opportunity_candidate(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.opportunity_candidates
     set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), review_note = p_reason
   where id = p_id and status = 'pending';
  if not found then raise exception 'not_pending'; end if;
end; $$;

revoke all on function public.approve_opportunity_candidate(uuid, boolean, text) from public, anon;
revoke all on function public.reject_opportunity_candidate(uuid, text) from public, anon;
grant execute on function public.approve_opportunity_candidate(uuid, boolean, text) to authenticated;
grant execute on function public.reject_opportunity_candidate(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. ADMINS CAN ALSO SEE AND FIX opportunities DIRECTLY
--    (students still only see open ones, via the 02 policy)
-- ---------------------------------------------------------------------
drop policy if exists "opportunities: admin all" on public.opportunities;
create policy "opportunities: admin all" on public.opportunities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
