# Pronostics Coupe du Monde 2026

French-first World Cup 2026 prediction app for Ronald's pool. Participants use
personal magic links to enter match predictions, while the admin can manage
participants, backfill phone picks, and enter or override match results.

## Current Status

- Stages 1-4 are committed on `main`.
- Supabase schemas exist in `supabase/`.
- Football-data.org fixture import exists in `scripts/import-fixtures.mjs`.
- Admin login and participant management are wired in the React app.
- `Résultats` reads matches from Supabase and groups them by tournament round.
- `Mes Pronostics` and `Classement` are still placeholders for upcoming stages.

## UI Decisions

- The app header uses the title `Jeu Pronostics` with `Just for Fun` beneath it
  and the local `public/world-cup-trophy.png` trophy image instead of the
  previous soccer-ball emoji. Source: PNGAll World Cup Trophy PNG.
- The results screen now uses collapsible round sections. Each round shows a
  full-width dropdown button with an arrow and match count; clicking it expands
  or hides that round's matches.
- Expanded result rounds stay chronological, but matches are subdivided by day
  and group-stage rows show a compact `Groupe A`/`Groupe B` style badge.
- Revealed matches on the results screen include a crowd-pick breakdown:
  home-win, draw, and away-win proportions display as a horizontal split bar.
- Live score flow: Vercel cron calls `/api/update-results` once per day at
  `03:00 UTC` (which is 11:00 PM in Toronto during daylight saving time) to
  sync football-data.org into Supabase, and the Results page polls Supabase
  every minute while open.
- The `Picks` tab shows transparent person-by-person choices for revealed
  matches, organized by group dropdowns and game dropdowns; each game includes
  flags, result context, and bottom-filled pick buckets for home win, draw, and
  away win.
- The Admin > Résultats rows now use the same crest/flag treatment as the
  participant screens, with the fixture split into home team, kickoff, and away
  team columns so the match header stays aligned on mobile.
- Participant-facing link copy should say `lien personnel unique` and show
  `/p/<code-personnel>` as the example pattern instead of a person-name URL.
- The Admin > Participants list should stay compact; the copy button alone is
  enough there, so avoid adding extra `/p/<code-personnel>` helper text in-row.
- Participant-facing copy should stay in French.
- The app is designed mobile-first because Ronald and participants will likely
  use it from phones.

## Local Commands

```bash
npm run dev
npm run build
npm run lint
npm run check-db
npm run import-fixtures
npm run create-admin
```

## Environment

Copy `.env.example` to `.env` and fill in the real values. Never commit `.env`.

Required values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FOOTBALL_DATA_TOKEN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Agent Notes

Keep `AGENTS.md`, `CLAUDE.md`, and `PROJECT_BRIEF.md` aligned when project rules
or product decisions change. Use Git commits often when Codex and Claude are both
working on this repo.
