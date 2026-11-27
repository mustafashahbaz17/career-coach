-- =====================================================================
-- Career Coach: admin page data (read-only views + one plan-change function)
-- Run AFTER 01-04. Safe to re-run.
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
--
-- Every view returns rows ONLY when the caller is an admin (profiles.is_admin).
-- They run as the view owner so they can join auth.users (sign-up and last
-- sign-in times), which students can never read. Signed-out visitors get nothing.
-- Feeds: admin page (A8), failure log (A9), cost numbers (A11), usage charts (B9).
-- =====================================================================

-- 1. One row per student
create or replace view public.admin_students with (security_invoker = false) as
select p.id, u.email, p.full_name, p.university, p.plan, p.onboarding_step, p.is_admin,
       u.created_at as signed_up_at, u.last_sign_in_at,
       coalesce(m.runs, 0)        as ai_runs_this_month,
       coalesce(m.failed, 0)      as failed_runs_this_month,
       coalesce(m.cost_pkr, 0)    as cost_pkr_this_month,
       coalesce(a.apps, 0)        as applications
from public.profiles p
join auth.users u on u.id = p.id
left join (
  select user_id, count(*) filter (where status = 'success') as runs,
         count(*) filter (where status = 'failed') as failed,
         round(coalesce(sum(cost_pkr), 0), 2) as cost_pkr
  from public.ai_runs
  where created_at >= (date_trunc('month', now() at time zone 'Asia/Karachi') at time zone 'Asia/Karachi')
  group by user_id) m on m.user_id = p.id
left join (select user_id, count(*) as apps from public.applications group by user_id) a on a.user_id = p.id
where public.is_admin();

-- 2. AI runs and cost per feature, last 30 days (the A11 numbers)
create or replace view public.admin_ai_costs with (security_invoker = false) as
select workflow as feature,
       count(*)                                         as runs,
       count(*) filter (where status = 'success')       as succeeded,
       count(*) filter (where status = 'failed')        as failed,
       count(*) filter (where status = 'limit_reached') as blocked_by_limit,
       round(100.0 * count(*) filter (where status = 'success') / nullif(count(*), 0), 1) as success_pct,
       round(avg(latency_ms) filter (where status = 'success'))                         as avg_latency_ms,
       round(coalesce(sum(cost_usd), 0), 4)  as cost_usd,
       round(coalesce(sum(cost_pkr), 0), 2)  as cost_pkr,
       round(coalesce(sum(cost_pkr), 0) / nullif(count(*) filter (where status = 'success'), 0), 2) as pkr_per_successful_run,
       count(distinct user_id)               as students
from public.ai_runs
where created_at >= now() - interval '30 days'
  and public.is_admin()
group by workflow;

-- 3. Recent failed runs, newest first (the A9 failure log)
create or replace view public.admin_failed_runs with (security_invoker = false) as
select r.id, r.created_at, u.email, r.workflow as feature, r.model, r.error_code,
       left(r.error_message, 300) as error_message, r.latency_ms
from public.ai_runs r
left join auth.users u on u.id = r.user_id
where r.status = 'failed'
  and public.is_admin()
order by r.created_at desc
limit 200;

-- 4. Sign-ups and onboarding completion per day, Pakistan time (B9 chart)
create or replace view public.admin_signups_daily with (security_invoker = false) as
select (u.created_at at time zone 'Asia/Karachi')::date as day,
       count(*) as signups,
       count(*) filter (where p.onboarding_step = 'done') as finished_onboarding
from auth.users u
join public.profiles p on p.id = u.id
where public.is_admin()
group by 1
order by 1;

-- Nobody signed out can read any of these; students get zero rows (is_admin() is false)
revoke all on public.admin_students, public.admin_ai_costs, public.admin_failed_runs,
              public.admin_signups_daily from anon;
grant select on public.admin_students, public.admin_ai_costs, public.admin_failed_runs,
                public.admin_signups_daily to authenticated;

-- 5. Admin changes a student's plan (for testers; students can't change their own)
create or replace function public.admin_set_plan(p_user uuid, p_plan text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_plan not in ('free','pro','premium') then raise exception 'bad_input'; end if;
  update public.profiles set plan = p_plan where id = p_user;
  if not found then raise exception 'not_found'; end if;
end; $$;
revoke all on function public.admin_set_plan(uuid, text) from public, anon;
grant execute on function public.admin_set_plan(uuid, text) to authenticated;
