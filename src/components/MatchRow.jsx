import { frDateTime } from '../lib/format'

const LIVE_LABELS = { IN_PLAY: 'DIRECT', PAUSED: 'MI-TEMPS' }

function Crest({ url, code }) {
  if (!url) return <span className="crest crest-empty" aria-hidden="true" />
  return <img className="crest" src={url} alt={code} width="26" height="26" loading="lazy" />
}

export default function MatchRow({ match }) {
  const live = match.status === 'IN_PLAY' || match.status === 'PAUSED'
  const finished = match.status === 'FINISHED'
  const hasScore = match.home_score != null && match.away_score != null
  const showScore = (finished || live) && hasScore

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
    </div>
  )
}
