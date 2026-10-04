import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITY, TASK_STATUS } from '../utils/constants.js'
import { formatDeadline, formatTimestamp, parseDeadline } from '../utils/date.js'
import { getUrgency } from '../utils/urgency.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import './TaskDetail.css'

const COURSE_LABEL = 'Mata kuliah'
const DEADLINE_LABEL = 'Tenggat'
const URGENCY_LABEL = 'Urgensi'
const PRIORITY_LABEL = 'Prioritas'
const STATUS_LABEL = 'Status'
const DESCRIPTION_LABEL = 'Deskripsi'
const CREATED_LABEL = 'Dibuat'
const UPDATED_LABEL = 'Diubah'

const NO_DESCRIPTION = 'Tidak ada deskripsi.'
const EDIT_LABEL = 'Ubah'
const DELETE_LABEL = 'Hapus'
const BACK_LABEL = 'Kembali'

// One task in full. Presentational: it renders what the page hands it and calls
// back on the three actions. Urgency is derived here from the reference time,
// never read off the task, and the timestamps are formatted here as well.
export function TaskDetail({ task, now = new Date(), onEdit, onDelete, onBack }) {
  const deadline = parseDeadline(task.deadline)
  const deadlineLabel = formatDeadline(task.deadline)
  const description = typeof task.description === 'string' ? task.description.trim() : ''
  const priorityLabel = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS[TASK_PRIORITY.MEDIUM]
  const statusLabel = STATUS_LABELS[task.status] ?? STATUS_LABELS[TASK_STATUS.TODO]

  return (
    <section className="task-detail">
      <h2 className="task-detail__title" tabIndex={-1}>
        {task.title}
      </h2>

      <dl className="task-detail__list">
        <div className="task-detail__pair">
          <dt className="task-detail__term">{COURSE_LABEL}</dt>
          <dd className="task-detail__value">{task.course}</dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{DEADLINE_LABEL}</dt>
          <dd className="task-detail__value task-detail__date">
            {deadline ? <time dateTime={task.deadline}>{deadlineLabel}</time> : deadlineLabel}
          </dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{URGENCY_LABEL}</dt>
          <dd className="task-detail__value">
            <UrgencyBadge urgency={getUrgency(task, now)} />
          </dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{PRIORITY_LABEL}</dt>
          <dd className="task-detail__value">{priorityLabel}</dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{STATUS_LABEL}</dt>
          <dd className="task-detail__value">{statusLabel}</dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{DESCRIPTION_LABEL}</dt>
          <dd className="task-detail__value task-detail__description">
            {description || NO_DESCRIPTION}
          </dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{CREATED_LABEL}</dt>
          <dd className="task-detail__value task-detail__date">{formatTimestamp(task.createdAt)}</dd>
        </div>

        <div className="task-detail__pair">
          <dt className="task-detail__term">{UPDATED_LABEL}</dt>
          <dd className="task-detail__value task-detail__date">{formatTimestamp(task.updatedAt)}</dd>
        </div>
      </dl>

      <div className="task-detail__actions">
        <button type="button" className="button button--secondary" onClick={() => onEdit(task)}>
          {EDIT_LABEL}
        </button>
        <button type="button" className="button button--danger" onClick={onDelete}>
          {DELETE_LABEL}
        </button>
        <button type="button" className="button button--secondary" onClick={onBack}>
          {BACK_LABEL}
        </button>
      </div>
    </section>
  )
}

export default TaskDetail