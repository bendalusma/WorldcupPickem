-- =============================================================================
-- Stage 5: secure functions for participant magic-link auth + pick entry.
-- Paste into the Supabase SQL Editor and Run. Safe to run more than once.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- get_participant_by_token — used by the /p/:token magic-link page to log in.
-- Returns id + name + token for the matching participant (or empty set).
-- ---------------------------------------------------------------------------
create or replace function get_participant_by_token(p_token text)
returns table(id uuid, name text, token text)
language sql
security definer
set search_path = public
as $$
  select id, name, token from participants where token = p_token;
$$;

revoke all on function get_participant_by_token(text) from public;
grant execute on function get_participant_by_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- get_my_picks — returns all W/D/L picks for a participant, verified by token.
-- Used by the Pronostics page to pre-fill buttons with existing picks.
-- ---------------------------------------------------------------------------
create or replace function get_my_picks(p_token text)
returns table(match_id uuid, predicted text)
language sql
security definer
set search_path = public
as $$
  select pk.match_id, pk.predicted
  from picks pk
  join participants p on p.id = pk.participant_id
  where p.token = p_token;
$$;

revoke all on function get_my_picks(text) from public;
grant execute on function get_my_picks(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_pick — upserts one pick after validating token + kickoff lock.
-- The SECURITY DEFINER means this runs as the DB owner, bypassing RLS.
-- ---------------------------------------------------------------------------
create or replace function submit_pick(
  p_token    text,
  p_match_id uuid,
  p_predicted text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_kickoff_at     timestamptz;
begin
  -- 1. Validate token
  select id into v_participant_id from participants where token = p_token;
  if v_participant_id is null then
    raise exception 'Token invalide';
  end if;

  -- 2. Check lock
  select kickoff_at into v_kickoff_at from matches where id = p_match_id;
  if v_kickoff_at is null then
    raise exception 'Match introuvable';
  end if;
  if v_kickoff_at <= now() then
    raise exception 'Ce match est verrouillé';
  end if;

  -- 3. Validate predicted value
  if p_predicted not in ('W','D','L') then
    raise exception 'Valeur invalide (W/D/L attendu)';
  end if;

  -- 4. Upsert
  insert into picks (participant_id, match_id, predicted, entered_by)
  values (v_participant_id, p_match_id, p_predicted, v_participant_id)
  on conflict (participant_id, match_id) do update
    set predicted   = excluded.predicted,
        updated_at  = now();
end;
$$;

revoke all on function submit_pick(text, uuid, text) from public;
grant execute on function submit_pick(text, uuid, text) to anon, authenticated;
