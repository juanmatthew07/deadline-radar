import './TopBar.css'
import Icon from './Icon.jsx'
import { Plus } from './icons.js'

const APP_NAME = 'DeadlineRadar'
const ADD_LABEL = 'Tambah tugas'

// The app name on the left and the one add action on the right, inside the page
// container. The bar holds no task state; the search field arrives in M7 next to
// the name.
export function TopBar({ onAddTask, showAdd = false }) {
  return (
    <header className="top-bar">
      <div className="container top-bar__inner">
        <h1 className="top-bar__title">{APP_NAME}</h1>
        {showAdd ? (
          <button type="button" className="button button--primary" onClick={onAddTask}>
            <Icon as={Plus} />
            {ADD_LABEL}
          </button>
        ) : null}
      </div>
    </header>
  )
}

export default TopBar
