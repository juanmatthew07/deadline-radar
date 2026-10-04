import { useState } from 'react'
import TopBar from './components/TopBar.jsx'
import TaskFormPage from './pages/TaskFormPage.jsx'
import TaskListPage from './pages/TaskListPage.jsx'

const LIST_VIEW = { name: 'list' }
const SAVED_NOTICE = 'Tugas disimpan.'

// View switching is local state, not a router. The top bar and the notice live
// here so both screens share them.
function App() {
  const [view, setView] = useState(LIST_VIEW)
  const [notice, setNotice] = useState('')
  const isListView = view.name === 'list'

  function openCreateForm() {
    // The notice belongs to the list, so it goes away as the form opens.
    setNotice('')
    // A task is passed here in edit mode, which a row opens in M6.
    setView({ name: 'form' })
  }

  function closeForm() {
    setNotice('')
    setView(LIST_VIEW)
  }

  function handleSaved() {
    setNotice(SAVED_NOTICE)
    setView(LIST_VIEW)
  }

  return (
    <>
      <TopBar onAddTask={openCreateForm} showAdd={isListView} />
      {isListView ? (
        <TaskListPage onAddTask={openCreateForm} notice={notice} />
      ) : (
        <TaskFormPage
          key={view.task?.id ?? 'new'}
          task={view.task}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      )}
    </>
  )
}

export default App
