import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import { useTaskFilters } from './hooks/useTaskFilters.js'
import TaskDetailPage from './pages/TaskDetailPage.jsx'
import TaskFormPage from './pages/TaskFormPage.jsx'
import TaskListPage from './pages/TaskListPage.jsx'

const LIST_VIEW = { name: 'list' }
const SAVED_NOTICE = 'Tugas disimpan.'
const DELETED_NOTICE = 'Tugas dihapus.'

// View switching is local state, not a router. The top bar and the notice live
// here so both screens share them.
function App() {
  const [view, setView] = useState(LIST_VIEW)
  const [notice, setNotice] = useState('')
  // App is never unmounted between views, so the search and the filters survive
  // opening a task or the form and coming back. Nothing is stored, so a reload
  // starts from the defaults again.
  const filters = useTaskFilters()
  const isListView = view.name === 'list'
  const isDetailView = view.name === 'detail'

  function openCreateForm() {
    // The notice belongs to the list, so it goes away as the form opens.
    setNotice('')
    setView({ name: 'form' })
  }

  // A row opens its task, and the same handler serves the detail screen.
  function openTask(task) {
    setNotice('')
    setView({ name: 'detail', task })
  }

  // Editing starts from the task on screen, so the form gets it.
  function openEditForm(task) {
    setNotice('')
    setView({ name: 'form', task })
  }

  // The form goes back where it came from: the detail screen in edit mode, the
  // list after a new task was started from there.
  function closeForm() {
    setNotice('')
    setView(view.task ? { name: 'detail', task: view.task } : LIST_VIEW)
  }

  function closeDetail() {
    setNotice('')
    setView(LIST_VIEW)
  }

  function handleSaved() {
    setNotice(SAVED_NOTICE)
    setView(LIST_VIEW)
  }

  // The list reloads as it mounts, so it can show the empty state next to the
  // notice after the last task is gone.
  function handleDeleted() {
    setNotice(DELETED_NOTICE)
    setView(LIST_VIEW)
  }

  return (
    <>
      <TopBar onAddTask={openCreateForm} showAdd={isListView} />
      <main className="container page">
        {isListView ? (
          <TaskListPage
            filters={filters}
            onAddTask={openCreateForm}
            onOpenTask={openTask}
            notice={notice}
          />
        ) : isDetailView ? (
          <TaskDetailPage
            task={view.task}
            onEdit={openEditForm}
            onBack={closeDetail}
            onDeleted={handleDeleted}
          />
        ) : (
          <TaskFormPage
            key={view.task?.id ?? 'new'}
            task={view.task}
            onSaved={handleSaved}
            onCancel={closeForm}
          />
        )}
      </main>
    </>
  )
}

export default App