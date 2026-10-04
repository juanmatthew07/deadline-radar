import { createTask, updateTask } from '../models/task.js'
import { StorageError, taskRepository } from '../repository/taskRepository.js'
import {
  COURSE_MAX_LENGTH,
  DEFAULT_QUERY,
  DESCRIPTION_MAX_LENGTH,
  FILTER_ALL,
  SORT,
  TASK_PRIORITY,
  TASK_STATUS,
  TITLE_MAX_LENGTH,
} from '../utils/constants.js'
import { parseDeadline } from '../utils/date.js'

const TASK_NOT_FOUND = 'Tugas tidak ditemukan.'
const NOT_FOUND = 'not_found'

// Trimmed before every rule runs, and before the model builds the task.
const TEXT_FIELDS = ['title', 'course', 'description', 'deadline']

const PRIORITY_VALUES = Object.values(TASK_PRIORITY)
const STATUS_VALUES = Object.values(TASK_STATUS)
const SORT_VALUES = Object.values(SORT)

// Carries one message per field so a form can show them inline.
export class ValidationError extends Error {
  constructor(fieldErrors) {
    super('Data tugas tidak valid.')
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// A field that is not a string counts as empty, so it can never pass a rule.
function text(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isProvided(value) {
  return value !== undefined && value !== null
}

// Returns the trimmed values the rules actually checked, so storage holds
// exactly what was validated. An empty deadline stays null, not ''.
function toDraft(input) {
  const source = isPlainObject(input) ? input : {}
  const draft = { ...source }
  for (const field of TEXT_FIELDS) {
    draft[field] = text(source[field])
  }
  if (draft.deadline === '') draft.deadline = null
  return draft
}

// Pure and synchronous, so a form can call it on every keystroke. It never
// throws and never reads storage: the returned object is empty when valid.
export function validateTask(input) {
  const source = isPlainObject(input) ? input : {}
  const errors = {}

  const title = text(source.title)
  if (!title) {
    errors.title = 'Judul wajib diisi.'
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `Judul maksimal ${TITLE_MAX_LENGTH} karakter.`
  }

  const course = text(source.course)
  if (!course) {
    errors.course = 'Mata kuliah wajib diisi.'
  } else if (course.length > COURSE_MAX_LENGTH) {
    errors.course = `Mata kuliah maksimal ${COURSE_MAX_LENGTH} karakter.`
  }

  const description = text(source.description)
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Deskripsi maksimal ${DESCRIPTION_MAX_LENGTH} karakter.`
  }

  const deadline = text(source.deadline)
  if (!deadline) {
    errors.deadline = 'Tenggat wajib diisi.'
  } else if (!parseDeadline(deadline)) {
    errors.deadline = 'Format tenggat tidak valid.'
  }

  if (isProvided(source.priority) && !PRIORITY_VALUES.includes(source.priority)) {
    errors.priority = 'Prioritas tidak valid.'
  }

  if (isProvided(source.status) && !STATUS_VALUES.includes(source.status)) {
    errors.status = 'Status tidak valid.'
  }

  return errors
}

function assertValid(draft) {
  const fieldErrors = validateTask(draft)
  if (Object.keys(fieldErrors).length > 0) throw new ValidationError(fieldErrors)
}

export async function list() {
  return taskRepository.list()
}

export async function create(draft) {
  const input = toDraft(draft)
  assertValid(input)
  return taskRepository.create(createTask(input))
}

// Validation sees the merged task, so a partial change cannot leave an
// invalid combination behind.
export async function update(id, changes) {
  const existing = await taskRepository.getById(id)
  if (!existing) throw new StorageError(TASK_NOT_FOUND, NOT_FOUND)
  const patch = isPlainObject(changes) ? changes : {}
  const merged = toDraft({ ...existing, ...patch })
  assertValid(merged)
  return taskRepository.update(updateTask(existing, merged))
}

export async function remove(id) {
  return taskRepository.remove(id)
}

// Every query field that is not a string falls back to the default, and a sort
// direction outside SORT falls back too, because it cannot be honoured.
function normalizeQuery(input) {
  const source = isPlainObject(input) ? input : {}
  return {
    search: isProvided(source.search) ? text(source.search) : DEFAULT_QUERY.search,
    status: isProvided(source.status) ? text(source.status) : DEFAULT_QUERY.status,
    course: isProvided(source.course) ? text(source.course) : DEFAULT_QUERY.course,
    sort: SORT_VALUES.includes(source.sort) ? source.sort : DEFAULT_QUERY.sort,
  }
}

// The needle is already trimmed and lower-cased, and it matches the title or the
// course only. The description is deliberately not searched.
function matchesSearch(task, needle) {
  if (!needle) return true
  const title = text(task.title).toLowerCase()
  const course = text(task.course).toLowerCase()
  return title.includes(needle) || course.includes(needle)
}

function matchesQuery(task, query, needle, courseKey) {
  if (!isPlainObject(task)) return false
  if (!matchesSearch(task, needle)) return false
  if (query.status !== FILTER_ALL && task.status !== query.status) return false
  if (query.course !== FILTER_ALL && text(task.course).toLowerCase() !== courseKey) {
    return false
  }
  return true
}

// The moment of the deadline, or null when there is none to sort by.
function deadlineTime(task) {
  const parsed = parseDeadline(task?.deadline)
  return parsed ? parsed.getTime() : null
}

function createdTime(task) {
  const time = Date.parse(text(task?.createdAt))
  return Number.isNaN(time) ? 0 : time
}

// Unfinished work first in both directions, then the deadline, then the older
// task, so two tasks never change places between renders.
function compareTasks(direction) {
  return (a, b) => {
    const doneRank = Number(a.status === TASK_STATUS.DONE) - Number(b.status === TASK_STATUS.DONE)
    if (doneRank !== 0) return doneRank

    const left = deadlineTime(a)
    const right = deadlineTime(b)
    // A task without a usable deadline cannot be placed, so it goes last in both
    // directions instead of jumping between them.
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1
    } else if (left !== right) {
      return direction === SORT.DEADLINE_DESC ? right - left : left - right
    }

    const created = createdTime(a) - createdTime(b)
    if (created !== 0) return created
    const leftId = text(a.id)
    const rightId = text(b.id)
    if (leftId === rightId) return 0
    return leftId < rightId ? -1 : 1
  }
}

// Pure, synchronous, and never mutates its input. It returns a new array, an
// empty one when there is nothing to query, and filters before it sorts.
export function applyQuery(tasks, input) {
  if (!Array.isArray(tasks)) return []

  const query = normalizeQuery(input)
  const needle = query.search.toLowerCase()
  const courseKey = query.course.toLowerCase()
  const matched = tasks.filter((task) => matchesQuery(task, query, needle, courseKey))

  // The copy is what keeps the caller's array untouched by the sort.
  return [...matched].sort(compareTasks(query.sort))
}

// The course names of these tasks, for the filter select: trimmed, empty names
// dropped, compared without case but keeping the first spelling seen.
export function getCourseOptions(tasks) {
  if (!Array.isArray(tasks)) return []

  const seen = new Map()
  for (const task of tasks) {
    const course = text(isPlainObject(task) ? task.course : '')
    const key = course.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.set(key, course)
  }

  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'id', { sensitivity: 'base' }))
}

export const taskService = {
  list,
  create,
  update,
  remove,
  validateTask,
  applyQuery,
  getCourseOptions,
}

export default taskService