import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StorageError } from '../../repository/taskRepository.js'
import {
  COURSE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TASK_PRIORITY,
  TASK_STATUS,
  TITLE_MAX_LENGTH,
} from '../../utils/constants.js'
import {
  ValidationError,
  create,
  list,
  remove,
  update,
  validateTask,
} from '../taskService.js'

const CREATED_AT = new Date(Date.UTC(2026, 9, 1, 8, 0, 0))
const LATER = new Date(Date.UTC(2026, 9, 3, 9, 30, 0))

const VALID_DRAFT = {
  title: '  Esai Fisika  ',
  course: '  Fisika Dasar  ',
  description: '  Ringkasan gaya dan medan listrik.  ',
  deadline: '2026-10-04T23:59',
}

const REQUIRED_ERRORS = {
  title: 'Judul wajib diisi.',
  course: 'Mata kuliah wajib diisi.',
  deadline: 'Tenggat wajib diisi.',
}

function repeat(length) {
  return 'a'.repeat(length)
}

// The service runs on the real repository over the jsdom localStorage, so every
// call waits the simulated latency. The fake clock is fully drained first.
async function settle(pending) {
  await vi.runAllTimersAsync()
  return pending
}

// The handler is attached before the clock moves, so a rejection never shows up
// as an unhandled rejection.
async function captureFailure(pending) {
  const captured = pending.then(
    () => null,
    (error) => error,
  )
  await vi.runAllTimersAsync()
  return captured
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(CREATED_AT)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('validateTask', () => {
  it('returns no field errors for a valid draft', () => {
    expect(validateTask(VALID_DRAFT)).toEqual({})
  })

  it('reports every required field for an empty object', () => {
    expect(validateTask({})).toEqual(REQUIRED_ERRORS)
  })

  it('treats null, undefined, a number, and an array as an empty draft', () => {
    for (const odd of [null, undefined, 42, ['Esai Fisika']]) {
      expect(validateTask(odd)).toEqual(REQUIRED_ERRORS)
    }
  })

  it('does not throw for odd input', () => {
    expect(() => validateTask(null)).not.toThrow()
    expect(() => validateTask(undefined)).not.toThrow()
    expect(() => validateTask(42)).not.toThrow()
    expect(() => validateTask(['Esai'])).not.toThrow()
  })

  it('rejects a title that is only whitespace', () => {
    expect(validateTask({ ...VALID_DRAFT, title: '   ' })).toEqual({ title: 'Judul wajib diisi.' })
  })

  it('rejects a non-string title as empty', () => {
    expect(validateTask({ ...VALID_DRAFT, title: 42 })).toEqual({ title: 'Judul wajib diisi.' })
  })

  it('rejects a title longer than the limit', () => {
    expect(validateTask({ ...VALID_DRAFT, title: repeat(TITLE_MAX_LENGTH + 1) })).toEqual({
      title: `Judul maksimal ${TITLE_MAX_LENGTH} karakter.`,
    })
  })

  it('accepts a title of exactly the limit', () => {
    expect(validateTask({ ...VALID_DRAFT, title: repeat(TITLE_MAX_LENGTH) })).toEqual({})
  })

  it('rejects a title one character over the limit', () => {
    const draft = { ...VALID_DRAFT, title: repeat(TITLE_MAX_LENGTH + 1) }
    expect(validateTask(draft).title).toBe('Judul maksimal 120 karakter.')
  })

  it('rejects an empty course', () => {
    expect(validateTask({ ...VALID_DRAFT, course: '' })).toEqual({
      course: 'Mata kuliah wajib diisi.',
    })
  })

  it('rejects a course longer than the limit', () => {
    expect(validateTask({ ...VALID_DRAFT, course: repeat(COURSE_MAX_LENGTH + 1) })).toEqual({
      course: `Mata kuliah maksimal ${COURSE_MAX_LENGTH} karakter.`,
    })
  })

  it('rejects a description longer than the limit', () => {
    const draft = { ...VALID_DRAFT, description: repeat(DESCRIPTION_MAX_LENGTH + 1) }
    expect(validateTask(draft)).toEqual({
      description: `Deskripsi maksimal ${DESCRIPTION_MAX_LENGTH} karakter.`,
    })
  })

  it('accepts a description of exactly the limit', () => {
    const draft = { ...VALID_DRAFT, description: repeat(DESCRIPTION_MAX_LENGTH) }
    expect(validateTask(draft)).toEqual({})
  })

  it('rejects a missing deadline', () => {
    const draft = { ...VALID_DRAFT }
    delete draft.deadline
    expect(validateTask(draft)).toEqual({ deadline: 'Tenggat wajib diisi.' })
  })

  it('rejects a date-only deadline', () => {
    expect(validateTask({ ...VALID_DRAFT, deadline: '2026-10-04' })).toEqual({
      deadline: 'Format tenggat tidak valid.',
    })
  })

  it('rejects a deadline that is not a date', () => {
    expect(validateTask({ ...VALID_DRAFT, deadline: 'abc' })).toEqual({
      deadline: 'Format tenggat tidak valid.',
    })
  })

  it('rejects a priority outside the allowed values', () => {
    expect(validateTask({ ...VALID_DRAFT, priority: 'urgent' })).toEqual({
      priority: 'Prioritas tidak valid.',
    })
  })

  it('accepts every allowed priority', () => {
    for (const priority of Object.values(TASK_PRIORITY)) {
      expect(validateTask({ ...VALID_DRAFT, priority })).toEqual({})
    }
  })

  it('rejects a status outside the allowed values', () => {
    expect(validateTask({ ...VALID_DRAFT, status: 'finished' })).toEqual({
      status: 'Status tidak valid.',
    })
  })

  it('accepts every allowed status', () => {
    for (const status of Object.values(TASK_STATUS)) {
      expect(validateTask({ ...VALID_DRAFT, status })).toEqual({})
    }
  })

  it('reports every invalid field at once', () => {
    const draft = {
      title: '',
      course: '',
      description: repeat(DESCRIPTION_MAX_LENGTH + 1),
      deadline: 'abc',
      priority: 'urgent',
      status: 'finished',
    }
    expect(validateTask(draft)).toEqual({
      title: 'Judul wajib diisi.',
      course: 'Mata kuliah wajib diisi.',
      description: 'Deskripsi maksimal 1000 karakter.',
      deadline: 'Format tenggat tidak valid.',
      priority: 'Prioritas tidak valid.',
      status: 'Status tidak valid.',
    })
  })
})

describe('list', () => {
  it('returns an empty array when nothing is stored', async () => {
    await expect(settle(list())).resolves.toEqual([])
  })

  it('returns every stored task', async () => {
    await settle(create({ ...VALID_DRAFT, title: 'Esai Fisika' }))
    await settle(create({ ...VALID_DRAFT, title: 'Laporan Kimia' }))
    const tasks = await settle(list())
    expect(tasks.map((task) => task.title)).toEqual(['Esai Fisika', 'Laporan Kimia'])
  })
})

describe('create', () => {
  it('returns a task with the text fields trimmed', async () => {
    const created = await settle(create(VALID_DRAFT))
    expect(created.title).toBe('Esai Fisika')
    expect(created.course).toBe('Fisika Dasar')
    expect(created.description).toBe('Ringkasan gaya dan medan listrik.')
    expect(created.deadline).toBe('2026-10-04T23:59')
  })

  it('returns a task with an id, the default status and priority, and ISO timestamps', async () => {
    const created = await settle(create(VALID_DRAFT))
    expect(typeof created.id).toBe('string')
    expect(created.id.length).toBeGreaterThan(0)
    expect(created.status).toBe('todo')
    expect(created.priority).toBe('medium')
    expect(created.createdAt).toBe(CREATED_AT.toISOString())
    expect(created.updatedAt).toBe(CREATED_AT.toISOString())
  })

  it('never stores a derived urgency field', async () => {
    const created = await settle(create(VALID_DRAFT))
    expect('urgency' in created).toBe(false)
    expect(Object.keys(created).sort()).toEqual([
      'course',
      'createdAt',
      'deadline',
      'description',
      'id',
      'priority',
      'status',
      'title',
      'updatedAt',
    ])
  })

  it('persists the created task so list returns it', async () => {
    const created = await settle(create(VALID_DRAFT))
    const tasks = await settle(list())
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toEqual(created)
  })

  it('rejects with a ValidationError carrying the field errors', async () => {
    const error = await captureFailure(create({ ...VALID_DRAFT, title: '', course: '' }))
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.message).toBe('Data tugas tidak valid.')
    expect(error.fieldErrors).toEqual({
      title: 'Judul wajib diisi.',
      course: 'Mata kuliah wajib diisi.',
    })
  })

  it('writes nothing when the draft is invalid', async () => {
    await captureFailure(create({ ...VALID_DRAFT, deadline: 'abc' }))
    await expect(settle(list())).resolves.toEqual([])
  })
})

