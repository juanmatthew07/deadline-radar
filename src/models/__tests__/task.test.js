import { describe, expect, it } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import {
  COURSE_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../utils/constants.js'
import { createTask, normalizeTask, updateTask } from '../task.js'

const CREATED_AT = new Date(2026, 9, 1, 8, 0, 0)
const LATER = new Date(2026, 9, 2, 9, 30, 0)

const VALID_DRAFT = {
  title: '  Esai Fisika  ',
  course: '  Fisika Dasar  ',
  description: '  Ringkasan gaya dan medan listrik.  ',
  deadline: '2026-10-04T23:59',
}

describe('createTask', () => {
  it('trims whitespace from the text fields', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect(created.title).toBe('Esai Fisika')
    expect(created.course).toBe('Fisika Dasar')
    expect(created.description).toBe('Ringkasan gaya dan medan listrik.')
  })

  it('falls back to todo and medium status and priority', () => {
    const created = createTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT)
    expect(created.status).toBe('todo')
    expect(created.priority).toBe('medium')
  })

  it('uses an empty description when none is given', () => {
    expect(createTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT).description).toBe('')
  })

  it('replaces an unknown status and priority with the defaults', () => {
    const created = createTask(
      { title: 'Esai', course: 'Fisika', status: 'finished', priority: 'urgent' },
      CREATED_AT,
    )
    expect(created.status).toBe('todo')
    expect(created.priority).toBe('medium')
  })

  it('keeps a valid status and priority from the draft', () => {
    const created = createTask(
      { title: 'Esai', course: 'Fisika', status: 'done', priority: 'high' },
      CREATED_AT,
    )
    expect(created.status).toBe('done')
    expect(created.priority).toBe('high')
  })

  it('generates a non-empty string id', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect(typeof created.id).toBe('string')
    expect(created.id.length).toBeGreaterThan(0)
  })

  it('generates a different id for every task', () => {
    expect(createTask(VALID_DRAFT, CREATED_AT).id).not.toBe(createTask(VALID_DRAFT, CREATED_AT).id)
  })

  it('stamps createdAt and updatedAt with the same instant', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect(created.createdAt).toBe(created.updatedAt)
    expect(created.createdAt).toBe(CREATED_AT.toISOString())
  })

  it('writes createdAt and updatedAt as ISO strings that round-trip', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect(new Date(created.createdAt).toISOString()).toBe(created.createdAt)
    expect(new Date(created.updatedAt).toISOString()).toBe(created.updatedAt)
  })

  it('keeps the deadline string exactly as given', () => {
    expect(createTask(VALID_DRAFT, CREATED_AT).deadline).toBe('2026-10-04T23:59')
  })

  it('keeps seconds in the deadline instead of rewriting it', () => {
    const created = createTask({ ...VALID_DRAFT, deadline: '2026-10-04T23:59:30' }, CREATED_AT)
    expect(created.deadline).toBe('2026-10-04T23:59:30')
  })

  it('never adds an urgency field', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect('urgency' in created).toBe(false)
    expect(Object.keys(created)).toEqual([
      'id',
      'title',
      'course',
      'description',
      'deadline',
      'priority',
      'status',
      'createdAt',
      'updatedAt',
    ])
  })

  it('cuts text fields that exceed the maximum lengths', () => {
    const created = createTask(
      { title: 'a'.repeat(TITLE_MAX_LENGTH + 20), course: 'b'.repeat(COURSE_MAX_LENGTH + 20), description: 'c'.repeat(DESCRIPTION_MAX_LENGTH + 20) },
      CREATED_AT,
    )
    expect(created.title.length).toBe(TITLE_MAX_LENGTH)
    expect(created.course.length).toBe(COURSE_MAX_LENGTH)
    expect(created.description.length).toBe(DESCRIPTION_MAX_LENGTH)
  })
})

