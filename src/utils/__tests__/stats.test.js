import { describe, expect, it } from 'vitest'
import { getCompletion, getCourseProgress, getUpcomingTasks, getWorkload } from '../stats.js'

// Every case runs against a fixed reference moment: 4 October 2026, noon.
const NOW = new Date(2026, 9, 4, 12, 0)

function taskWith(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Esai Fisika',
    course: 'Fisika Dasar',
    deadline: '2026-10-04T23:59',
    status: 'todo',
    createdAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}

function idsOf(tasks) {
  return tasks.map((task) => task.id)
}

describe('getUpcomingTasks', () => {
  it('puts an overdue task before the ones still ahead', () => {
    const tasks = [
      taskWith({ id: 'later', deadline: '2026-10-20T08:00' }),
      taskWith({ id: 'overdue', deadline: '2026-10-02T08:00' }),
      taskWith({ id: 'today', deadline: '2026-10-04T23:59' }),
    ]
    expect(idsOf(getUpcomingTasks(tasks))).toEqual(['overdue', 'today', 'later'])
  })

  it('leaves out a done task and every task without a usable deadline', () => {
    const tasks = [
      taskWith({ id: 'done', deadline: '2026-10-05T08:00', status: 'done' }),
      taskWith({ id: 'empty', deadline: null }),
      taskWith({ id: 'impossible', deadline: '2026-02-31T08:00' }),
      taskWith({ id: 'open', deadline: '2026-10-06T08:00' }),
    ]
    expect(idsOf(getUpcomingTasks(tasks))).toEqual(['open'])
  })

  it('keeps only the given number of tasks', () => {
    const tasks = [
      taskWith({ id: 'a', deadline: '2026-10-05T08:00' }),
      taskWith({ id: 'b', deadline: '2026-10-06T08:00' }),
      taskWith({ id: 'c', deadline: '2026-10-07T08:00' }),
    ]
    expect(idsOf(getUpcomingTasks(tasks, 2))).toEqual(['a', 'b'])
  })

  it('breaks a deadline tie with the created time and then the id', () => {
    const tasks = [
      taskWith({ id: 'c', deadline: '2026-10-06T08:00', createdAt: '2026-10-03T08:00:00.000Z' }),
      taskWith({ id: 'b', deadline: '2026-10-06T08:00', createdAt: '2026-10-02T08:00:00.000Z' }),
      taskWith({ id: 'a', deadline: '2026-10-06T08:00', createdAt: '2026-10-02T08:00:00.000Z' }),
    ]
    expect(idsOf(getUpcomingTasks(tasks))).toEqual(['a', 'b', 'c'])
  })

  it('leaves the given list in the order it arrived in', () => {
    const tasks = [
      taskWith({ id: 'b', deadline: '2026-10-06T08:00' }),
      taskWith({ id: 'a', deadline: '2026-10-05T08:00' }),
    ]
    getUpcomingTasks(tasks)
    expect(idsOf(tasks)).toEqual(['b', 'a'])
  })
})

describe('getWorkload', () => {
  it('returns seven days counting from today', () => {
    const week = getWorkload([], NOW)
    expect(week.map((day) => day.key)).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ])
  })

  it('starts each day at local midnight', () => {
    const [today] = getWorkload([], NOW)
    expect([today.date.getFullYear(), today.date.getMonth(), today.date.getDate()]).toEqual([
      2026,
      9,
      4,
    ])
    expect(today.date.getHours()).toBe(0)
  })

  it('counts a deadline late today on today', () => {
    const week = getWorkload([taskWith({ deadline: '2026-10-04T23:59' })], NOW)
    expect(week.map((day) => day.count)).toEqual([1, 0, 0, 0, 0, 0, 0])
  })

  it('ignores an overdue, a done, and a task without a deadline', () => {
    const tasks = [
      taskWith({ deadline: '2026-10-03T23:59' }),
      taskWith({ deadline: '2026-10-05T08:00', status: 'done' }),
      taskWith({ deadline: null }),
    ]
    expect(getWorkload(tasks, NOW).every((day) => day.count === 0)).toBe(true)
  })

  it('includes the seventh day and leaves the eighth out', () => {
    const week = getWorkload(
      [taskWith({ deadline: '2026-10-10T23:59' }), taskWith({ deadline: '2026-10-11T23:59' })],
      NOW,
    )
    expect(week[6]).toMatchObject({ key: '2026-10-10', count: 1 })
    expect(week.map((day) => day.count).reduce((total, count) => total + count)).toBe(1)
  })

  it('rolls over into the next month', () => {
    const week = getWorkload(
      [taskWith({ deadline: '2026-11-04T08:00' })],
      new Date(2026, 9, 29, 12, 0),
    )
    expect(week.map((day) => day.key)).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ])
    expect(week[6].count).toBe(1)
  })

  it('builds the day key from the local date parts', () => {
    const [today] = getWorkload([], new Date(2026, 0, 1, 23, 30))
    expect(today.key).toBe('2026-01-01')
  })

  it('falls back to seven days when the count is not a positive integer', () => {
    expect(getWorkload([], NOW, 0)).toHaveLength(7)
    expect(getWorkload([], NOW, -3)).toHaveLength(7)
    expect(getWorkload([], NOW, 2.5)).toHaveLength(7)
    expect(getWorkload([], NOW, 3)).toHaveLength(3)
  })
})

