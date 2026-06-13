import { frDateTime } from '../lib/format'

const LIVE_LABELS = { IN_PLAY: 'DIRECT', PAUSED: 'MI-TEMPS' }

function Crest({ url, code }) {
  if (!url) return <span className="crest crest-empty" aria-hidden="true" />
  return <img className="crest" src={url} alt={code} width="26" height="26" loading="lazy" />
}

function groupLetter(matchGroup) {
  if (!matchGroup?.startsWith('GROUP')) return null

  // football-data.org returns group names such as GROUP_A; the UI only needs
  // the clean letter so each row can stay compact on mobile.
  return matchGroup.split(/[_\s-]+/).pop()
}

function groupBadgeClass(group) {
  // The group letter is also used as a CSS modifier so every World Cup group
  // gets a distinct visual chip without hard-coding colors in the JSX.
  return group ? ` group-badge-${group.toLowerCase()}` : ''
}

function pickPercent(count, total) {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function PickBreakdown({ match, stats }) {
  const total = stats?.total ?? 0
  const homePct = pickPercent(stats?.W ?? 0, total)
  const drawPct = pickPercent(stats?.D ?? 0, total)
  const awayPct = pickPercent(stats?.L ?? 0, total)

  // The first two result rows use this prototype bar to test whether crowd-pick
  // proportions feel useful before expanding the feature to every match.
  return (
    <div className="pick-breakdown" aria-label={`Répartition des pronostics pour ${match.home_team} contre ${match.away_team}`}>
      <div className="pick-breakdown-meta">
        <span>{total} vote{total > 1 ? 's' : ''}</span>
      </div>
      {total > 0 ? (
        <>
          <div className="pick-split-bar">
            <span className="pick-split pick-split-home" style={{ flexGrow: homePct || 0.5 }} />
            <span className="pick-split pick-split-draw" style={{ flexGrow: drawPct || 0.5 }} />
            <span className="pick-split pick-split-away" style={{ flexGrow: awayPct || 0.5 }} />
          </div>
          <div className="pick-breakdown-labels">
            <span className="pick-legend-item pick-legend-home">
              <span className="pick-legend-dot" aria-hidden="true" />
              <span>{match.home_team}</span>
              <strong>{homePct}%</strong>
            </span>
            <span className="pick-legend-item pick-legend-draw">
              <span className="pick-legend-dot" aria-hidden="true" />
              <span>Nul</span>
              <strong>{drawPct}%</strong>
            </span>
            <span className="pick-legend-item pick-legend-away">
              <span className="pick-legend-dot" aria-hidden="true" />
              <span>{match.away_team}</span>
              <strong>{awayPct}%</strong>
            </span>
          </div>
        </>
      ) : (
        <p className="pick-breakdown-empty">Aucun pronostic révélé pour ce match.</p>
      )}
    </div>
  )
}

export default function MatchRow({ match, pickStats = null, showPickStatsHeading = false }) {
  const live = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const finished = match.status === 'FINISHED'
  const hasScore = match.home_score != null && match.away_score != null
  const showScore = (finished || live) && hasScore
  const group = groupLetter(match.match_group)

  return (
    <div className={`match-row${live ? ' is-live' : ''}`}>
      <div className="team team-home">
        <span className="team-code">{match.home_team}</span>
        <Crest url={match.home_crest} code={match.home_team} />
      </div>

      <div className="match-center">
        {showScore ? (
          <span className="score">{match.home_score} – {match.away_score}</span>
        ) : (
          <span className="kickoff">{frDateTime(match.kickoff_at)}</span>
        )}
        {group && <span className={`group-badge${groupBadgeClass(group)}`}>Groupe {group}</span>}
        {live && (
          <span className="live-badge">
            <span className="live-dot" aria-hidden="true" />
            {LIVE_LABELS[match.status] ?? 'DIRECT'}
          </span>
        )}
      </div>

      <div className="team team-away">
        <Crest url={match.away_crest} code={match.away_team} />
        <span className="team-code">{match.away_team}</span>
      </div>

      {showPickStatsHeading && (
        <div className="pick-breakdown-section-title">Répartition des pronostics</div>
      )}
      {pickStats && <PickBreakdown match={match} stats={pickStats} />}
    </div>
  )
}
