import TaskList from '../components/TaskList.jsx'
import { useTasks } from '../hooks/useTasks.js'
import './TaskListPage.css'

// Used when no add action is passed, so the button stays harmless.
const noop = () => {}

// The main screen. It owns no data logic: the hook holds the async state and
// the list component only renders it. The app name heading lives in TopBar.
export function TaskListPage({ onAddTask, notice }) {
  const { tasks, status, error, isRefreshing, refresh } = useTasks()

  return (
    <main className="task-list-page">
      {notice ? (
        <p className="task-list-page__notice" role="status">
          {notice}
        </p>
      ) : null}
      <TaskList
        tasks={tasks}
        status={status}
        error={error}
        isRefreshing={isRefreshing}
        onAddTask={onAddTask ?? noop}
        onRefresh={refresh}
      />
    </main>
  )
}

export default TaskListPage
