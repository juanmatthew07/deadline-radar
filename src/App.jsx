import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import { useTaskFilters } from './hooks/useTaskFilters.js'
import DashboardPage from './pages/DashboardPage.jsx'
import TaskDetailPage from './pages/TaskDetailPage.jsx'
import TaskFormPage from './pages/TaskFormPage.jsx'
import TaskListPage from './pages/TaskListPage.jsx'

const DASHBOARD_VIEW = { name: 'dashboard' }
const LIST_VIEW = { name: 'list' }
const SAVED_NOTICE = 'Tugas disimpan.'
const DELETED_NOTICE = 'Tugas dihapus.'

// A section and the screen it shows. Only the two top level ones need a view of
// their own; the task screens return to the section they were opened from.
function sectionView(section) {
  return section === 'dashboard' ? DASHBOARD_VIEW : LIST_VIEW
}

// View switching is local state, not a router. The top bar and the notice live
// here so every screen shares them.
function App() {
  // The dashboard is the home screen, so the app opens on the overview.
  const [view, setView] = useState(DASHBOARD_VIEW)
  const [notice, setNotice] = useState('')
  // App is never unmounted between views, so the search and the filters survive
  // opening a task or the form and coming back. Nothing is stored, so a reload
  // starts from the defaults again.
  const filters = useTaskFilters()
  const isDashboardView = view.name === 'dashboard'
  const isListView = view.name === 'list'
  const isDetailView = view.name === 'detail'
  // A task screen belongs to a section, so one tab stays marked while it is open.
  const activeSection = isDashboardView ? 'dashboard' : 'tasks'
  const from = view.from ?? 'list'

  function navigate(section) {
    // The notice belongs to the list, so it goes away as another section opens.
    setNotice('')
    setView(sectionView(section))
  }

  function openCreateForm() {
    // The notice belongs to the list, so it goes away as the form opens. The
    // screen it was opened from comes along, so Batal returns there.
    setNotice('')
    setView({ name: 'form', from: isDashboardView ? 'dashboard' : 'list' })
  }

  // A row opens its task, and the same handler serves the detail screen.
  function openTask(task) {
    setNotice('')
    setView({ name: 'detail', task, from: 'list' })
  }

  // Editing starts from the task on screen, so the form gets it and the way back
  // stays the same as it was.
  function openEditForm(task) {
    setNotice('')
    setView({ name: 'form', task, from })
  }

  // The form goes back where it came from: the detail screen in edit mode, the
  // screen it was opened from in create mode.
  function closeForm() {
    setNotice('')
    setView(view.task ? { name: 'detail', task: view.task, from } : sectionView(from))
  }

  function closeDetail() {
    setNotice('')
    setView(sectionView(view.from))
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
      <TopBar
        onAddTask={openCreateForm}
        showAdd={isDashboardView || isListView}
        activeSection={activeSection}
        onNavigate={navigate}
      />
      <main className="container page">
        {isDashboardView ? (
          <DashboardPage onAddTask={openCreateForm} />
        ) : isListView ? (
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