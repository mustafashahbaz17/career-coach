-- =====================================================================
-- Career Coach: core features (tracker, CVs + AI suggestions, interview
-- simulator, vent space, matches)
-- Run AFTER 01, 02 and 03.
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to re-run.
--
-- Who writes what (same pattern as 01/02):
--   Website (student's own session) : applications, cv_versions, accepting or
--                                     rejecting cv_suggestions, deleting own vent messages
--   n8n (service key)               : cv_suggestions, interview_sessions/answers,
--                                     vent_messages, plus ai_runs for every AI call
--   Nobody                          : matches (a view, computed from profile + opportunities)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TRACKER: every application on one board (no AI)
-- ---------------------------------------------------------------------
create table if not exists public.applications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  opportunity_id  uuid references public.opportunities(id) on delete set null,  -- null = student added it by hand
  title           text not null,
  organisation    text not null,
  apply_url       text,
  deadline        date,
  status          text not null default 'saved'
                  check (status in ('saved','applied','interview','offer','rejected','withdrawn')),
  applied_on      date,
  notes           text,
  remind          boolean not null default true,       -- deadline reminders on/off
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists applications_user on public.applications (user_id, status, deadline);
-- One card per opportunity per student
create unique index if not exists applications_user_opportunity
  on public.applications (user_id, opportunity_id) where opportunity_id is not null;

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

alter table public.applications enable row level security;
drop policy if exists "applications: own all" on public.applications;
create policy "applications: own all" on public.applications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Free plan = up to 10 applications: enforced in the website (count before insert).

-- ---------------------------------------------------------------------
-- 2. CVs: the student's CV text, one row per version
--    (paste the text, or n8n fills content_text from an uploaded PDF)
-- ---------------------------------------------------------------------
create table if not exists public.cv_versions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label           text not null default 'My CV',        -- e.g. 'Base CV', 'Unilever UFLP version'
  content_text    text not null check (length(content_text) between 50 and 30000),
  application_id  uuid references public.applications(id) on delete set null,  -- set when tailored for one application
  parent_id       uuid references public.cv_versions(id) on delete set null,   -- the version it was tailored from
  created_at      timestamptz not null default now()
);
create index if not exists cv_versions_user on public.cv_versions (user_id, created_at desc);

alter table public.cv_versions enable row level security;
drop policy if exists "cv_versions: own all" on public.cv_versions;
create policy "cv_versions: own all" on public.cv_versions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. CV SUGGESTIONS: AI drafts the student approves bullet by bullet
--    Written by n8n (feature 'cv-review'). The student may only change
--    status and final_text on their own rows.
-- ---------------------------------------------------------------------
create table if not exists public.cv_suggestions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  cv_version_id   uuid not null references public.cv_versions(id) on delete cascade,
  application_id  uuid references public.applications(id) on delete set null,
  position        int  not null default 0,               -- display order
  original_text   text,                                  -- null = suggests adding a new bullet
  suggested_text  text not null,
  reason          text not null,                         -- why, in one line, tied to the role
  status          text not null default 'pending'
                  check (status in ('pending','accepted','rejected','edited')),
  final_text      text,                                  -- what the student kept (edited text or suggested_text)
  ai_run_id       uuid references public.ai_runs(id) on delete set null,
  created_at      timestamptz not null default now(),
  decided_at      timestamptz
);
create index if not exists cv_suggestions_cv on public.cv_suggestions (cv_version_id, position);

alter table public.cv_suggestions enable row level security;
drop policy if exists "cv_suggestions: read own" on public.cv_suggestions;
create policy "cv_suggestions: read own" on public.cv_suggestions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "cv_suggestions: decide own" on public.cv_suggestions;
create policy "cv_suggestions: decide own" on public.cv_suggestions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, update, delete on public.cv_suggestions from authenticated, anon;
grant update (status, final_text, decided_at) on public.cv_suggestions to authenticated;

-- ---------------------------------------------------------------------
-- 4. INTERVIEW SIMULATOR (Premium): sessions and answers
--    Written by n8n (feature 'interview-session'); the student reads own.
--    Question bank and rubric come from the content teammate.
-- ---------------------------------------------------------------------
create table if not exists public.interview_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  application_id  uuid references public.applications(id) on delete set null,
  track_key       text references public.career_tracks(key),
  role_title      text,                                  -- e.g. 'Marketing MT at Unilever'
  status          text not null default 'in_progress'
                  check (status in ('in_progress','completed','abandoned')),
  question_count  int  not null default 5 check (question_count between 1 and 15),
  seconds_per_answer int not null default 120 check (seconds_per_answer between 30 and 600),
  overall_score   numeric(4,1) check (overall_score between 0 and 10),
  summary         jsonb,                                 -- {strengths:[], improve:[], next_steps:[]}
  started_at      timestamptz not null default now(),
  completed_at    timestamptz
);
create index if not exists interview_sessions_user on public.interview_sessions (user_id, started_at desc);

