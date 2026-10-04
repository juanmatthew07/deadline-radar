import { useMemo } from 'react'
import FilterRow from '../components/FilterRow.jsx'
import Icon from '../components/Icon.jsx'
import { Check, X } from '../components/icons.js'
import TaskList from '../components/TaskList.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { applyQuery, getCourseOptions } from '../services/taskService.js'
import { FILTER_ALL } from '../utils/constants.js'
import './TaskListPage.css'

// Used when no add action is passed, so the button stays harmless.
const noop = () => {}

const RESET_LABEL = 'Atur ulang'

// The main screen. It owns no data logic: the hook holds the async state, the
// service owns the query rules, and the list component only renders what is
// handed to it. App owns the page container and the main landmark, the app name
// heading lives in TopBar, and the filter state is App's, so it survives the
// other views.
export function TaskListPage({ filters, onAddTask, onOpenTask, notice }) {
  const { tasks, status, error, isRefreshing, refresh } = useTasks()

  const courses = useMemo(() => getCourseOptions(tasks), [tasks])

  // The course select lists what is stored now, so a selected course whose last
  // task is gone falls back to "all" by itself, without an effect.
  const effectiveCourse = useMemo(() => {
    const selected = filters.course
    if (selected === FILTER_ALL) return selected
    return courses.some((course) => course.toLowerCase() === selected.toLowerCase())
      ? selected
      : FILTER_ALL
  }, [courses, filters.course])

  const visibleTasks = useMemo(
    () => applyQuery(tasks, { ...filters.query, course: effectiveCourse }),
    [tasks, filters.query, effectiveCourse],
  )

  // Nothing to search, filter, or sort until the read succeeds with tasks in it.
  const hasToolbar = status === 'ready' && tasks.length > 0
  const noMatch = tasks.length > 0 && visibleTasks.length === 0
  const resultText =
    visibleTasks.length === tasks.length
      ? `${tasks.length} tugas`
      : `Menampilkan ${visibleTasks.length} dari ${tasks.length} tugas`
  // The empty result has its own state with its own action, so it does not need
  // a second reset button next to the count.
  const canReset = !filters.isDefault && visibleTasks.length > 0

  return (
    <div className="task-list-page">
      {notice ? (
        <p className="task-list-page__notice" role="status">
          <Icon as={Check} size={16} />
          {notice}
        </p>
      ) : null}
      {hasToolbar ? (
        <>
          <FilterRow filters={filters} courses={courses} effectiveCourse={effectiveCourse} />
          <div className="task-list-page__result-bar">
            <p className="task-list-page__result" aria-live="polite">
              {resultText}
            </p>
            {canReset ? (
              <button type="button" className="button button--secondary" onClick={filters.reset}>
                <Icon as={X} size={16} />
                {RESET_LABEL}
              </button>
            ) : null}
          </div>
        </>
      ) : null}
      <TaskList
        tasks={visibleTasks}
        status={status}
        error={error}
        isRefreshing={isRefreshing}
        noMatch={noMatch}
        onAddTask={onAddTask ?? noop}
        onOpenTask={onOpenTask}
        onRefresh={refresh}
        onResetFilters={filters.reset}
      />
    </div>
  )
}

export default TaskListPage