import { STATUS_LABELS, TASK_STATUS } from '../utils/constants.js'
import { formatDeadline, parseDeadline } from '../utils/date.js'
import { getUrgency } from '../utils/urgency.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import './TaskRow.css'

// One row of the list. Presentational: it reads the task and renders it, and
// urgency is derived here from the reference time, never read off the task.
export function TaskRow({ task, now }) {
  const deadline = parseDeadline(task.deadline)
  const deadlineLabel = formatDeadline(task.deadline)
  const statusLabel = STATUS_LABELS[task.status] ?? STATUS_LABELS[TASK_STATUS.TODO]

  return (
    <li className="task-row">
      <div className="task-row__main">
        <h3 className="task-row__title">{task.title}</h3>
        <p className="task-row__course">{task.course}</p>
      </div>
      <div className="task-row__meta">
        <p className="task-row__deadline">
          {deadline ? <time dateTime={task.deadline}>{deadlineLabel}</time> : deadlineLabel}
        </p>
        <UrgencyBadge urgency={getUrgency(task, now)} />
        <p className="task-row__status">{statusLabel}</p>
      </div>
    </li>
  )
}

export default TaskRow