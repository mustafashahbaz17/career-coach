-- =====================================================================
-- Career Coach: let signed-out visitors read plan_limits (public pricing page)
-- Run after 02_core_tables.sql. Does not depend on 03 or 04.
-- Where: Supabase dashboard -> SQL Editor -> New query -> paste all -> Run
-- Safe to re-run.
--
-- Why: the pricing page shows each plan's monthly limits to people who
-- haven't signed up yet. The limits aren't private. Read-only: visitors
-- still can't insert, change or delete anything.
-- =====================================================================

drop policy if exists "plan_limits: read by anyone" on public.plan_limits;
create policy "plan_limits: read by anyone" on public.plan_limits
  for select to anon using (true);

grant select on public.plan_limits to anon;
revoke insert, update, delete on public.plan_limits from anon;
