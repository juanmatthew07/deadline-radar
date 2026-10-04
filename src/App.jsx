import TaskListPage from './pages/TaskListPage.jsx'

// The add form arrives in M5, so this action has no destination yet.
function handleAddTask() {}

function App() {
  return <TaskListPage onAddTask={handleAddTask} />
}

export default App