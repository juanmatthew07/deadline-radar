import { STATUS_LABELS, TASK_STATUS } from '../utils/constants.js'
import { formatDeadline, parseDeadline } from '../utils/date.js'
import { getUrgency } from '../utils/urgency.js'
import Icon from './Icon.jsx'
import { BookOpen, Calendar } from './icons.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import './TaskRow.css'

// One card of the list. Presentational: it reads the task and renders it, and
// urgency is derived here from the reference time, never read off the task. The
// title is the one control of the card, and its overlay reaches the whole card,
// so nothing else in here is interactive.
export function TaskRow({ task, now, onOpen }) {
  const deadline = parseDeadline(task.deadline)
  const deadlineLabel = formatDeadline(task.deadline)
  const statusLabel = STATUS_LABELS[task.status] ?? STATUS_LABELS[TASK_STATUS.TODO]
  const urgency = getUrgency(task, now)
  // A finished task needs no second status label, the badge already says Selesai.
  const isDone = task.status === TASK_STATUS.DONE

  return (
    <li className="card task-row" data-urgency={urgency}>
      <div className="task-row__line">
        <button type="button" className="task-row__open" onClick={() => onOpen(task)}>
          {task.title}
        </button>
        <UrgencyBadge urgency={urgency} />
      </div>
      <div className="task-row__meta">
        <span className="task-row__fact">
          <Icon as={BookOpen} size={16} />
          {task.course}
        </span>
        <span className="task-row__fact">
          <Icon as={Calendar} size={16} />
          {deadline ? (
            <time className="task-row__deadline" dateTime={task.deadline}>
              {deadlineLabel}
            </time>
          ) : (
            deadlineLabel
          )}
        </span>
        {isDone ? null : <span className="task-row__status">{statusLabel}</span>}
      </div>
    </li>
  )
}

export default TaskRow
