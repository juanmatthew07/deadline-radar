import {
  COURSE_MAX_LENGTH,
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITY,
  TASK_STATUS,
  TITLE_MAX_LENGTH,
} from '../utils/constants.js'
import { parseDeadline } from '../utils/date.js'
import { createId } from '../utils/id.js'

// createdAt and updatedAt are real instants, so they carry a zone offset,
// unlike a deadline which is a local wall-clock value.
const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function isFilled(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function pickAllowed(value, allowed, fallback) {
  return Object.values(allowed).includes(value) ? value : fallback
}

function isValidTimestamp(value) {
  return (
    typeof value === 'string' &&
    TIMESTAMP_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  )
}

export function createTask(draft, now = new Date()) {
  const source = isPlainObject(draft) ? draft : {}
  const stamp = now.toISOString()
  return {
    id: createId(),
    title: cleanText(source.title, TITLE_MAX_LENGTH),
    course: cleanText(source.course, COURSE_MAX_LENGTH),
    description: cleanText(source.description, DESCRIPTION_MAX_LENGTH),
    // Kept exactly as given, and null when absent, so the shape is stable
    // across a JSON round trip. The service owns deadline validation.
    deadline: source.deadline ?? null,
    priority: pickAllowed(source.priority, TASK_PRIORITY, DEFAULT_PRIORITY),
    status: pickAllowed(source.status, TASK_STATUS, DEFAULT_STATUS),
    createdAt: stamp,
    updatedAt: stamp,
  }
}

// Returns a new task and never mutates the given one. Only updatedAt moves.
// The nine known fields are listed one by one, so a derived key such as
// urgency on the input can never survive.
export function updateTask(task, changes, now = new Date()) {
  const base = isPlainObject(task) ? task : {}
  const patch = isPlainObject(changes) ? changes : {}
  const next = {
    id: base.id,
    title: base.title,
    course: base.course,
    description: base.description,
    deadline: base.deadline,
    priority: base.priority,
    status: base.status,
    createdAt: base.createdAt,
    updatedAt: now.toISOString(),
  }
  if ('title' in patch) next.title = cleanText(patch.title, TITLE_MAX_LENGTH)
  if ('course' in patch) next.course = cleanText(patch.course, COURSE_MAX_LENGTH)
  if ('description' in patch) {
    next.description = cleanText(patch.description, DESCRIPTION_MAX_LENGTH)
  }
  if ('deadline' in patch) next.deadline = patch.deadline
  if ('priority' in patch) {
    next.priority = pickAllowed(patch.priority, TASK_PRIORITY, DEFAULT_PRIORITY)
  }
  if ('status' in patch) {
    next.status = pickAllowed(patch.status, TASK_STATUS, DEFAULT_STATUS)
  }
  return next
}

// Repairs one stored entry field by field. Returns null when the entry is
// unusable, otherwise a clean task without any unknown or derived field.
export function normalizeTask(raw, now = new Date()) {
  if (!isPlainObject(raw)) return null

  const title = cleanText(raw.title, TITLE_MAX_LENGTH)
  const course = cleanText(raw.course, COURSE_MAX_LENGTH)
  if (!title || !course) return null

  const createdAt = isValidTimestamp(raw.createdAt) ? raw.createdAt : now.toISOString()
  const updatedAt = isValidTimestamp(raw.updatedAt) ? raw.updatedAt : createdAt

  return {
    id: isFilled(raw.id) ? raw.id : createId(),
    title,
    course,
    description:
      typeof raw.description === 'string'
        ? cleanText(raw.description, DESCRIPTION_MAX_LENGTH)
        : '',
    // An unusable deadline is cleared, the task itself is kept.
    deadline: parseDeadline(raw.deadline) ? raw.deadline : null,
    priority: pickAllowed(raw.priority, TASK_PRIORITY, DEFAULT_PRIORITY),
    status: pickAllowed(raw.status, TASK_STATUS, DEFAULT_STATUS),
    createdAt,
    updatedAt,
  }
}