describe('updateTask', () => {
  const existing = createTask(VALID_DRAFT, CREATED_AT)

  it('applies the given changes', () => {
    const updated = updateTask(existing, { title: '  Esai II  ', status: 'in_progress' }, LATER)
    expect(updated.title).toBe('Esai II')
    expect(updated.status).toBe('in_progress')
  })

  it('trims the changed text fields', () => {
    const updated = updateTask(existing, { course: '  Fisika Modern  ' }, LATER)
    expect(updated.course).toBe('Fisika Modern')
  })

  it('keeps the same id and createdAt', () => {
    const updated = updateTask(existing, { title: 'Esai II' }, LATER)
    expect(updated.id).toBe(existing.id)
    expect(updated.createdAt).toBe(existing.createdAt)
  })

  it('moves updatedAt to the new instant', () => {
    const updated = updateTask(existing, { title: 'Esai II' }, LATER)
    expect(updated.updatedAt).toBe(LATER.toISOString())
    expect(updated.updatedAt).not.toBe(existing.updatedAt)
  })

  it('leaves fields that are not part of the changes alone', () => {
    const updated = updateTask(existing, { status: 'done' }, LATER)
    expect(updated.title).toBe(existing.title)
    expect(updated.deadline).toBe(existing.deadline)
    expect(updated.priority).toBe(existing.priority)
  })

  it('does not mutate the given task', () => {
    const snapshot = { ...existing }
    const returned = updateTask(existing, { title: 'Esai II', priority: 'high' }, LATER)
    expect(existing).toEqual(snapshot)
    expect(returned).not.toBe(existing)
  })

  it('never adds an urgency field even when the change asks for one', () => {
    const updated = updateTask(existing, { urgency: 'overdue' }, LATER)
    expect('urgency' in updated).toBe(false)
  })
})

