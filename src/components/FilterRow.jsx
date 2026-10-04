import { useId } from 'react'
import { FILTER_ALL, SORT, SORT_LABELS, STATUS_LABELS, TASK_STATUS } from '../utils/constants.js'
import Icon from './Icon.jsx'
import { Search } from './icons.js'
import './FilterRow.css'

const SEARCH_LANDMARK_LABEL = 'Cari dan filter tugas'
const SEARCH_LABEL = 'Cari tugas'
const SEARCH_HINT = 'Judul atau mata kuliah'
const STATUS_LABEL = 'Status'
const COURSE_LABEL = 'Mata kuliah'
const SORT_LABEL = 'Urutkan'
const ALL_STATUS_LABEL = 'Semua status'
const ALL_COURSE_LABEL = 'Semua mata kuliah'

// The three statuses in the order the select shows them, not in key order.
const STATUS_VALUES = [TASK_STATUS.TODO, TASK_STATUS.IN_PROGRESS, TASK_STATUS.DONE]
const SORT_VALUES = [SORT.DEADLINE_ASC, SORT.DEADLINE_DESC]

// The search field and the three selects. Presentational: it reads the filter
// state and writes it back through the setters it was given, and every control
// has a visible label, so the row works without a placeholder to lean on.
export function FilterRow({ filters, courses, effectiveCourse }) {
  // One prefix per row, so every label stays linked to its own control.
  const idPrefix = useId()
  const searchId = `${idPrefix}search`
  const statusId = `${idPrefix}status`
  const courseId = `${idPrefix}course`
  const sortId = `${idPrefix}sort`

  return (
    <div className="card filter-row" role="search" aria-label={SEARCH_LANDMARK_LABEL}>
      <div className="filter-row__field filter-row__field--search">
        <label className="filter-row__label" htmlFor={searchId}>
          {SEARCH_LABEL}
        </label>
        <div className="filter-row__box">
          <Icon as={Search} size={16} className="filter-row__icon" />
          <input
            className="filter-row__input"
            id={searchId}
            type="search"
            autoComplete="off"
            placeholder={SEARCH_HINT}
            value={filters.searchInput}
            onChange={(event) => filters.setSearchInput(event.target.value)}
          />
        </div>
      </div>

      <div className="filter-row__field">
        <label className="filter-row__label" htmlFor={statusId}>
          {STATUS_LABEL}
        </label>
        <select
          className="filter-row__select"
          id={statusId}
          value={filters.status}
          onChange={(event) => filters.setStatus(event.target.value)}
        >
          <option value={FILTER_ALL}>{ALL_STATUS_LABEL}</option>
          {STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row__field">
        <label className="filter-row__label" htmlFor={courseId}>
          {COURSE_LABEL}
        </label>
        <select
          className="filter-row__select"
          id={courseId}
          value={effectiveCourse}
          onChange={(event) => filters.setCourse(event.target.value)}
        >
          <option value={FILTER_ALL}>{ALL_COURSE_LABEL}</option>
          {courses.map((course) => (
            <option key={course} value={course}>
              {course}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-row__field">
        <label className="filter-row__label" htmlFor={sortId}>
          {SORT_LABEL}
        </label>
        <select
          className="filter-row__select"
          id={sortId}
          value={filters.sort}
          onChange={(event) => filters.setSort(event.target.value)}
        >
          {SORT_VALUES.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default FilterRow