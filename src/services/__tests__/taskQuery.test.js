import { describe, expect, it } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import { FILTER_ALL, SORT } from '../../utils/constants.js'
import { applyQuery, getCourseOptions } from '../taskService.js'

// Both functions are pure, so no storage and no clock: only the fixtures decide.
const EARLY = createSampleTask({
  id: 'task-a',
  title: 'Esai Fisika',
  course: 'Fisika',
  deadline: '2026-10-02T08:00',
})
const MIDDLE = createSampleTask({
  id: 'task-c',
  title: 'UTS Biologi',
  course: 'Biologi',
  deadline: '2026-10-10T08:00',
})
const LATE = createSampleTask({
  id: 'task-b',
  title: 'Laporan Kimia',
  course: 'Kimia',
  deadline: '2026-10-20T08:00',
})

function ids(tasks) {
  return tasks.map((entry) => entry.id)
}

describe('applyQuery sorting', () => {
  it('sorts by deadline ascending when the query is missing', () => {
    expect(ids(applyQuery([LATE, MIDDLE, EARLY]))).toEqual(['task-a', 'task-c', 'task-b'])
  })

  it('sorts by deadline descending when asked', () => {
    expect(ids(applyQuery([LATE, MIDDLE, EARLY], { sort: SORT.DEADLINE_DESC }))).toEqual([
      'task-b',
      'task-c',
      'task-a',
    ])
  })

  it('keeps unfinished tasks before done ones in both directions', () => {
    const done = createSampleTask({ id: 'task-done', deadline: '2026-10-01T08:00', status: 'done' })
    const tasks = [done, LATE, EARLY]
    expect(ids(applyQuery(tasks))).toEqual(['task-a', 'task-b', 'task-done'])
    expect(ids(applyQuery(tasks, { sort: SORT.DEADLINE_DESC }))).toEqual([
      'task-b',
      'task-a',
      'task-done',
    ])
  })

  it('puts a missing or invalid deadline last in both directions', () => {
    const missing = createSampleTask({ id: 'task-missing', deadline: null })
    const invalid = createSampleTask({ id: 'task-invalid', deadline: 'bukan tanggal' })
    const tasks = [invalid, LATE, missing, EARLY]
    // The two without a usable deadline follow the tie rule, so their ids order them.
    expect(ids(applyQuery(tasks))).toEqual(['task-a', 'task-b', 'task-invalid', 'task-missing'])
    expect(ids(applyQuery(tasks, { sort: SORT.DEADLINE_DESC }))).toEqual([
      'task-b',
      'task-a',
      'task-invalid',
      'task-missing',
    ])
  })

  it('breaks a tie on createdAt and then on id, whichever direction is asked', () => {
    const earlier = createSampleTask({
      id: 'task-2',
      deadline: EARLY.deadline,
      createdAt: '2026-09-01T08:00:00.000Z',
    })
    const later = createSampleTask({
      id: 'task-1',
      deadline: EARLY.deadline,
      createdAt: '2026-09-02T08:00:00.000Z',
    })
    const sameTime = createSampleTask({
      id: 'task-0',
      deadline: EARLY.deadline,
      createdAt: '2026-09-02T08:00:00.000Z',
    })
    expect(ids(applyQuery([later, sameTime, earlier]))).toEqual(['task-2', 'task-0', 'task-1'])
    expect(ids(applyQuery([later, sameTime, earlier], { sort: SORT.DEADLINE_DESC }))).toEqual([
      'task-2',
      'task-0',
      'task-1',
    ])
  })
})