create table if not exists public.interview_answers (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.interview_sessions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  question_index  int  not null,
  question        text not null,
  answer_text     text,                                  -- null = ran out of time / skipped
  seconds_taken   int,
  score           numeric(4,1) check (score between 0 and 10),
  feedback        text,
  rubric_scores   jsonb,                                 -- e.g. {"structure":4,"evidence":3,"relevance":5}
  created_at      timestamptz not null default now(),
  unique (session_id, question_index)
);

alter table public.interview_sessions enable row level security;
alter table public.interview_answers  enable row level security;
drop policy if exists "interview_sessions: read own" on public.interview_sessions;
create policy "interview_sessions: read own" on public.interview_sessions
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "interview_answers: read own" on public.interview_answers;
create policy "interview_answers: read own" on public.interview_answers
  for select to authenticated using (user_id = auth.uid());
-- No student write policies: n8n writes both tables.

-- ---------------------------------------------------------------------
-- 5. VENT SPACE: the chat history (every plan)
--    n8n writes both sides after the safety check; the student can read and
--    delete their own messages.
-- ---------------------------------------------------------------------
create table if not exists public.vent_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null check (length(content) <= 4000),
  safety_label    text check (safety_label in ('ok','distress','crisis')),  -- set on user messages by the classifier
  showed_helplines boolean not null default false,
  ai_run_id       uuid references public.ai_runs(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists vent_messages_user on public.vent_messages (user_id, created_at);

alter table public.vent_messages enable row level security;
drop policy if exists "vent_messages: read own" on public.vent_messages;
create policy "vent_messages: read own" on public.vent_messages
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "vent_messages: delete own" on public.vent_messages;
create policy "vent_messages: delete own" on public.vent_messages
  for delete to authenticated using (user_id = auth.uid());
-- Admins can see counts of crisis labels for safety review, not message text:
create or replace view public.vent_safety_daily with (security_invoker = false) as
select date_trunc('day', created_at)::date as day, safety_label, count(*) as messages
from public.vent_messages where role = 'user' and public.is_admin()
group by 1, 2;
revoke all on public.vent_safety_daily from anon;

-- ---------------------------------------------------------------------
-- 6. MATCHES: opportunities the signed-in student is eligible for, ranked
--    No AI. Hard rules first (deadline, CGPA, degree, grad year, age,
--    gender rule, nationality rule), then ranked by overlap with the
--    student's career tracks. 'reasons' says why they qualify.
--    Free plan shows the top 5 (website); Pro/Premium show all.
-- ---------------------------------------------------------------------
create or replace view public.my_matches with (security_invoker = true) as
with me as (
  select p.*,
         case when p.cgpa is null then null else round(p.cgpa / p.cgpa_scale * 4.0, 2) end as cgpa_4,
         case when p.birth_year is null then null
              else extract(year from now() at time zone 'Asia/Karachi')::int - p.birth_year end as age
  from public.profiles p where p.id = auth.uid()
),
my_tracks as (  -- from the latest AI result; falls back to quiz scores if none yet
  select coalesce(
    (select array_agg(t->>'track_key') from (
        select ir.tracks from public.interest_results ir
        where ir.user_id = auth.uid() order by ir.created_at desc limit 1) r,
        jsonb_array_elements(r.tracks) t),
    (select array_agg(track_key order by score desc) from (
        select track_key, score from public.quiz_track_scores
        where user_id = auth.uid() order by score desc limit 3) q),
    '{}'::text[]) as keys
)
select o.id, o.title, o.organisation, o.kind, o.industry, o.track_keys, o.city, o.remote,
       o.description, o.apply_url, o.deadline, o.verified, o.is_sample,
       cardinality(array(select unnest(o.track_keys) intersect select unnest(t.keys))) as track_overlap,
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
order by track_overlap desc, o.verified desc, o.deadline nulls last;
-- Notes: a student who hasn't given CGPA is not shown programmes with a CGPA minimum
-- (we can't confirm they qualify). Unknown age or nationality does not exclude them.
