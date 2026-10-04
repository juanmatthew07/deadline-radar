import { URGENCY, URGENCY_LABELS } from '../utils/constants.js'
import './UrgencyBadge.css'

// The text label is the signal; the marker next to it is only a hint.
export function UrgencyBadge({ urgency }) {
  const label = URGENCY_LABELS[urgency] ?? URGENCY_LABELS[URGENCY.LATER]

  return (
    <span className="urgency-badge" data-urgency={urgency}>
      {label}
    </span>
  )
}

export default UrgencyBadge