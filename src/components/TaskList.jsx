import TaskRow from './TaskRow.jsx'
import './TaskList.css'

const LOADING_LABEL = 'Memuat tugas...'
const FAILED_TO_LOAD = 'Gagal memuat tugas.'

// The four states of the main screen: loading, error with retry, empty with one
// action, or the rows in the order the service returned them. Sorting and
// filtering arrive in a later milestone, so this component only renders.
export function TaskList({ tasks, status, error, isRefreshing, onAddTask, onRefresh }) {
  // One reference time per render, so every row judges urgency against the
  // same moment instead of drifting between rows.
  const now = new Date()
  const message = error || FAILED_TO_LOAD

  if (status === 'loading') {
    return (
      <div className="task-list">
        <p className="task-list__message" role="status">
          {LOADING_LABEL}
        </p>
        <ul className="task-list__skeletons" aria-hidden="true">
          <li className="task-list__skeleton" />
          <li className="task-list__skeleton" />
          <li className="task-list__skeleton" />
        </ul>
      </div>
    )
  }

  // Without a row on screen there is nothing to keep, so a failure takes over
  // the whole list and offers a retry.
  if (tasks.length === 0 && (status === 'error' || error)) {
    return (
      <div className="task-list__state" role="alert">
        <p className="task-list__message">{message}</p>
        <button type="button" className="task-list__action" onClick={onRefresh}>
          Coba lagi
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="task-list__state">
        <p className="task-list__message">Belum ada tugas.</p>
        <p className="task-list__hint">Tambah tugas pertamamu.</p>
        <button type="button" className="task-list__action" onClick={onAddTask}>
          Tambah tugas
        </button>
      </div>
    )
  }

  return (
    <div className="task-list" aria-busy={isRefreshing}>
      {error ? (
        <div className="task-list__notice" role="alert">
          <p className="task-list__message">{message}</p>
          <button type="button" className="task-list__action" onClick={onRefresh}>
            Coba lagi
          </button>
        </div>
      ) : null}
      {isRefreshing ? (
        <p className="visually-hidden" role="status">
          Memuat ulang...
        </p>
      ) : null}
      <ul className="task-list__items">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} now={now} />
        ))}
      </ul>
    </div>
  )
}

export default TaskList