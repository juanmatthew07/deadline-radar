import { createTask, updateTask } from '../models/task.js'
import { StorageError, taskRepository } from '../repository/taskRepository.js'
import {
  COURSE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
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

export const taskService = { list, create, update, remove, validateTask }

export default taskService