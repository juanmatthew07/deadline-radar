import Icon from './Icon.jsx'
import { ClipboardList, Plus, TriangleAlert } from './icons.js'
import TaskRow from './TaskRow.jsx'
import './TaskList.css'

const LOADING_LABEL = 'Memuat tugas...'
const REFRESHING_LABEL = 'Memuat ulang...'
const FAILED_TO_LOAD = 'Gagal memuat tugas.'
const RETRY_LABEL = 'Coba lagi'
const ADD_LABEL = 'Tambah tugas'
const EMPTY_TITLE = 'Belum ada tugas.'
const EMPTY_HINT = 'Tambah tugas pertamamu.'

// Used when no open action is passed, so a card stays harmless.
const noop = () => {}

// The four states of the main screen: loading, error with retry, empty with one
// action, or the cards in the order the service returned them. Sorting and
// filtering arrive in a later milestone, so this component only renders.
export function TaskList({
  tasks,
  status,
  error,
  isRefreshing,
  onAddTask,
  onOpenTask = noop,
  onRefresh,
}) {
  // One reference time per render, so every card judges urgency against the
  // same moment instead of drifting between cards.
  const now = new Date()
  const message = error || FAILED_TO_LOAD

  if (status === 'loading') {
    return (
      <div className="task-list">
        <p className="task-list__loading" role="status">
          {LOADING_LABEL}
        </p>
        <ul className="task-list__skeletons" aria-hidden="true">
          <li className="card task-list__skeleton">
            <span className="task-list__skeleton-title" />
            <span className="task-list__skeleton-meta" />
          </li>
          <li className="card task-list__skeleton">
            <span className="task-list__skeleton-title" />
            <span className="task-list__skeleton-meta" />
          </li>
          <li className="card task-list__skeleton">
            <span className="task-list__skeleton-title" />
            <span className="task-list__skeleton-meta" />
          </li>
        </ul>
      </div>
    )
  }

  // Without a card on screen there is nothing to keep, so a failure takes over
  // the whole list and offers a retry.
  if (tasks.length === 0 && (status === 'error' || error)) {
    return (
      <div className="card task-list__state" role="alert">
        <Icon
          as={TriangleAlert}
          size={32}
          className="task-list__state-icon task-list__state-icon--danger"
        />
        <p className="task-list__state-message">{message}</p>
        <button type="button" className="button button--secondary" onClick={onRefresh}>
          {RETRY_LABEL}
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="card task-list__state">
        <Icon as={ClipboardList} size={32} className="task-list__state-icon" />
        <p className="task-list__state-title">{EMPTY_TITLE}</p>
        <p className="task-list__state-hint">{EMPTY_HINT}</p>
        <button type="button" className="button button--primary" onClick={onAddTask}>
          <Icon as={Plus} />
          {ADD_LABEL}
        </button>
      </div>
    )
  }

  return (
    <div className="task-list" aria-busy={isRefreshing}>
      {error ? (
        <div className="task-list__notice" role="alert">
          <p className="task-list__notice-message">{message}</p>
          <button type="button" className="button button--secondary" onClick={onRefresh}>
            {RETRY_LABEL}
          </button>
        </div>
      ) : null}
      {isRefreshing ? (
        <p className="visually-hidden" role="status">
          {REFRESHING_LABEL}
        </p>
      ) : null}
      <ul className="task-list__items">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} now={now} onOpen={onOpenTask} />
        ))}
      </ul>
    </div>
  )
}

export default TaskList
