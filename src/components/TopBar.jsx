import './TopBar.css'
import Icon from './Icon.jsx'
import { Plus } from './icons.js'

const APP_NAME = 'DeadlineRadar'
const ADD_LABEL = 'Tambah tugas'
const NAV_LABEL = 'Navigasi utama'

// The two sections of the app, in reading order. The tabs are text, never icons.
const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tugas' },
]

// The app name, the navigation tabs, and the one add action, inside the page
// container. The bar holds no task state and no view state: it is told which
// section is active and reports the section a tab was clicked for. The tabs only
// appear when a navigation handler is passed.
export function TopBar({ onAddTask, showAdd = false, activeSection, onNavigate }) {
  return (
    <header className="top-bar">
      <div className="container top-bar__inner">
        <h1 className="top-bar__title">{APP_NAME}</h1>
        {onNavigate ? (
          <nav className="top-bar__nav" aria-label={NAV_LABEL}>
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className="top-bar__tab"
                aria-current={activeSection === section.id ? 'page' : undefined}
                onClick={() => onNavigate(section.id)}
              >
                {section.label}
              </button>
            ))}
          </nav>
        ) : null}
        {showAdd ? (
          <button
            type="button"
            className="button button--primary top-bar__add"
            onClick={onAddTask}
          >
            <Icon as={Plus} />
            {ADD_LABEL}
          </button>
        ) : null}
      </div>
    </header>
  )
}

export default TopBar