import { TASK_STATUS, URGENCY } from './constants.js'
import { addDays, isSameLocalDay, parseDeadline, startOfLocalDay } from './date.js'

// How many calendar days after today still count as "Minggu ini".
const THIS_WEEK_DAYS = 7

// Urgency is always derived here, never read from or written to a task.
export function getUrgency(task, now = new Date()) {
  if (task?.status === TASK_STATUS.DONE) return URGENCY.DONE
  const deadline = parseDeadline(task?.deadline)
  if (!deadline) return URGENCY.LATER
  if (deadline.getTime() < now.getTime()) return URGENCY.OVERDUE
  if (isSameLocalDay(deadline, now)) return URGENCY.DUE_TODAY
  const weekEnd = addDays(startOfLocalDay(now), THIS_WEEK_DAYS + 1)
  if (deadline.getTime() < weekEnd.getTime()) return URGENCY.THIS_WEEK
  return URGENCY.LATER
}

// Every urgency key is always present, so a zero count exists even when empty.
export function countByUrgency(tasks, now = new Date()) {
  const counts = {
    [URGENCY.OVERDUE]: 0,
    [URGENCY.DUE_TODAY]: 0,
    [URGENCY.THIS_WEEK]: 0,
    [URGENCY.LATER]: 0,
    [URGENCY.DONE]: 0,
  }
  if (!Array.isArray(tasks)) return counts
  for (const task of tasks) {
    counts[getUrgency(task, now)] += 1
  }
  return counts
}

// The labels live in constants.js; re-exported here for the documented module.
export { URGENCY_LABELS } from './constants.js'