describe('applyQuery search', () => {
  it('keeps the tasks whose title contains the text', () => {
    expect(ids(applyQuery([EARLY, LATE], { search: 'kimia' }))).toEqual(['task-b'])
  })

  it('keeps the tasks whose course contains the text', () => {
    expect(ids(applyQuery([EARLY, MIDDLE], { search: 'Biologi' }))).toEqual(['task-c'])
  })

  it('ignores case and trims the text', () => {
    expect(ids(applyQuery([EARLY, LATE], { search: '  KIMIA  ' }))).toEqual(['task-b'])
  })

  it('filters nothing for an empty or whitespace-only search', () => {
    const tasks = [EARLY, LATE]
    expect(ids(applyQuery(tasks, { search: '' }))).toEqual(['task-a', 'task-b'])
    expect(ids(applyQuery(tasks, { search: '   ' }))).toEqual(['task-a', 'task-b'])
  })

  it('does not look at the description', () => {
    const described = createSampleTask({ id: 'task-desc', description: 'Ringkasan medan listrik' })
    expect(applyQuery([described], { search: 'medan listrik' })).toEqual([])
  })
})

describe('applyQuery filters', () => {
  it('keeps every task when the status is all, and only the chosen one otherwise', () => {
    const tasks = [EARLY, createSampleTask({ id: 'task-d', status: 'done' })]
    expect(ids(applyQuery(tasks, { status: FILTER_ALL }))).toEqual(['task-a', 'task-d'])
    expect(ids(applyQuery(tasks, { status: 'done' }))).toEqual(['task-d'])
  })

  it('matches the course without case and ignores the padding', () => {
    const tasks = [
      createSampleTask({ id: 'task-e', course: 'kimia' }),
      createSampleTask({ id: 'task-f', course: 'Biologi' }),
    ]
    expect(ids(applyQuery(tasks, { course: 'KIMIA' }))).toEqual(['task-e'])
    expect(ids(applyQuery(tasks, { course: FILTER_ALL }))).toEqual(['task-e', 'task-f'])
  })

  it('composes search, status, and course', () => {
    const matching = createSampleTask({ id: 'task-hit', title: 'Laporan Kimia', course: 'Kimia' })
    const wrongCourse = createSampleTask({
      id: 'task-course',
      title: 'Laporan Kimia',
      course: 'Fisika',
    })
    const wrongStatus = createSampleTask({
      id: 'task-status',
      title: 'Laporan Kimia',
      course: 'Kimia',
      status: 'done',
    })
    const query = { search: 'kimia', status: 'todo', course: 'Kimia' }
    expect(ids(applyQuery([matching, wrongCourse, wrongStatus, MIDDLE], query))).toEqual([
      'task-hit',
    ])
  })
})

describe('applyQuery safety', () => {
  it('never mutates the array it was given', () => {
    const tasks = [LATE, EARLY]
    applyQuery(tasks, { sort: SORT.DEADLINE_ASC })
    expect(ids(tasks)).toEqual(['task-b', 'task-a'])
  })

  it('returns an empty array for a value that is not an array', () => {
    expect(applyQuery(null, {})).toEqual([])
    expect(applyQuery('tugas', {})).toEqual([])
  })
})

describe('getCourseOptions', () => {
  it('keeps the first spelling of a course that differs only in case', () => {
    const tasks = [
      createSampleTask({ course: 'Fisika' }),
      createSampleTask({ course: 'FISIKA' }),
      createSampleTask({ course: 'Kimia' }),
    ]
    expect(getCourseOptions(tasks)).toEqual(['Fisika', 'Kimia'])
  })

  it('drops a course that is empty or only whitespace', () => {
    expect(getCourseOptions([createSampleTask({ course: '   ' })])).toEqual([])
  })

  it('sorts the names alphabetically', () => {
    const tasks = [
      createSampleTask({ course: 'Matematika' }),
      createSampleTask({ course: 'biologi' }),
      createSampleTask({ course: 'Fisika' }),
    ]
    expect(getCourseOptions(tasks)).toEqual(['biologi', 'Fisika', 'Matematika'])
  })

  it('returns an empty array for a value that is not an array', () => {
    expect(getCourseOptions(undefined)).toEqual([])
  })
})