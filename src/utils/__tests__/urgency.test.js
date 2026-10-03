import { describe, expect, it } from 'vitest'
import { createTask } from '../../models/task.js'
import { countByUrgency, getUrgency } from '../urgency.js'

// Every urgency case runs against a fixed reference moment: 4 October 2026, noon.
const NOW = new Date(2026, 9, 4, 12, 0)

function taskWith(deadline, status = 'todo') {
  return { title: 'Esai Fisika', course: 'Fisika Dasar', deadline, status }
}

describe('getUrgency', () => {
  it('reports done for a finished task with a past deadline', () => {
    expect(getUrgency(taskWith('2026-10-01T09:00', 'done'), NOW)).toBe('done')
  })

  it('reports done for a finished task without a deadline', () => {
    expect(getUrgency(taskWith(undefined, 'done'), NOW)).toBe('done')
  })

  it('reports overdue for a deadline that already passed earlier today', () => {
    expect(getUrgency(taskWith('2026-10-04T09:00'), NOW)).toBe('overdue')
  })

  it('reports overdue for a deadline yesterday', () => {
    expect(getUrgency(taskWith('2026-10-03T23:59'), NOW)).toBe('overdue')
  })

  it('reports due_today for the last minute of today', () => {
    expect(getUrgency(taskWith('2026-10-04T23:59'), NOW)).toBe('due_today')
  })

  it('reports due_today, not overdue, for a deadline equal to now', () => {
    expect(getUrgency(taskWith('2026-10-04T12:00'), NOW)).toBe('due_today')
  })

  it('reports this_week for midnight tomorrow', () => {
    expect(getUrgency(taskWith('2026-10-05T00:00'), NOW)).toBe('this_week')
  })

  it('reports this_week for a deadline seven calendar days after today', () => {
    expect(getUrgency(taskWith('2026-10-11T23:59'), NOW)).toBe('this_week')
  })

  it('reports later for a deadline eight calendar days after today', () => {
    expect(getUrgency(taskWith('2026-10-12T00:00'), NOW)).toBe('later')
  })

  it('reports later for a deadline far in the future', () => {
    expect(getUrgency(taskWith('2027-01-15T08:00'), NOW)).toBe('later')
  })

  it('reports later when the deadline field is missing', () => {
    expect(getUrgency({ title: 'Esai', course: 'Fisika' }, NOW)).toBe('later')
  })

  it('reports later for a null deadline', () => {
    expect(getUrgency(taskWith(null), NOW)).toBe('later')
  })

  it('reports later for an invalid deadline', () => {
    expect(getUrgency(taskWith('2026-02-31T10:00'), NOW)).toBe('later')
  })

  it('keeps a deadline at the end of today as due_today until local midnight', () => {
    const lastMinute = new Date(2026, 9, 4, 23, 59)
    expect(getUrgency(taskWith('2026-10-04T23:59'), lastMinute)).toBe('due_today')
  })

  it('reports overdue for the same deadline one minute after local midnight', () => {
    const afterMidnight = new Date(2026, 9, 5, 0, 0)
    expect(getUrgency(taskWith('2026-10-04T23:59'), afterMidnight)).toBe('overdue')
  })

  it('counts days across a month boundary as this_week', () => {
    const nearMonthEnd = new Date(2026, 9, 28, 10, 0)
    expect(getUrgency(taskWith('2026-11-03T10:00'), nearMonthEnd)).toBe('this_week')
  })

  it('does not add or change any field on the given task', () => {
    const frozen = Object.freeze(taskWith('2026-10-04T23:59'))
    expect(getUrgency(frozen, NOW)).toBe('due_today')
    expect(Object.keys(frozen).sort()).toEqual(['course', 'deadline', 'status', 'title'])
  })

  it('never receives an urgency field from createTask', () => {
    const created = createTask(
      { title: 'Esai', course: 'Fisika', deadline: '2026-10-04T23:59' },
      NOW,
    )
    expect('urgency' in created).toBe(false)
    expect(Object.keys(created)).not.toContain('urgency')
  })
})

describe('countByUrgency', () => {
  it('returns all five urgency keys at zero for an empty list', () => {
    expect(countByUrgency([], NOW)).toEqual({
      overdue: 0,
      due_today: 0,
      this_week: 0,
      later: 0,
      done: 0,
    })
  })

  it('counts every urgency level in a mixed list', () => {
    const tasks = [
      taskWith('2026-10-03T23:59'),
      taskWith('2026-10-04T23:59'),
      taskWith('2026-10-07T08:00'),
      taskWith('2026-10-20T08:00'),
      taskWith(null),
      taskWith('2026-10-01T08:00', 'done'),
    ]
    expect(countByUrgency(tasks, NOW)).toEqual({
      overdue: 1,
      due_today: 1,
      this_week: 1,
      later: 2,
      done: 1,
    })
  })

  it('keeps every key present even when only one level is used', () => {
    const counts = countByUrgency([taskWith('2026-10-04T23:59')], NOW)
    expect(Object.keys(counts).sort()).toEqual(['done', 'due_today', 'later', 'overdue', 'this_week'])
    expect(counts.due_today).toBe(1)
    expect(counts.overdue).toBe(0)
  })

  it('returns a new object that is not shared between calls', () => {
    const first = countByUrgency([], NOW)
    first.overdue = 5
    expect(countByUrgency([], NOW).overdue).toBe(0)
  })
})