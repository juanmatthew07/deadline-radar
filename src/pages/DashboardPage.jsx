import { useMemo } from 'react'
import CourseProgress from '../components/CourseProgress.jsx'
import Icon from '../components/Icon.jsx'
import { ClipboardList, Plus, TriangleAlert } from '../components/icons.js'
import SummaryTiles from '../components/SummaryTiles.jsx'
import UpcomingList from '../components/UpcomingList.jsx'
import WorkloadChart from '../components/WorkloadChart.jsx'
import { useTasks } from '../hooks/useTasks.js'
import { formatLongDate } from '../utils/date.js'
import {
  getCompletion,
  getCourseProgress,
  getUpcomingTasks,
  getWorkload,
} from '../utils/stats.js'
import './DashboardPage.css'

// Used when no action is passed, so a card stays harmless.
const noop = () => {}

const LOADING_LABEL = 'Memuat ringkasan...'
const FAILED_TO_LOAD = 'Gagal memuat tugas.'
const RETRY_LABEL = 'Coba lagi'
const ADD_LABEL = 'Tambah tugas'
const EMPTY_TITLE = 'Belum ada tugas.'
const EMPTY_HINT = 'Tambah tugas pertamamu.'
const SUMMARY_TITLE = 'Ringkasan'
const UPCOMING_LIMIT = 5
const WORKLOAD_DAYS = 7

// The home screen: every stored task at a glance. It holds no data logic, so the
// hook owns the read and the numbers come from the pure helpers over all stored
// tasks, not over the filtered view of the list.
export function DashboardPage({ onAddTask = noop, onOpenTask, onViewAll }) {
  const { tasks, status, error, refresh } = useTasks()
  // One reference time per render, so the tiles, the three widgets and the date
  // line judge the same moment.
  const now = new Date()
  // The statistics are pure, so the three that depend on the tasks alone are
  // derived once per read. The workload follows the tiles instead and is judged
  // against this render, so its days and their counts never disagree.
  const upcoming = useMemo(() => getUpcomingTasks(tasks, UPCOMING_LIMIT), [tasks])
  const workload = getWorkload(tasks, now, WORKLOAD_DAYS)
  const courses = useMemo(() => getCourseProgress(tasks), [tasks])
  const completion = useMemo(() => getCompletion(tasks), [tasks])
  const message = error || FAILED_TO_LOAD

  if (status === 'loading') {
    return (
      <div className="dashboard-page">
        <p className="dashboard-page__loading" role="status">
          {LOADING_LABEL}
        </p>
        <ul className="dashboard-page__skeletons" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => (
            <li key={index} className="card dashboard-page__skeleton">
              <span className="dashboard-page__skeleton-label" />
              <span className="dashboard-page__skeleton-number" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Without a tile on screen there is nothing to keep, so a first failure takes
  // over the page and offers a retry.
  if (tasks.length === 0 && (status === 'error' || error)) {
    return (
      <div className="card dashboard-page__state" role="alert">
        <Icon as={TriangleAlert} size={32} className="dashboard-page__state-icon--danger" />
        <p className="dashboard-page__state-message">{message}</p>
        <button type="button" className="button button--secondary" onClick={refresh}>
          {RETRY_LABEL}
        </button>
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="card dashboard-page__state">
        <Icon as={ClipboardList} size={32} className="dashboard-page__state-icon" />
        <p className="dashboard-page__state-title">{EMPTY_TITLE}</p>
        <p className="dashboard-page__state-hint">{EMPTY_HINT}</p>
        <button type="button" className="button button--primary" onClick={onAddTask}>
          <Icon as={Plus} />
          {ADD_LABEL}
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__head">
        <h2 className="dashboard-page__title" tabIndex={-1}>
          {SUMMARY_TITLE}
        </h2>
        <p className="dashboard-page__date">{formatLongDate(now)}</p>
      </div>
      {error ? (
        <div className="dashboard-page__notice" role="alert">
          <p className="dashboard-page__notice-message">{message}</p>
          <button type="button" className="button button--secondary" onClick={refresh}>
            {RETRY_LABEL}
          </button>
        </div>
      ) : null}
      <SummaryTiles tasks={tasks} now={now} />

      <div className="dashboard-page__widgets">
        <UpcomingList
          tasks={upcoming}
          now={now}
          onOpenTask={onOpenTask}
          onViewAll={onViewAll}
        />
        <WorkloadChart days={workload} />
        <CourseProgress courses={courses} completion={completion} />
      </div>
    </div>
  )
}

export default DashboardPage