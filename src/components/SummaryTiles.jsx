import { URGENCY } from '../utils/constants.js'
import { countByUrgency } from '../utils/urgency.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import './SummaryTiles.css'

const LIST_LABEL = 'Ringkasan urgensi'

// The five levels in the order a student reads them: what already slipped, what
// lands today, what is coming, what can wait, what is finished.
const LEVELS = [
  URGENCY.OVERDUE,
  URGENCY.DUE_TODAY,
  URGENCY.THIS_WEEK,
  URGENCY.LATER,
  URGENCY.DONE,
]

// The counts of every stored task, one tile per urgency level. Presentational and
// not interactive: a tile is a number to read, not a place to click, so it takes
// no action and no hover.
export function SummaryTiles({ tasks, now }) {
  const counts = countByUrgency(tasks, now)

  return (
    <ul className="summary-tiles" aria-label={LIST_LABEL}>
      {LEVELS.map((level) => (
        <li key={level} className="card summary-tiles__tile">
          <UrgencyBadge urgency={level} />
          <span className="summary-tiles__count">{counts[level]}</span>
        </li>
      ))}
    </ul>
  )
}

export default SummaryTiles