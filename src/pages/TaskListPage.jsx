import Icon from '../components/Icon.jsx'
import { Check } from '../components/icons.js'
import TaskList from '../components/TaskList.jsx'
import { useTasks } from '../hooks/useTasks.js'
import './TaskListPage.css'

// Used when no add action is passed, so the button stays harmless.
const noop = () => {}

// The main screen. It owns no data logic: the hook holds the async state and
// the list component only renders it. App owns the page container and the main
// landmark, and the app name heading lives in TopBar.
export function TaskListPage({ onAddTask, onOpenTask, notice }) {
  const { tasks, status, error, isRefreshing, refresh } = useTasks()

  return (
    <div className="task-list-page">
      {notice ? (
        <p className="task-list-page__notice" role="status">
          <Icon as={Check} size={16} />
          {notice}
        </p>
      ) : null}
      <TaskList
        tasks={tasks}
        status={status}
        error={error}
        isRefreshing={isRefreshing}
        onAddTask={onAddTask ?? noop}
        onOpenTask={onOpenTask}
        onRefresh={refresh}
      />
    </div>
  )
}

export default TaskListPage
