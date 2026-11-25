-- =====================================================================
-- Career Coach: onboarding database (basic info, LinkedIn import, quiz)
-- Where to run: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to re-run: tables are kept, quiz content is updated in place,
-- and no student's answers are deleted.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFILES: one row per student, created automatically at sign-up
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text,
  full_name        text,
  linkedin_url     text,
  headline         text,
  university       text,
  degree           text,                 -- e.g. BSc, BBA, BS
  major            text,                 -- e.g. Accounting and Finance
  study_year       text check (study_year in ('1st','2nd','3rd','4th','5th','graduated')),
  grad_year        int  check (grad_year between 2000 and 2100),
  cgpa             numeric(3,2) check (cgpa >= 0 and cgpa <= 5),
  cgpa_scale       numeric(2,1) not null default 4.0 check (cgpa_scale in (4.0, 5.0)),
  city             text,
  birth_year       int  check (birth_year between 1950 and 2015),
  gender           text check (gender in ('female','male','other','prefer_not_to_say')),  -- optional, eligibility only
  nationality      text,                                                                  -- optional, eligibility only
  languages        text[] not null default '{}',
  skills           text[] not null default '{}',
  experience       jsonb  not null default '[]'::jsonb,  -- [{title, org, start, end, description}]
  education        jsonb  not null default '[]'::jsonb,  -- [{school, degree, field, start, end}]
  onboarding_step  text not null default 'basic_info' check (onboarding_step in ('basic_info','quiz','done')),
  plan             text not null default 'free' check (plan in ('free','pro','premium')),
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Create the profile row the moment someone signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at current
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Row-level security: a student sees and edits only their own row
alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Students may edit their details but NEVER their own plan or admin flag
revoke update on public.profiles from authenticated, anon;
grant update (
  full_name, linkedin_url, headline, university, degree, major, study_year, grad_year,
  cgpa, cgpa_scale, city, birth_year, gender, nationality, languages, skills,
  experience, education, onboarding_step
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. LINKEDIN IMPORTS: written by n8n (service key), read by the student
-- ---------------------------------------------------------------------
create table if not exists public.linkedin_imports (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  linkedin_url   text not null,
  status         text not null default 'pending' check (status in ('pending','success','empty','failed')),
  raw            jsonb,          -- what Apify returned
  mapped         jsonb,          -- the fields we pre-fill the form with
  error_message  text,
  created_at     timestamptz not null default now()
);

alter table public.linkedin_imports enable row level security;
drop policy if exists "linkedin_imports: read own" on public.linkedin_imports;
create policy "linkedin_imports: read own" on public.linkedin_imports
  for select to authenticated using (user_id = auth.uid());
-- No insert/update policy for students: only n8n (service key) writes here.

-- ---------------------------------------------------------------------
-- 3. QUIZ: tracks, questions, options (content) and responses (per student)
-- ---------------------------------------------------------------------
create table if not exists public.career_tracks (
  key          text primary key,
  name         text not null,
  description  text not null
);

create table if not exists public.quiz_questions (
  id           text primary key,                 -- q1, q2 ...
  position     int  not null,
  kind         text not null check (kind in ('single','multi','text')),
  prompt       text not null,
  help         text,
  max_choices  int,                              -- for multi
  required     boolean not null default true,
  active       boolean not null default true
);

create table if not exists public.quiz_options (
  id             uuid primary key default gen_random_uuid(),
  question_id    text not null references public.quiz_questions(id) on delete cascade,
  key            text not null,                  -- a, b, c ...
  label          text not null,
  position       int  not null,
  track_weights  jsonb not null default '{}'::jsonb,   -- {"consulting": 2, "finance": 1}
  unique (question_id, key)
);

create table if not exists public.quiz_responses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  question_id  text not null references public.quiz_questions(id) on delete cascade,
  option_key   text,                             -- null for text questions
  text_answer  text,                             -- null for choice questions
  created_at   timestamptz not null default now(),
  unique nulls not distinct (user_id, question_id, option_key),
  check ((option_key is null) <> (text_answer is null))
);

alter table public.career_tracks  enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options   enable row level security;
alter table public.quiz_responses enable row level security;

drop policy if exists "tracks: read all" on public.career_tracks;
create policy "tracks: read all" on public.career_tracks for select to authenticated using (true);
drop policy if exists "questions: read active" on public.quiz_questions;
create policy "questions: read active" on public.quiz_questions for select to authenticated using (active);
drop policy if exists "options: read all" on public.quiz_options;
create policy "options: read all" on public.quiz_options for select to authenticated using (true);

