// =============================================================================
// Central scoring configuration — the single source of truth for all points.
// The leaderboard and trophy calculations (Stage 5/6) read from this file so
// the rules live in exactly one place.
// =============================================================================

// Points awarded per correct W/D/L match prediction, by tournament round.
export const ROUND_POINTS = {
  group_1: 1,
  group_2: 1,
  group_3: 1,
  r32: 2, // 1/16 de finale
  r16: 3, // 1/8 de finale
  qf: 4,  // 1/4 de finale
  // final4: no W/D/L predictions here — replaced by the Dernier Carré specials below.
}

// French labels for each round (used in the UI).
export const ROUND_LABELS = {
  group_1: 'Phase de Groupe : Tour 1',
  group_2: 'Phase de Groupe : Tour 2',
  group_3: 'Phase de Groupe : Tour 3',
  r32: '1/16 de finale',
  r16: '1/8 de finale',
  qf: '1/4 de finale',
  final4: 'Dernier Carré',
}

// -----------------------------------------------------------------------------
// Dernier Carré (Final 4): once only 4 teams remain, players no longer predict
// match winners. Instead they make these 5 predictions, 5 points each = 25 total.
// -----------------------------------------------------------------------------
export const SPECIAL_POINTS = 5
export const SPECIAL_FIELDS = [
  { key: 'final_matchup', label: "L'affiche de la finale (les 2 finalistes)" },
  { key: 'champion',      label: '1re place — Champion' },
  { key: 'runner_up',     label: '2e place — Finaliste' },
  { key: 'third',         label: '3e place' },
  { key: 'fourth',        label: '4e place' },
]
export const SPECIAL_TOTAL = SPECIAL_POINTS * SPECIAL_FIELDS.length // 25

// -----------------------------------------------------------------------------
// The five trophies. Each lists which rounds feed it. "Ronde Finale" is the sum
// of all knockout rounds PLUS the Dernier Carré specials (per Ronald's rule).
// -----------------------------------------------------------------------------
export const TROPHIES = {
  tour1:       { label: 'Tour 1',       rounds: ['group_1'], includesSpecials: false },
  tour2:       { label: 'Tour 2',       rounds: ['group_2'], includesSpecials: false },
  tour3:       { label: 'Tour 3',       rounds: ['group_3'], includesSpecials: false },
  rondeFinale: { label: 'Ronde Finale', rounds: ['r32', 'r16', 'qf'], includesSpecials: true },
  total:       { label: 'Total',        rounds: ['group_1', 'group_2', 'group_3', 'r32', 'r16', 'qf'], includesSpecials: true },
}
