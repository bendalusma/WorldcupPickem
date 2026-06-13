// French-formatted kickoff date/time, e.g. "jeu. 11 juin, 21:00".
export function frDateTime(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// Stable local-day key used to group matches into day sections while preserving
// chronological order inside each tournament round.
export function frDateKey(iso) {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

// Human-readable French day heading for the grouped match list, e.g.
// "samedi 13 juin".
export function frDayLabel(iso) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(iso))
}
