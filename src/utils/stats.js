import { TASK_STATUS } from './constants.js'
import { addDays, isSameLocalDay, parseDeadline, startOfLocalDay } from './date.js'

// Dashboard statistics. Pure functions over a list of tasks: no React, no
// storage, no clock of their own. Nothing here is ever stored, and no input is
// mutated, so a caller can hand in the very array it keeps rendering.
const DEFAULT_UPCOMING_LIMIT = 5
const DEFAULT_WORKLOAD_DAYS = 7

// Anything that is not a list is read as no tasks at all, so a repaired or
// missing value never throws inside a render.
function toList(tasks) {
  return Array.isArray(tasks) ? tasks : []
}

// The day key of a local day, built from the local year, month, and day parts,
// never from UTC ones, which would land on the wrong day east of Greenwich.
function toLocalDayKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

// A done task is finished whatever its deadline says, and a task without a
// parseable deadline cannot be placed on a day or in a sort.
function isOpen(task) {
  return task?.status !== TASK_STATUS.DONE && parseDeadline(task?.deadline) !== null
}

// createdAt is an instant, so it is compared as one. An unusable value counts as
// the oldest, which keeps the order total without inventing a date.
function compareInstants(a, b) {
  const parsedA = Date.parse(a)
  const parsedB = Date.parse(b)
  const left = Number.isNaN(parsedA) ? Number.NEGATIVE_INFINITY : parsedA
  const right = Number.isNaN(parsedB) ? Number.NEGATIVE_INFINITY : parsedB
  if (left === right) return 0
  return left < right ? -1 : 1
}

function compareUpcoming(a, b) {
  const byDeadline =
    parseDeadline(a.deadline).getTime() - parseDeadline(b.deadline).getTime()
  if (byDeadline !== 0) return byDeadline
  return compareInstants(a.createdAt, b.createdAt) || compareIds(a.id, b.id)
}

function compareIds(a, b) {
  const left = String(a ?? '')
  const right = String(b ?? '')
  if (left === right) return 0
  return left < right ? -1 : 1
}

// The tasks still to do, soonest deadline first, so an overdue one leads. filter
// builds the new array that is then sorted, so the list the caller holds is never
// reordered.
export function getUpcomingTasks(tasks, limit = DEFAULT_UPCOMING_LIMIT) {
  const size =
    Number.isInteger(limit) && limit >= 0 ? limit : DEFAULT_UPCOMING_LIMIT
  return toList(tasks)
    .filter(isOpen)
    .sort(compareUpcoming)
    .slice(0, size)
}

// One entry per day for the next stretch, today included, with the number of open
// tasks that land on that local day. Overdue work is behind us, so it belongs to
// no day of this range.
export function getWorkload(tasks, now = new Date(), days = DEFAULT_WORKLOAD_DAYS) {
  const size =
    Number.isInteger(days) && days > 0 ? days : DEFAULT_WORKLOAD_DAYS
  const deadlines = toList(tasks)
    .filter(isOpen)
    .map((task) => parseDeadline(task.deadline))
  const firstDay = startOfLocalDay(now)

  return Array.from({ length: size }, (_, index) => {
    const date = addDays(firstDay, index)
    return {
      date,
      key: toLocalDayKey(date),
      count: deadlines.filter((deadline) => isSameLocalDay(deadline, date)).length,
    }
  })
}

// Per course progress. The same course typed in another case is one group, and
// the spelling that was stored first is the one shown.
export function getCourseProgress(tasks) {
  const groups = new Map()

  for (const task of toList(tasks)) {
    const course = typeof task?.course === 'string' ? task.course.trim() : ''
    if (course === '') continue

    const entry = groups.get(course.toLowerCase()) ?? { course, total: 0, done: 0 }
    entry.total += 1
    if (task.status === TASK_STATUS.DONE) entry.done += 1
    groups.set(course.toLowerCase(), entry)
  }

  return Array.from(groups.values())
    .map(({ course, total, done }) => ({
      course,
      total,
      done,
      remaining: total - done,
      percent: Math.round((done / total) * 100),
    }))
    // What still needs doing leads, so the course that needs attention is first.
    .sort(
      (a, b) =>
        b.remaining - a.remaining ||
        a.course.localeCompare(b.course, 'id', { sensitivity: 'base' }),
    )
}

// How much of everything stored is done. No tasks means no progress, never a
// division by zero.
export function getCompletion(tasks) {
  const list = toList(tasks)
  const done = list.filter((task) => task?.status === TASK_STATUS.DONE).length

  return {
    total: list.length,
    done,
    percent: list.length === 0 ? 0 : Math.round((done / list.length) * 100),
  }
}