drop policy if exists "responses: read own" on public.quiz_responses;
create policy "responses: read own" on public.quiz_responses
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "responses: insert own" on public.quiz_responses;
create policy "responses: insert own" on public.quiz_responses
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "responses: delete own" on public.quiz_responses;
create policy "responses: delete own" on public.quiz_responses
  for delete to authenticated using (user_id = auth.uid());
-- To change an answer: delete that question's rows, then insert the new ones.

-- Deterministic score per track (no AI, cheap, testable). n8n reads this,
-- then the AI step adds the free-text answers and the profile.
create or replace view public.quiz_track_scores with (security_invoker = true) as
select r.user_id,
       w.key              as track_key,
       sum(w.value::numeric) as score
from public.quiz_responses r
join public.quiz_options o
  on o.question_id = r.question_id and o.key = r.option_key
cross join lateral jsonb_each_text(o.track_weights) as w(key, value)
group by r.user_id, w.key;

-- Where the AI result lands (written by n8n)
create table if not exists public.interest_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  tracks          jsonb not null,      -- [{track_key, score, reason}]
  confidence      numeric(3,2),
  needs_followup  boolean not null default false,
  model           text,
  created_at      timestamptz not null default now()
);
alter table public.interest_results enable row level security;
drop policy if exists "interest_results: read own" on public.interest_results;
create policy "interest_results: read own" on public.interest_results
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. QUIZ CONTENT (edit freely; re-running updates it in place)
--    To retire a question, set active = false instead of deleting it,
--    so existing answers stay valid.
-- ---------------------------------------------------------------------

insert into public.career_tracks (key, name, description) values
 ('consulting',  'Consulting and strategy',      'Solving business problems for clients; case interviews; fast learning'),
 ('marketing',   'Marketing and brand (FMCG)',   'Brands, campaigns, consumers; common MT route at large FMCGs'),
 ('finance',     'Finance and banking',          'Investment banking, corporate finance, audit and advisory'),
 ('tech',        'Tech and product',             'Software, product management, building digital products'),
 ('data',        'Data and analytics',           'Finding patterns in data, dashboards, business analytics'),
 ('operations',  'Operations and supply chain',  'Making things run on time: planning, logistics, manufacturing'),
 ('people',      'HR and people',                'Hiring, culture, training and employee experience'),
 ('policy',      'Public policy and development','Government, NGOs, development sector, social impact'),
 ('founder',     'Entrepreneurship',             'Starting and growing your own venture'),
 ('creative',    'Creative and media',           'Design, content, media, communications')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.quiz_questions (id, position, kind, prompt, help, max_choices, required) values
 ('q1', 1, 'multi',  'Which of these would you happily spend a Saturday on?', 'Pick up to 3', 3, true),
 ('q2', 2, 'single', 'In a group project, you usually end up...', null, null, true),
 ('q3', 3, 'multi',  'What matters most to you in your first job?', 'Pick 2', 2, true),
 ('q4', 4, 'single', 'Which workplace sounds most like you?', null, null, true),
 ('q5', 5, 'multi',  'Which subjects are you strongest in?', 'Pick up to 2', 2, true),
 ('q6', 6, 'single', 'A company''s sales dropped 20% last quarter. What''s your first instinct?', null, null, true),
 ('q7', 7, 'single', 'How do you feel about working with numbers all day?', null, null, true),
 ('q8', 8, 'single', 'Five years from now, you would most like to be...', null, null, true),
 ('q9', 9, 'text',   'Tell us about something you did that you are proud of.', '2 or 3 lines is enough: a project, a society role, a job, anything', null, true),
 ('q10',10,'text',   'Any careers or companies you are already curious about?', 'Optional', null, false)
on conflict (id) do update set position = excluded.position, kind = excluded.kind, prompt = excluded.prompt,
  help = excluded.help, max_choices = excluded.max_choices, required = excluded.required;

