-- =====================================================================
-- Career Coach: AI-ranked matches, deadline reminders and weekly digest
-- Run AFTER 01-06. Safe to re-run (nothing is dropped, no data deleted).
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
--
-- Used by three n8n workflows (Eliza):
--   opportunity-matches  (webhook)   -> matches_for_user(), opportunity_matches
--   daily-reminders      (schedule)  -> due_deadline_reminders(), email_log
--   weekly-digest        (schedule)  -> weekly_digest_recipients(), email_log
-- The three functions run with the service key only (n8n). Students never call them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Plan limits for the new AI feature (refreshes of the ranked list per month)
--    The website's pricing page reads this table, so the new row appears there.
-- ---------------------------------------------------------------------
insert into public.plan_limits (plan, feature, monthly_limit) values
  ('free','opportunity-matches',4), ('pro','opportunity-matches',20), ('premium','opportunity-matches',40)
on conflict (plan, feature) do update set monthly_limit = excluded.monthly_limit;

-- ---------------------------------------------------------------------
-- 2. Email switch on the profile (one switch for reminders and the digest).
--    Students can already update their own profile row, so the website can
--    show this as a toggle. Per-application reminders stay on applications.remind.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists email_reminders boolean not null default true;
grant update (email_reminders) on public.profiles to authenticated;   -- 01 only grants listed columns

-- ---------------------------------------------------------------------
-- 3. Eligible opportunities for ONE student (same rules as the my_matches view,
--    but for a given user id, so n8n can use it with the service key, including
--    in scheduled jobs where there is no student token).
--    Gender, nationality and age are used here for hard eligibility only and are
--    never returned, so they can't reach the AI.
-- ---------------------------------------------------------------------
create or replace function public.matches_for_user(p_user uuid)
returns table (
  id uuid, title text, organisation text, kind text, industry text, track_keys text[],
  city text, remote boolean, description text, apply_url text, deadline date,
  verified boolean, is_sample boolean, created_at timestamptz,
  track_overlap int, in_tracker boolean, reasons text[])
language sql stable security definer set search_path = public as $$
with me as (
  select p.*,
         case when p.cgpa is null then null else round(p.cgpa / p.cgpa_scale * 4.0, 2) end as cgpa_4,
         case when p.birth_year is null then null
              else extract(year from now() at time zone 'Asia/Karachi')::int - p.birth_year end as age
  from public.profiles p where p.id = p_user
),
my_tracks as (  -- latest AI tracks; falls back to the top 3 quiz scores
  select coalesce(
    (select array_agg(t->>'track_key') from (
        select ir.tracks from public.interest_results ir
        where ir.user_id = p_user order by ir.created_at desc limit 1) r,
        jsonb_array_elements(r.tracks) t),
    (select array_agg(q.track_key order by q.score desc) from (
        select s.track_key, s.score from public.quiz_track_scores s
        where s.user_id = p_user order by s.score desc limit 3) q),
    '{}'::text[]) as keys
)
select o.id, o.title, o.organisation, o.kind, o.industry, o.track_keys, o.city, o.remote,
       o.description, o.apply_url, o.deadline, o.verified, o.is_sample, o.created_at,
       cardinality(array(select unnest(o.track_keys) intersect select unnest(t.keys)))::int as track_overlap,
       exists (select 1 from public.applications a where a.user_id = p_user and a.opportunity_id = o.id) as in_tracker,
       array_remove(array[
         case when cardinality(array(select unnest(o.track_keys) intersect select unnest(t.keys))) > 0
              then 'Fits your tracks: ' || array_to_string(array(select unnest(o.track_keys) intersect select unnest(t.keys)), ', ') end,
         case when o.min_cgpa is not null then 'CGPA ' || me.cgpa_4 || ' meets the ' || o.min_cgpa || ' minimum (4.0 scale)' end,
         case when cardinality(o.degrees) > 0 then 'Your degree (' || me.degree || ') is accepted' end,
         case when cardinality(o.grad_years) > 0 then 'Open to ' || me.grad_year || ' graduates' end,
         case when o.age_max is not null then 'Within the age limit of ' || o.age_max end,
         case when o.deadline is not null then 'Deadline ' || to_char(o.deadline, 'DD Mon YYYY') end
       ], null) as reasons