describe('getCourseProgress', () => {
  it('groups one course written in another case and keeps the first spelling', () => {
    const tasks = [
      taskWith({ course: 'Fisika Dasar', status: 'done' }),
      taskWith({ course: 'fisika dasar' }),
      taskWith({ course: '  FISIKA DASAR  ', status: 'done' }),
    ]
    expect(getCourseProgress(tasks)).toEqual([
      { course: 'Fisika Dasar', total: 3, done: 2, remaining: 1, percent: 67 },
    ])
  })

  it('leads with the course that has the most work left', () => {
    const tasks = [
      taskWith({ course: 'Kimia', status: 'done' }),
      taskWith({ course: 'Biologi' }),
      taskWith({ course: 'Fisika' }),
      taskWith({ course: 'Fisika' }),
    ]
    expect(getCourseProgress(tasks).map((entry) => entry.course)).toEqual([
      'Fisika',
      'Biologi',
      'Kimia',
    ])
  })

  it('sorts courses with the same work left by name', () => {
    const tasks = [
      taskWith({ course: 'Matematika' }),
      taskWith({ course: 'Fisika' }),
      taskWith({ course: 'Biologi' }),
    ]
    expect(getCourseProgress(tasks).map((entry) => entry.course)).toEqual([
      'Biologi',
      'Fisika',
      'Matematika',
    ])
  })

  it('rounds the percentage to the nearest whole number', () => {
    const oneOfThree = [
      taskWith({ course: 'Kimia', status: 'done' }),
      taskWith({ course: 'Kimia' }),
      taskWith({ course: 'Kimia' }),
    ]
    expect(getCourseProgress(oneOfThree)[0].percent).toBe(33)

    const twoOfThree = [
      taskWith({ course: 'Kimia', status: 'done' }),
      taskWith({ course: 'Kimia', status: 'done' }),
      taskWith({ course: 'Kimia' }),
    ]
    expect(getCourseProgress(twoOfThree)[0].percent).toBe(67)
  })

  it('leaves out a task without a course', () => {
    const tasks = [
      taskWith({ course: '   ' }),
      taskWith({ course: '' }),
      taskWith({ course: 'Fisika' }),
    ]
    expect(getCourseProgress(tasks).map((entry) => entry.course)).toEqual(['Fisika'])
  })

  it('returns nothing for an empty list', () => {
    expect(getCourseProgress([])).toEqual([])
  })
})

describe('getCompletion', () => {
  it('reports zero percent for an empty list', () => {
    expect(getCompletion([])).toEqual({ total: 0, done: 0, percent: 0 })
  })

  it('counts the finished tasks of a mixed list', () => {
    const tasks = [
      taskWith({ status: 'done' }),
      taskWith({ status: 'in_progress' }),
      taskWith({ status: 'todo' }),
      taskWith({ status: 'done' }),
    ]
    expect(getCompletion(tasks)).toEqual({ total: 4, done: 2, percent: 50 })
  })
})

describe('a value that is not a list of tasks', () => {
  it('is read as no tasks at all', () => {
    expect(getUpcomingTasks(null)).toEqual([])
    expect(getWorkload(undefined)).toHaveLength(7)
    expect(getCourseProgress('stored')).toEqual([])
    expect(getCompletion({})).toEqual({ total: 0, done: 0, percent: 0 })
  })
})