describe('normalizeTask', () => {
  const cleanEntry = () =>
    createSampleTask({
      id: 'task-9',
      createdAt: '2026-10-01T08:00:00.000Z',
      updatedAt: '2026-10-01T08:00:00.000Z',
    })

  it('returns null for null', () => {
    expect(normalizeTask(null, CREATED_AT)).toBeNull()
  })

  it('returns null for an array', () => {
    expect(normalizeTask([], CREATED_AT)).toBeNull()
  })

  it('returns null for a string', () => {
    expect(normalizeTask('Esai Fisika', CREATED_AT)).toBeNull()
  })

  it('returns null when the title is missing', () => {
    expect(normalizeTask({ course: 'Fisika Dasar' }, CREATED_AT)).toBeNull()
  })

  it('returns null when the course is missing', () => {
    expect(normalizeTask({ title: 'Esai Fisika' }, CREATED_AT)).toBeNull()
  })

  it('returns null when the title is only whitespace', () => {
    expect(normalizeTask({ title: '   ', course: 'Fisika Dasar' }, CREATED_AT)).toBeNull()
  })

  it('returns null when the course is not a string', () => {
    expect(normalizeTask({ title: 'Esai', course: 42 }, CREATED_AT)).toBeNull()
  })

  it('fills an empty description when it is missing', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT)
    expect(normalized.description).toBe('')
  })

  it('fills the defaults when description, status, and priority are missing', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT)
    expect(normalized.status).toBe('todo')
    expect(normalized.priority).toBe('medium')
  })

  it('replaces an unknown status with the default', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika', status: 'selesai' }, CREATED_AT)
    expect(normalized.status).toBe('todo')
  })

  it('replaces an unknown priority with the default', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika', priority: 'tinggi' }, CREATED_AT)
    expect(normalized.priority).toBe('medium')
  })

  it('keeps a valid status and priority', () => {
    const normalized = normalizeTask(
      { title: 'Esai', course: 'Fisika', status: 'in_progress', priority: 'high' },
      CREATED_AT,
    )
    expect(normalized.status).toBe('in_progress')
    expect(normalized.priority).toBe('high')
  })

  it('trims the stored text fields', () => {
    const normalized = normalizeTask(
      { title: '  Esai Fisika  ', course: '  Fisika Dasar  ', description: '  Catatan.  ' },
      CREATED_AT,
    )
    expect([normalized.title, normalized.course, normalized.description]).toEqual([
      'Esai Fisika',
      'Fisika Dasar',
      'Catatan.',
    ])
  })

  it('keeps a valid deadline string unchanged', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika', deadline: '2026-10-04T23:59' }, CREATED_AT)
    expect(normalized.deadline).toBe('2026-10-04T23:59')
  })

  it('keeps the task but clears an invalid deadline', () => {
    const normalized = normalizeTask(
      { title: 'Esai', course: 'Fisika', deadline: '2026-02-31T10:00' },
      CREATED_AT,
    )
    expect(normalized).not.toBeNull()
    expect(normalized.title).toBe('Esai')
    expect(normalized.deadline).toBeNull()
  })

  it('clears a date-only deadline that would be read as UTC', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika', deadline: '2026-10-04' }, CREATED_AT)
    expect(normalized.deadline).toBeNull()
  })

  it('generates an id when none is stored', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT)
    expect(typeof normalized.id).toBe('string')
    expect(normalized.id.length).toBeGreaterThan(0)
  })

  it('generates a different id for two entries without one', () => {
    expect(normalizeTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT).id).not.toBe(
      normalizeTask({ title: 'Esai', course: 'Fisika' }, CREATED_AT).id,
    )
  })

  it('keeps a stored id', () => {
    expect(normalizeTask(cleanEntry(), CREATED_AT).id).toBe('task-9')
  })

  it('replaces an unparsable createdAt with the reference instant', () => {
    const normalized = normalizeTask({ title: 'Esai', course: 'Fisika', createdAt: 'kemarin' }, CREATED_AT)
    expect(normalized.createdAt).toBe(CREATED_AT.toISOString())
  })

  it('falls back to createdAt when updatedAt is unparsable', () => {
    const normalized = normalizeTask(
      { title: 'Esai', course: 'Fisika', createdAt: '2026-10-01T08:00:00.000Z', updatedAt: 'kemarin' },
      CREATED_AT,
    )
    expect(normalized.updatedAt).toBe('2026-10-01T08:00:00.000Z')
  })

  it('keeps a stored updatedAt that is a valid instant', () => {
    const normalized = normalizeTask(cleanEntry(), CREATED_AT)
    expect(normalized.updatedAt).toBe('2026-10-01T08:00:00.000Z')
  })

  it('cuts over-long title, course, and description to the maximum lengths', () => {
    const normalized = normalizeTask(
      {
        title: 'a'.repeat(TITLE_MAX_LENGTH + 20),
        course: 'b'.repeat(COURSE_MAX_LENGTH + 20),
        description: 'c'.repeat(DESCRIPTION_MAX_LENGTH + 20),
      },
      CREATED_AT,
    )
    expect(normalized.title.length).toBe(TITLE_MAX_LENGTH)
    expect(normalized.course.length).toBe(COURSE_MAX_LENGTH)
    expect(normalized.description.length).toBe(DESCRIPTION_MAX_LENGTH)
  })

  it('drops unknown stored fields', () => {
    const normalized = normalizeTask(
      { ...cleanEntry(), extraField: 'jangan disimpan' },
      CREATED_AT,
    )
    expect(normalized).not.toHaveProperty('extraField')
  })

  it('drops a stored urgency field', () => {
    const normalized = normalizeTask({ ...cleanEntry(), urgency: 'overdue' }, CREATED_AT)
    expect(normalized).not.toHaveProperty('urgency')
  })

  it('exposes exactly the nine task fields', () => {
    expect(Object.keys(normalizeTask(cleanEntry(), CREATED_AT)).sort()).toEqual([
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

  it('does not mutate the entry it normalizes', () => {
    const raw = { title: '  Esai  ', course: '  Fisika  ', urgency: 'overdue' }
    const snapshot = { ...raw }
    normalizeTask(raw, CREATED_AT)
    expect(raw).toEqual(snapshot)
  })

  it('leaves an already clean entry equal to its input', () => {
    const clean = cleanEntry()
    expect(normalizeTask(clean, CREATED_AT)).toEqual(clean)
  })

  it('leaves a task created by createTask equal to its input', () => {
    const created = createTask(VALID_DRAFT, CREATED_AT)
    expect(normalizeTask(created, LATER)).toEqual(created)
  })
})