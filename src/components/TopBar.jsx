import './TopBar.css'

const APP_NAME = 'DeadlineRadar'
const ADD_LABEL = 'Tambah tugas'

// The app name on the left and the one add action on the right. The bar holds
// no task state; the search field arrives in M7 next to the name.
export function TopBar({ onAddTask, showAdd = false }) {
  return (
    <header className="top-bar">
      <h1 className="top-bar__title">{APP_NAME}</h1>
      {showAdd ? (
        <button type="button" className="button button--primary" onClick={onAddTask}>
          {ADD_LABEL}
        </button>
      ) : null}
    </header>
  )
}

export default TopBar