insert into public.quiz_options (question_id, key, label, position, track_weights) values
 -- q1 Saturday
 ('q1','a','Cracking a business case or a tricky puzzle',          1, '{"consulting":2,"finance":1}'),
 ('q1','b','Building an app or automating something boring',       2, '{"tech":2,"data":1}'),
 ('q1','c','Planning a campaign or event for a society',           3, '{"marketing":2,"operations":1}'),
 ('q1','d','Digging through a spreadsheet to find a pattern',      4, '{"data":2,"finance":1}'),
 ('q1','e','Volunteering on a community problem',                  5, '{"policy":2,"people":1}'),
 ('q1','f','Designing, filming or writing something',              6, '{"creative":2,"marketing":1}'),
 ('q1','g','Running a small side business',                        7, '{"founder":2,"marketing":1}'),
 ('q1','h','Organising logistics so everything runs on time',      8, '{"operations":2}'),
 -- q2 group project
 ('q2','a','Leading and splitting up the work',                    1, '{"consulting":1,"operations":1,"people":1}'),
 ('q2','b','Doing the research and analysis',                      2, '{"data":2,"finance":1}'),
 ('q2','c','Making the slides great and presenting',               3, '{"marketing":1,"creative":1,"consulting":1}'),
 ('q2','d','Building the actual thing',                            4, '{"tech":2}'),
 ('q2','e','Keeping everyone motivated and getting along',         5, '{"people":2}'),
 -- q3 values (pick 2)
 ('q3','a','High pay',                                             1, '{"finance":2,"consulting":1}'),
 ('q3','b','Social impact',                                        2, '{"policy":2}'),
 ('q3','c','Stability and a clear path',                           3, '{"operations":1,"finance":1,"people":1}'),
 ('q3','d','Learning fast',                                        4, '{"consulting":1,"tech":1,"founder":1}'),
 ('q3','e','Room to be creative',                                  5, '{"creative":2,"marketing":1}'),
 ('q3','f','Independence',                                         6, '{"founder":2}'),
 -- q4 workplace
 ('q4','a','A fast-paced firm with demanding clients',             1, '{"consulting":2,"finance":1}'),
 ('q4','b','A startup where everyone does a bit of everything',    2, '{"founder":2,"tech":1}'),
 ('q4','c','A big multinational with structure and training',      3, '{"marketing":1,"operations":1,"people":1}'),
 ('q4','d','An NGO or a government body',                          4, '{"policy":2}'),
 ('q4','e','Remote or freelance, my own hours',                    5, '{"creative":1,"tech":1}'),
 -- q5 subjects (pick 2)
 ('q5','a','Maths and statistics',                                 1, '{"data":2,"finance":1}'),
 ('q5','b','Economics',                                            2, '{"finance":1,"policy":1,"consulting":1}'),
 ('q5','c','Computer science',                                     3, '{"tech":2,"data":1}'),
 ('q5','d','Business and marketing',                               4, '{"marketing":2,"founder":1}'),
 ('q5','e','Psychology or social sciences',                        5, '{"people":2,"policy":1}'),
 ('q5','f','Design, media or literature',                          6, '{"creative":2}'),
 -- q6 sales drop
 ('q6','a','Pull the numbers and find where it fell',              1, '{"data":2,"finance":1}'),
 ('q6','b','Talk to customers and find out why',                   2, '{"marketing":2}'),
 ('q6','c','Check supply, stock and delivery problems',            3, '{"operations":2}'),
 ('q6','d','Build a tool so it never surprises us again',          4, '{"tech":2}'),
 ('q6','e','Rethink the whole strategy',                           5, '{"consulting":2,"founder":1}'),
 -- q7 numbers
 ('q7','a','Love it',                                              1, '{"finance":2,"data":2}'),
 ('q7','b','Fine in doses',                                        2, '{"consulting":1,"operations":1,"marketing":1}'),
 ('q7','c','I prefer people or ideas',                             3, '{"people":1,"creative":1,"policy":1}'),
 -- q8 five years
 ('q8','a','Running my own company',                               1, '{"founder":2}'),
 ('q8','b','Leading a team at a big company',                      2, '{"marketing":1,"operations":1,"people":1}'),
 ('q8','c','A go-to expert in a specialist field',                 3, '{"tech":1,"data":1,"finance":1}'),
 ('q8','d','Advising senior leaders',                              4, '{"consulting":2}'),
 ('q8','e','Shaping policy or running social programmes',          5, '{"policy":2}'),
 ('q8','f','Known for my creative work',                           6, '{"creative":2}')
on conflict (question_id, key) do update set label = excluded.label, position = excluded.position,
  track_weights = excluded.track_weights;
