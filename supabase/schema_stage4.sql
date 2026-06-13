-- =============================================================================
-- Stage 4: admin recognition + admin-only write policies.
-- Paste into the Supabase SQL Editor and Run. Safe to run more than once.
-- =============================================================================

-- Returns true when the currently logged-in user is our admin. Marked
-- SECURITY DEFINER so it can read the participants table without tripping the
-- table's own row-level-security (avoids infinite recursion in policies).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from participants
    where auth_user_id = auth.uid() and is_admin
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- --- participants: only the admin may read (tokens live here) or modify. -----
drop policy if exists participants_admin_all on participants;
create policy participants_admin_all on participants
  for all using (is_admin()) with check (is_admin());

-- --- matches: anyone reads (policy from Stage 2); only admin may write. ------
drop policy if exists matches_admin_write on matches;
create policy matches_admin_write on matches
  for all using (is_admin()) with check (is_admin());

-- --- picks: admin may do anything (proxy entry). Participant self-entry is
--     added in Stage 5 via a secure token-checked function. ------------------
drop policy if exists picks_admin_all on picks;
create policy picks_admin_all on picks
  for all using (is_admin()) with check (is_admin());

-- --- special_picks: same as picks. ------------------------------------------
drop policy if exists special_picks_admin_all on special_picks;
create policy special_picks_admin_all on special_picks
  for all using (is_admin()) with check (is_admin());

-- --- teams: anyone reads (Stage 3); only admin may write. -------------------
drop policy if exists teams_admin_write on teams;
create policy teams_admin_write on teams
  for all using (is_admin()) with check (is_admin());
