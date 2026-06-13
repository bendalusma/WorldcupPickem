-- =============================================================================
-- Stage 3 additions: team metadata (flags/crests) + live-score columns.
-- Paste into the Supabase SQL Editor and Run. Safe to run more than once.
-- =============================================================================

-- Canonical list of teams, used for crests/flags and the special-pick dropdowns.
create table if not exists teams (
  code        text primary key,   -- 3-letter code (football-data "tla")
  name        text not null,
  crest_url   text,               -- image URL for the flag/badge
  external_id bigint
);

alter table teams enable row level security;
drop policy if exists teams_public_read on teams;
create policy teams_public_read on teams for select using (true);

-- Live-score + display columns on matches.
alter table matches add column if not exists status      text;   -- TIMED / IN_PLAY / PAUSED / FINISHED ...
alter table matches add column if not exists home_score  int;
alter table matches add column if not exists away_score  int;
alter table matches add column if not exists match_group text;   -- e.g. GROUP_A
alter table matches add column if not exists home_name   text;
alter table matches add column if not exists away_name   text;
alter table matches add column if not exists home_crest  text;
alter table matches add column if not exists away_crest  text;