from public.opportunities o
cross join me
cross join my_tracks t
where (o.deadline is null or o.deadline >= (now() at time zone 'Asia/Karachi')::date)
  and (o.min_cgpa is null or (me.cgpa_4 is not null and me.cgpa_4 >= o.min_cgpa))
  and (cardinality(o.degrees) = 0 or me.degree = any(o.degrees))
  and (cardinality(o.grad_years) = 0 or me.grad_year = any(o.grad_years))
  and (o.age_max is null or me.age is null or me.age <= o.age_max)
  and (o.gender_rule = 'any'
       or (o.gender_rule = 'female_only' and me.gender = 'female')
       or (o.gender_rule = 'male_only' and me.gender = 'male'))
  and (o.nationality_rule is null
       or (o.nationality_rule = 'pakistani_only' and (me.nationality is null or me.nationality ilike 'pakistan%')))
order by track_overlap desc, o.verified desc, o.deadline nulls last, o.created_at desc;
$$;

revoke all on function public.matches_for_user(uuid) from public, anon, authenticated;
grant execute on function public.matches_for_user(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 4. AI-ranked matches: the latest ranked list per student.
--    n8n deletes a student's old rows and inserts the new list on each refresh,
--    so the page can show the last result without spending another AI run.
-- ---------------------------------------------------------------------
create table if not exists public.opportunity_matches (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  opportunity_id       uuid not null references public.opportunities(id) on delete cascade,
  rank                 int  not null check (rank >= 1),
  fit_score            int  not null check (fit_score between 0 and 100),
  why_you_qualify      text not null,          -- AI, 1-2 sentences, specific to the student
  what_you_are_missing text,                   -- AI, one concrete gap to close (null = nothing obvious)
  rule_reasons         text[] not null default '{}',  -- the rule-based reasons from matches_for_user
  model                text,
  created_at           timestamptz not null default now(),
  unique (user_id, opportunity_id)
);
create index if not exists opportunity_matches_user on public.opportunity_matches (user_id, rank);

alter table public.opportunity_matches enable row level security;
drop policy if exists "opportunity_matches: read own" on public.opportunity_matches;
create policy "opportunity_matches: read own" on public.opportunity_matches
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.opportunity_matches from authenticated, anon;

-- n8n saves a new ranked list in one step: old rows out, new rows in, all or nothing.
-- p_matches: [{opportunity_id, rank, fit_score, why_you_qualify, what_you_are_missing, rule_reasons}]
create or replace function public.save_opportunity_matches(p_user uuid, p_model text, p_matches jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if p_user is null or jsonb_typeof(p_matches) <> 'array' then
    raise exception 'bad_input';
  end if;
  delete from public.opportunity_matches where user_id = p_user;
  insert into public.opportunity_matches (
    user_id, opportunity_id, rank, fit_score, why_you_qualify, what_you_are_missing, rule_reasons, model)
  select p_user, (m->>'opportunity_id')::uuid, (m->>'rank')::int,
         least(100, greatest(0, round((m->>'fit_score')::numeric)))::int,
         left(trim(m->>'why_you_qualify'), 600),
         nullif(left(trim(coalesce(m->>'what_you_are_missing', '')), 600), ''),
         coalesce(array(select jsonb_array_elements_text(m->'rule_reasons')), '{}'),
         p_model
  from jsonb_array_elements(p_matches) m;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

revoke all on function public.save_opportunity_matches(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_opportunity_matches(uuid, text, jsonb) to service_role;

-- What the matches page reads on load: my last ranked list, still-open opportunities only.
create or replace view public.my_ranked_matches with (security_invoker = true) as
select m.rank, m.fit_score, m.why_you_qualify, m.what_you_are_missing, m.rule_reasons,
       m.created_at as ranked_at,
       o.id as opportunity_id, o.title, o.organisation, o.kind, o.industry, o.city, o.remote,
       o.description, o.apply_url, o.deadline, o.verified, o.is_sample
from public.opportunity_matches m
join public.opportunities o on o.id = m.opportunity_id
where m.user_id = auth.uid()
  and (o.deadline is null or o.deadline >= (now() at time zone 'Asia/Karachi')::date)
order by m.rank;

-- ---------------------------------------------------------------------
-- 5. Email log: one row per email sent (or failed), so nothing is sent twice
--    even if a schedule runs twice. Admins can read it for the admin page.
-- ---------------------------------------------------------------------
create table if not exists public.email_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  application_id  uuid references public.applications(id) on delete cascade,
  kind            text not null check (kind in ('deadline_3d','deadline_1d','weekly_digest')),
  sent_on         date not null default (now() at time zone 'Asia/Karachi')::date,
  status          text not null default 'sent' check (status in ('sent','failed')),
  error_message   text,
  created_at      timestamptz not null default now()
);
create unique index if not exists email_log_reminder_once
  on public.email_log (application_id, kind) where status = 'sent' and application_id is not null;
create unique index if not exists email_log_digest_once
  on public.email_log (user_id, sent_on) where status = 'sent' and kind = 'weekly_digest';
create index if not exists email_log_recent on public.email_log (created_at desc);

alter table public.email_log enable row level security;
drop policy if exists "email_log: read own or admin" on public.email_log;
create policy "email_log: read own or admin" on public.email_log
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
revoke insert, update, delete on public.email_log from authenticated, anon;

-- ---------------------------------------------------------------------
-- 6. Deadline reminders due today: tracker cards still "saved", reminders on,
--    deadline in exactly 3 days or 1 day (Pakistan time), not already sent.
-- ---------------------------------------------------------------------
create or replace function public.due_deadline_reminders(
  p_today date default (now() at time zone 'Asia/Karachi')::date)
returns table (
  user_id uuid, email text, first_name text, application_id uuid, title text,
  organisation text, apply_url text, deadline date, days_left int, kind text)
language sql stable security definer set search_path = public as $$
select a.user_id, p.email,
       coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), 'there') as first_name,
       a.id, a.title, a.organisation, a.apply_url, a.deadline,
       (a.deadline - p_today)::int as days_left,
       case when a.deadline - p_today = 3 then 'deadline_3d' else 'deadline_1d' end as kind
