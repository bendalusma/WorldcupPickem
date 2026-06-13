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
