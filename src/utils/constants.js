// Allowed values for a Task. Every object here is frozen so no layer can
// widen the contract by accident.
export const TASK_STATUS = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
})

export const TASK_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
})

// Urgency is derived at render time, never stored on a task.
export const URGENCY = Object.freeze({
  OVERDUE: 'overdue',
  DUE_TODAY: 'due_today',
  THIS_WEEK: 'this_week',
  LATER: 'later',
  DONE: 'done',
})

export const STATUS_LABELS = Object.freeze({
  [TASK_STATUS.TODO]: 'Belum',
  [TASK_STATUS.IN_PROGRESS]: 'Dikerjakan',
  [TASK_STATUS.DONE]: 'Selesai',
})

export const PRIORITY_LABELS = Object.freeze({
  [TASK_PRIORITY.LOW]: 'Rendah',
  [TASK_PRIORITY.MEDIUM]: 'Sedang',
  [TASK_PRIORITY.HIGH]: 'Tinggi',
})

export const URGENCY_LABELS = Object.freeze({
  [URGENCY.OVERDUE]: 'Terlambat',
  [URGENCY.DUE_TODAY]: 'Hari ini',
  [URGENCY.THIS_WEEK]: 'Minggu ini',
  [URGENCY.LATER]: 'Nanti',
  [URGENCY.DONE]: 'Selesai',
})

export const TITLE_MAX_LENGTH = 120
export const COURSE_MAX_LENGTH = 80
export const DESCRIPTION_MAX_LENGTH = 1000

export const DEFAULT_STATUS = TASK_STATUS.TODO
export const DEFAULT_PRIORITY = TASK_PRIORITY.MEDIUM

// The one value of the status and course filters that keeps every task.
export const FILTER_ALL = 'all'

// Deadline is the only sort key of the list, in both directions.
export const SORT = Object.freeze({
  DEADLINE_ASC: 'deadline_asc',
  DEADLINE_DESC: 'deadline_desc',
})

export const SORT_LABELS = Object.freeze({
  [SORT.DEADLINE_ASC]: 'Tenggat terdekat',
  [SORT.DEADLINE_DESC]: 'Tenggat terjauh',
})

// Search, filters, and sort in one object: the shape applyQuery reads. It is
// frozen, so a caller spreads it instead of writing into the default.
export const DEFAULT_QUERY = Object.freeze({
  search: '',
  status: FILTER_ALL,
  course: FILTER_ALL,
  sort: SORT.DEADLINE_ASC,
})

// The search text has to settle before the list is filtered again.
export const SEARCH_DEBOUNCE_MS = 250