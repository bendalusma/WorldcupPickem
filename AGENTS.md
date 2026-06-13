# Pronostics Coupe du Monde 2026 — Project Brief

> This file is the handoff brief for building the app. It is written to double as a
> `AGENTS.md`: drop it in the project root and Codex will read it at session start.
> Keep it updated as decisions change.

## Setup / accounts (do before the first build session)

You only strictly need **Supabase** and **Node** before opening Codex; the rest can
wait until you deploy.

- **Supabase** — sign up at supabase.com (free tier). Create ONE new project. From Project
  Settings → API, you'll get a **Project URL** and an **anon/public key** plus a **service
  role key**. Codex will build the tables; you just provide these keys.
- **Node.js** — needed for the React/Vite app. Check with `node --version`; if no version
  prints, install the LTS from nodejs.org.
- **GitHub** — already have one. Codex commits here; Vercel deploys from it.
- **Vercel** — sign up (free) with your GitHub login when you're ready to put the app
  online. Not needed to start building.
- **football-data.org token** — register for a free API token at football-data.org. Needed
  for fixtures + results (step 2 of build order).

**Where keys go:** put all secrets in a local `.env` file (and Supabase/Vercel env settings
for deploys). NEVER commit `.env` or paste keys into client-side code — add `.env` to
`.gitignore`. The `service role` key and the football-data token are server-side only; the
browser should only ever see the Supabase `anon` key.

## What we're building

A web app to replace a paper-and-phone World Cup prediction game run by Ronald (the
organizer). ~40 participants predict the outcome (Win / Draw / Lose, from the home team's
perspective) of every match. Points are awarded for correct predictions, weighted by
tournament stage. There are five "trophies" (see Scoring), but the headline prize is the
overall points total across the whole tournament.

The current process is: Ronald phones each participant, writes their picks on paper, and
tabulates by hand. We are replacing that.

**Language:** The participant-facing UI must be in **French**. (Admin UI can be French too.)

## Users and roles

- **Participant** — logs in via a personal magic link (no password). Enters their own
  picks before each match locks. Views results and the leaderboard.
- **Admin (Ronald)** — password login. Can: create/edit participants, enter picks on
  behalf of anyone (many participants are not tech-savvy), enter/confirm match results,
  and override pick deadlines.

## Tech stack

- **Frontend:** React + Vite (or Next.js if SSR is wanted), deployed on Vercel (free tier).
- **Backend / DB / Auth:** Supabase (free tier) — Postgres + row-level security.
- **Hosting:** Vercel for frontend, Supabase hosts the DB.

Rationale: minimal server code, fast to ship, free at this scale, and within reach for a
developer comfortable with JS.

## Authentication

- **Participants: magic links, NOT passwords.** Ronald creates each participant, the system
  generates a unique token, producing a URL like `https://<app>/p/<token>`. Participants
  open their link (distributed via WhatsApp) and are logged in. No email/password to forget.
- **Admin: a real password** (Supabase email/password auth, single admin account).
- Enforce permissions with Supabase Row-Level Security, not just UI checks.

## Data model (Postgres / Supabase)

**participants**
- `id` (uuid, pk)
- `name` (text)
- `token` (text, unique) — used in the magic-link URL
- `is_admin` (bool, default false)
- `created_at` (timestamptz)

**matches**
- `id` (uuid, pk)
- `round` (enum/text: `group_1`, `group_2`, `group_3`, `r32`, `r16`, `qf`, `final4`)
- `home_team` (text, FIFA 3-letter code)
- `away_team` (text, FIFA 3-letter code)
- `kickoff_at` (timestamptz) — used as the per-match lock time
- `result` (text, nullable: `W` / `D` / `L` from home perspective; null until played)
- `points_value` (int) — see Scoring
- `created_at`

**picks**
- `id` (uuid, pk)
- `participant_id` (fk → participants)
- `match_id` (fk → matches)
- `predicted` (text: `W` / `D` / `L`)
- `entered_by` (fk → participants) — self vs. admin proxy entry
- `created_at`, `updated_at`
- unique constraint on (`participant_id`, `match_id`)

**special_picks** (the Final 4 / "Dernier Carré" bonus predictions, 5 pts each)
- `id` (uuid, pk)
- `participant_id` (fk → participants)
- `final_matchup` (text) — predicted finalists
- `champion` (text, FIFA code)
- `runner_up` (text)
- `third` (text)
- `fourth` (text)