from public.applications a
join public.profiles p on p.id = a.user_id
where a.remind
  and a.status = 'saved'
  and a.deadline in (p_today + 1, p_today + 3)
  and p.email is not null and p.email like '%@%'
  and p.email_reminders
  and not exists (
    select 1 from public.email_log l
    where l.application_id = a.id and l.status = 'sent'
      and l.kind = case when a.deadline - p_today = 3 then 'deadline_3d' else 'deadline_1d' end)
order by a.deadline, p.email;
$$;

revoke all on function public.due_deadline_reminders(date) from public, anon, authenticated;
grant execute on function public.due_deadline_reminders(date) to service_role;

-- ---------------------------------------------------------------------
-- 7. Weekly digest: one row per student with something worth sending
--    (a deadline in the next 7 days, or a new eligible opportunity added in
--    the last 7 days that isn't already in their tracker). Skips students
--    who already got a digest in the last 5 days.
-- ---------------------------------------------------------------------
create or replace function public.weekly_digest_recipients(
  p_today date default (now() at time zone 'Asia/Karachi')::date)
returns table (
  user_id uuid, email text, first_name text, track_names text[],
  deadlines jsonb, new_matches jsonb, tracker_counts jsonb)
language sql stable security definer set search_path = public as $$
select x.id, x.email, x.first_name, x.track_names, x.deadlines, x.new_matches, x.tracker_counts
from (
  select p.id, p.email,
         coalesce(nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''), 'there') as first_name,
         coalesce((
           select array_agg(ct.name order by ord)
           from (select ir.tracks from public.interest_results ir
                 where ir.user_id = p.id order by ir.created_at desc limit 1) r,
                jsonb_array_elements(r.tracks) with ordinality as t(val, ord)
           join public.career_tracks ct on ct.key = t.val->>'track_key'), '{}') as track_names,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'title', a.title, 'organisation', a.organisation, 'deadline', a.deadline,
                    'status', a.status, 'apply_url', a.apply_url) order by a.deadline)
           from public.applications a
           where a.user_id = p.id and a.status in ('saved','applied','interview')
             and a.deadline between p_today and p_today + 6), '[]'::jsonb) as deadlines,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'title', m.title, 'organisation', m.organisation, 'deadline', m.deadline,
                    'apply_url', m.apply_url, 'is_sample', m.is_sample))
           from (select * from public.matches_for_user(p.id) mm
                 where mm.created_at >= p_today - 7 and not mm.in_tracker
                 order by mm.track_overlap desc, mm.deadline nulls last
                 limit 3) m), '[]'::jsonb) as new_matches,
         (select jsonb_build_object(
                   'saved',     count(*) filter (where a.status = 'saved'),
                   'applied',   count(*) filter (where a.status = 'applied'),
                   'interview', count(*) filter (where a.status = 'interview'),
                   'offer',     count(*) filter (where a.status = 'offer'))
          from public.applications a where a.user_id = p.id) as tracker_counts
  from public.profiles p
  where p.email is not null and p.email like '%@%'
    and p.email_reminders
    and not exists (
      select 1 from public.email_log l
      where l.user_id = p.id and l.kind = 'weekly_digest' and l.status = 'sent'
        and l.sent_on > p_today - 5)
) x
where jsonb_array_length(x.deadlines) > 0 or jsonb_array_length(x.new_matches) > 0
order by x.email;
$$;

revoke all on function public.weekly_digest_recipients(date) from public, anon, authenticated;
grant execute on function public.weekly_digest_recipients(date) to service_role;
