-- =============================================================================
-- Pronostics Coupe du Monde 2026 — database schema
-- Paste this whole file into the Supabase SQL Editor and click "Run".
-- It is safe to run more than once (uses "if not exists" / "or replace").
-- =============================================================================

-- gen_random_bytes / gen_random_uuid live in the pgcrypto extension.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- The tournament stages, as a fixed list of allowed values ("enum").
-- ---------------------------------------------------------------------------
do $$ begin
  create type round_t as enum
    ('group_1','group_2','group_3','r32','r16','qf','final4');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- participants — one row per player. The admin (Ronald) is also a row here.
-- ---------------------------------------------------------------------------
create table if not exists participants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  -- secret token used in the personal magic-link URL  /p/<token>
  token         text unique not null default encode(gen_random_bytes(16), 'hex'),
  is_admin      boolean not null default false,
  -- links the admin's Supabase login account to this row (filled in Stage 4)
  auth_user_id  uuid unique,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- matches — every fixture. Filled automatically from football-data.org (Stage 3).
-- ---------------------------------------------------------------------------
create table if not exists matches (
  id             uuid primary key default gen_random_uuid(),
  round          round_t not null,
  home_team      text not null,                       -- FIFA 3-letter code
  away_team      text not null,
  kickoff_at     timestamptz not null,                -- doubles as the pick lock time
  result         text check (result in ('W','D','L')),-- null until played
  -- true when the admin set/corrected the result by hand; the auto-job must
  -- never overwrite a manually locked result.
  result_locked  boolean not null default false,
  points_value   int not null,                        -- points per correct pick (by stage)
  external_id    bigint unique,                       -- football-data.org match id (for re-imports)
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- picks — one row per (participant, match). W / D / L from the home team's view.
-- ---------------------------------------------------------------------------
create table if not exists picks (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participants(id) on delete cascade,
  match_id        uuid not null references matches(id) on delete cascade,
  predicted       text not null check (predicted in ('W','D','L')),
  entered_by      uuid references participants(id),   -- self, or admin proxy
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (participant_id, match_id)
);

-- ---------------------------------------------------------------------------
-- special_picks — the "Dernier Carré" bonus predictions (5 pts each).
-- ---------------------------------------------------------------------------
create table if not exists special_picks (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null unique references participants(id) on delete cascade,
  final_matchup   text,
  champion        text,
  runner_up       text,
  third           text,
  fourth          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- Row-Level Security (RLS)
-- With RLS on, the database denies all access by default and only allows what
-- a policy explicitly permits. This is what stops a participant from sneaking a
-- late pick or reading someone else's secret token.
-- =============================================================================
alter table participants  enable row level security;
alter table matches       enable row level security;
alter table picks         enable row level security;
alter table special_picks enable row level security;

-- Everyone may READ the fixtures/results. (Writes happen via the service-role
-- import job and admin tools, which bypass RLS.)
drop policy if exists matches_public_read on matches;
create policy matches_public_read on matches
  for select using (true);

-- We do NOT add a public read policy on the participants table itself, because
-- it contains the secret tokens. Instead we expose only safe columns through a
-- view below.

-- ---------------------------------------------------------------------------
-- participants_public — id + name only, never the token. Safe for leaderboard
-- and the pick-reveal. (A view runs with its owner's rights, so it can read the
-- base table even though anon cannot.)
-- ---------------------------------------------------------------------------
create or replace view participants_public as
  select id, name, is_admin from participants;

grant select on participants_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- revealed_picks — everyone's picks, but ONLY for matches whose kickoff has
-- already passed. This powers the "reveal" on the Résultats screen without
-- leaking picks for upcoming matches.
-- ---------------------------------------------------------------------------
create or replace view revealed_picks as
  select pk.id, pk.participant_id, pk.match_id, pk.predicted
  from picks pk
  join matches m on m.id = pk.match_id
  where m.kickoff_at <= now();

grant select on revealed_picks to anon, authenticated;

-- Note: writing picks (with the per-match lock enforced) and admin actions are
-- handled by secure database functions added in Stages 4 and 5.