Scores are **not stored** — they're computed on the fly by joining `picks` to `matches`
and summing `points_value` where `predicted = result`, grouped by round. This keeps scoring
always-correct and lets you re-derive every trophy from one query.

## Scoring rules

Points per correct prediction, by stage:

| Stage | French label | Points / correct |
|---|---|---|
| Group rounds 1–3 | Phase de Groupe | 1 |
| Round of 32 | 1/16 de finale | 2 |
| Round of 16 | 1/8 de finale | 3 |
| Quarter-finals | 1/4 de finale | 4 |
| Final 4 specials | Dernier Carré | 5 each |

Final 4 specials (5 pts each, total 25): final matchup, champion, runner-up, 3rd, 4th.
There's a 3rd-place playoff to determine 3rd/4th.

### The five trophies (all derived from the same data)
1. Winner of Round 1 (group_1 points only)
2. Winner of Round 2 (group_2 points only)
3. Winner of Round 3 (group_3 points only)
4. Winner of the "Ronde Finale" — cumulative points from Round of 32 through the Final
5. **Overall champion — total points across the entire tournament (the major trophy)**

## The three screens

1. **Mes Pronostics (My Picks)** — current round's matches; tap W / D / L per match;
   lock icon appears once `kickoff_at` passes. Shows a deadline countdown.
2. **Résultats (Results)** — all matches with actual outcomes; after a match locks, show
   everyone's picks for it (this reveal is half the fun).
3. **Classement (Leaderboard)** — one row per participant, columns per trophy
   (Tour 1, Tour 2, Tour 3, Ronde Finale, Total), sortable, default sort by Total.

Plus an **Admin** screen: manage participants, proxy-enter picks, enter/confirm results,
override locks.

## Deadlines / locking

- Lock each match's picks at `kickoff_at` (confirm with Ronald whether he locks per-match
  or per-round at the first kickoff).
- Enforce the lock in the database via RLS so a participant can't sneak a late pick.
- **Admin can bypass the lock** — he will get late phone calls.

## Fixtures + results: football-data.org API

**Decision: preload fixtures and auto-fetch results, both from football-data.org.**
One free API serves both needs.

- **API:** football-data.org, REST JSON v4. Free tier covers the FIFA World Cup (competition
  code `WC`), forever-free, 10 requests/min. Register for a free API token; pass it in the
  `X-Auth-Token` header. Store the token as a secret (Supabase env / server-side only),
  never in client code or git.
- **Preloading fixtures:** on setup, pull the World Cup matches endpoint and insert each
  match into the `matches` table (teams, kickoff time, round). Map the API's stage labels
  to our `round` enum. Group-stage teams are known now; knockout matchups appear in the
  API once each round's teams are decided, so the same job backfills knockout fixtures as
  the bracket fills in — no manual entry needed.
- **Auto-results:** a scheduled job (Supabase scheduled function or a Vercel cron, e.g.
  every ~30 min) reads finished matches and writes the outcome to `matches.result`.
  The API returns a **score**; derive W/D/L from home vs away goals
  (`home > away` → `W`, equal → `D`, `home < away` → `L`). Delayed (non-live) scores are
  fine — we only need the final result. See the knockout caveat in Open Questions for how
  to treat games decided in extra time / penalties.
- **Manual override stays:** Ronald can always set or correct a result by hand (for a
  postponed match, an API gap, or a knockout-result ruling). The auto-job should not
  overwrite a result an admin has manually locked.

Backup source if needed: there's a free open-source World Cup 2026 API
(github.com/rezarahiminia/worldcup2026) exposing games/groups/scores; keep as fallback only.

## Current build state (as of 2026-06-12)

### Already done ✅

**Infrastructure**
- React 19 + Vite 8, plain JavaScript (no TypeScript), react-router-dom v7
- Supabase project connected (URL + anon key in `.env` via `VITE_` prefix)
- Node scripts use `node --env-file=.env` — no dotenv package needed
- `.env` is git-ignored; `.env.example` shows the required keys

**Database (Supabase Postgres + RLS)**
- All 4 tables created: `participants`, `matches`, `picks`, `special_picks`
- Extra columns on `matches`: `status`, `score_home`, `score_away`, `crest_url` (for live scores / flags)
- `teams` lookup table for crest images
- `is_admin()` SECURITY DEFINER function — avoids RLS recursion when checking admin status
- Admin policies applied to all tables via `schema_stage4.sql`
- All schema files live in `supabase/` (schema.sql, schema_stage3.sql, schema_stage4.sql)

