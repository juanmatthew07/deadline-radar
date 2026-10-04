import TaskList from '../components/TaskList.jsx'
import { useTasks } from '../hooks/useTasks.js'
import './TaskListPage.css'

// Used when no add action is passed, so the button stays harmless.
const noop = () => {}

// The main screen. It owns no data logic: the hook holds the async state and
// the list component only renders it. The full top bar arrives in M5.
export function TaskListPage({ onAddTask }) {
  const { tasks, status, error, isRefreshing, refresh } = useTasks()

  return (
    <main className="task-list-page">
      <header className="task-list-page__header">
        <h1 className="task-list-page__title">DeadlineRadar</h1>
      </header>
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