describe('update', () => {
  it('changes the given fields and returns the updated task', async () => {
    const created = await settle(create(VALID_DRAFT))
    const updated = await settle(update(created.id, { title: '  Esai Fisika Revisi  ' }))
    expect(updated.title).toBe('Esai Fisika Revisi')
    expect(updated.course).toBe('Fisika Dasar')
  })

  it('refreshes updatedAt and keeps the id and createdAt', async () => {
    const created = await settle(create(VALID_DRAFT))
    vi.setSystemTime(LATER)
    const updated = await settle(update(created.id, { status: 'done' }))
    expect(updated.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(Date.parse(updated.updatedAt)).toBeGreaterThanOrEqual(LATER.getTime())
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(created.createdAt))
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.id).toBe(created.id)
    expect(updated.status).toBe('done')
  })

  it('persists the update so list returns the new values', async () => {
    const created = await settle(create(VALID_DRAFT))
    await settle(update(created.id, { priority: 'high' }))
    const tasks = await settle(list())
    expect(tasks[0].priority).toBe('high')
  })

  it('drops a derived field sent in the patch', async () => {
    const created = await settle(create(VALID_DRAFT))
    const updated = await settle(update(created.id, { urgency: 'overdue' }))
    expect('urgency' in updated).toBe(false)
    const tasks = await settle(list())
    expect('urgency' in tasks[0]).toBe(false)
  })

  it('rejects with a ValidationError and leaves the stored task unchanged', async () => {
    const created = await settle(create(VALID_DRAFT))
    const error = await captureFailure(update(created.id, { title: '' }))
    expect(error).toBeInstanceOf(ValidationError)
    expect(error.fieldErrors).toEqual({ title: 'Judul wajib diisi.' })
    const tasks = await settle(list())
    expect(tasks[0]).toEqual(created)
  })

  it('rejects with a not_found StorageError for an unknown id', async () => {
    const error = await captureFailure(update('tidak-ada', { title: 'Esai' }))
    expect(error).toBeInstanceOf(StorageError)
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('Tugas tidak ditemukan.')
  })
})

describe('remove', () => {
  it('deletes the task so list no longer returns it', async () => {
    const created = await settle(create(VALID_DRAFT))
    await expect(settle(remove(created.id))).resolves.toBeUndefined()
    await expect(settle(list())).resolves.toEqual([])
  })

  it('resolves without throwing for an unknown id', async () => {
    const created = await settle(create(VALID_DRAFT))
    await expect(settle(remove('tidak-ada'))).resolves.toBeUndefined()
    const tasks = await settle(list())
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe(created.id)
  })
})