**Scripts (in `scripts/`)**
- `npm run create-admin` — creates admin auth user(s) and participant rows
- `npm run import-fixtures` — seeds all 104 WC matches from football-data.org API
- `npm run import-round1` — bulk-imports 43 participants + their Round 1 picks from Excel
- `npm run check-db` — connectivity test

**Auth**
- Admin: Supabase email/password. Two admins supported (Benjamin + Ronald when available).
- Participants: custom magic-link tokens — URL format `/p/:token`, no Supabase Auth needed.
- Token format: **first name only**, lowercased, hyphens preserved for compound names
  (e.g., `yves-marie`, `charles-philippe`, `marc-arthur`).

**Participants & picks**
- 43 participants imported. Round 1 picks imported (1031/1032 picks — Carrel Delpe
  missing one pick due to unrecognized value "PAN" for POR-COD; to confirm with Ronald).

**Frontend pages built**
- `Résultats` — shows all matches grouped by round with live score / kickoff time
- `Admin` — login form + participant CRUD (add, edit name inline, delete, copy magic link)
- `Pronostics`, `Classement` — placeholder pages only

**UI utilities**
- `src/lib/scoring.js` — ROUND_POINTS, ROUND_LABELS, SPECIAL_FIELDS, TROPHIES config
- `src/lib/format.js` — `frDateTime(iso)` French date formatting
- `src/lib/names.js` — `firstName(fullName)` extracts display name from stored full name
- `src/lib/AuthProvider.jsx` — React context: session, isAdmin, loading, signIn, signOut

### What's next 🔜

1. **Mes Pronostics** — magic-link login at `/p/:token`, pick entry UI (team name buttons,
   not abstract W/D/L), per-match locking at kickoff_at.
2. **Admin proxy picks** — admin enters/edits picks on behalf of any participant.
3. **Admin results entry** — admin sets match results; `result_locked` flag prevents
   auto-job from overwriting manual entries.
4. **Classement** — leaderboard with 5 trophy columns (Tour 1–3, Ronde Finale, Total).
5. **Résultats pick reveal** — after match locks, show all participants' picks.
6. **Auto-results cron** — Vercel cron job calls import-fixtures every ~30 min.
7. **Deploy** — push to GitHub → connect Vercel → set env vars → live URL for WhatsApp.

## Build order (suggested MVP path)

1. ~~Supabase project + the four tables + RLS policies.~~ ✅
2. ~~Register a football-data.org token; write the fixtures-import job and seed `matches`.~~ ✅
3. ~~Admin auth + participant CRUD + magic-link token generation.~~ ✅
4. ~~Bulk-import Round 1 participants + picks from spreadsheet.~~ ✅
5. **Participant magic-link login + Mes Pronostics screen with per-match locking.** ← next
6. Admin proxy pick entry + admin results entry / override.
7. Scoring query + Classement screen.
8. Résultats screen with per-match pick reveal.
9. Auto-results scheduled job + knockout-fixture backfill.
10. Polish: French copy, mobile layout, deadline countdowns, deploy to Vercel.

## Open questions to confirm with Ronald

1. In knockout rounds, is the pick "who advances" or W/D/L at 90 minutes (draws possible
   before extra time)? This changes the pick UI and scoring for half the tournament.
   It also dictates how the auto-results job maps API data: if a knockout game is level
   at 90 min and decided in extra time / penalties, does it score as a Draw, or as a win
   for the team that advanced? Decide this before writing the knockout scoring logic.
2. Per-match locking or per-round locking at first kickoff?
3. Exact deadline rule for the Final 4 special picks.

## FIFA 3-letter codes (48 qualified teams)

CAN, MEX, USA, ARG, AUS, AUT, ALG, BEL, BIH, BRA, CPV, COL, COD, CRO, CUW, CIV, CZE, ECU,
EGY, ENG, FRA, GER, GHA, HAI, IRQ, IRN, JPN, JOR, KOR, MAR, NED, NZL, NOR, PAN, PAR, POR,
QAT, KSA, SCO, SEN, RSA, ESP, SWE, SUI, TUN, TUR, URU, UZB

(Note: Haiti's official code is HAI.)
