import { formatDeadline } from '../utils/date.js'
import { getUrgency } from '../utils/urgency.js'
import Icon from './Icon.jsx'
import { BookOpen, Calendar } from './icons.js'
import UrgencyBadge from './UrgencyBadge.jsx'
import './UpcomingList.css'

const TITLE = 'Deadline terdekat'
const EMPTY_LABEL = 'Tidak ada tugas yang menunggu.'
const VIEW_ALL_LABEL = 'Lihat semua tugas'

// Used when no handler is passed, so a row and the footer stay harmless.
const noop = () => {}

// The deadlines that are still ahead, nearest first. Presentational: the list is
// already limited and sorted by the page, and urgency is derived here from the
// reference time, never read off the task. The title control stretches over the
// whole row, so the row is the click and the focus target.
export function UpcomingList({ tasks, now, onOpenTask = noop, onViewAll = noop }) {
  return (
    <section className="card upcoming-list">
      <h3 className="upcoming-list__title">{TITLE}</h3>

      {tasks.length === 0 ? (
        <p className="upcoming-list__empty">{EMPTY_LABEL}</p>
      ) : (
        <ul className="upcoming-list__items">
          {tasks.map((task) => (
            <li key={task.id} className="upcoming-list__item">
              <div className="upcoming-list__line">
                <button
                  type="button"
                  className="upcoming-list__open"
                  onClick={() => onOpenTask(task)}
                >
                  {task.title}
                </button>
                <UrgencyBadge urgency={getUrgency(task, now)} />
              </div>
              <p className="upcoming-list__meta">
                <span className="upcoming-list__fact">
                  <Icon as={BookOpen} size={16} />
                  {task.course}
                </span>
                <span className="upcoming-list__fact">
                  <Icon as={Calendar} size={16} />
                  <time className="upcoming-list__deadline" dateTime={task.deadline}>
                    {formatDeadline(task.deadline)}
                  </time>
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="button button--secondary upcoming-list__more"
        onClick={onViewAll}
      >
        {VIEW_ALL_LABEL}
      </button>
    </section>
  )
}

export default UpcomingList