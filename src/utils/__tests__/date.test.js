import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDeadline,
  isSameLocalDay,
  parseDeadline,
  startOfLocalDay,
  toDeadlineInputValue,
} from '../date.js'

describe('parseDeadline', () => {
  it('reads a datetime-local value as local wall-clock time, not UTC', () => {
    const parsed = parseDeadline('2026-10-04T23:59')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(9)
    expect(parsed.getDate()).toBe(4)
    expect(parsed.getHours()).toBe(23)
    expect(parsed.getMinutes()).toBe(59)
  })

  it('accepts a value that also carries seconds', () => {
    const parsed = parseDeadline('2026-10-04T23:59:30')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed.getHours()).toBe(23)
    expect(parsed.getMinutes()).toBe(59)
    expect(parsed.getSeconds()).toBe(30)
  })

  it('rejects an empty string', () => {
    expect(parseDeadline('')).toBeNull()
  })

  it('rejects null', () => {
    expect(parseDeadline(null)).toBeNull()
  })

  it('rejects undefined', () => {
    expect(parseDeadline(undefined)).toBeNull()
  })

  it('rejects a number', () => {
    expect(parseDeadline(20261004)).toBeNull()
  })

  it('rejects a date-only value because it would be parsed as UTC', () => {
    expect(parseDeadline('2026-10-04')).toBeNull()
  })

  it('rejects a value with a UTC suffix', () => {
    expect(parseDeadline('2026-10-04T23:59Z')).toBeNull()
  })

  it('rejects an impossible calendar day', () => {
    expect(parseDeadline('2026-02-31T10:00')).toBeNull()
  })

  it('rejects an impossible month', () => {
    expect(parseDeadline('2026-13-01T10:00')).toBeNull()
  })

  it('rejects text that is not a date', () => {
    expect(parseDeadline('not a date')).toBeNull()
  })

  it('accepts a real leap day', () => {
    const parsed = parseDeadline('2028-02-29T08:00')
    expect(parsed).toBeInstanceOf(Date)
    expect(parsed.getDate()).toBe(29)
  })
})

describe('startOfLocalDay', () => {
  it('returns local midnight of the same calendar day', () => {
    const start = startOfLocalDay(new Date(2026, 9, 4, 23, 59, 30))
    expect([start.getFullYear(), start.getMonth(), start.getDate()]).toEqual([2026, 9, 4])
    expect([start.getHours(), start.getMinutes(), start.getSeconds()]).toEqual([0, 0, 0])
  })

  it('leaves the given date unchanged', () => {
    const given = new Date(2026, 9, 4, 23, 59)
    startOfLocalDay(given)
    expect([given.getDate(), given.getHours()]).toEqual([4, 23])
  })
})

describe('addDays', () => {
  it('rolls over into the next year', () => {
    const next = addDays(new Date(2026, 11, 31, 8, 0), 1)
    expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2027, 0, 1])
    expect(next.getHours()).toBe(8)
  })

  it('rolls forward into the next month', () => {
    const next = addDays(new Date(2026, 9, 31, 8, 0), 1)
    expect([next.getMonth(), next.getDate()]).toEqual([10, 1])
  })

  it('moves backwards for a negative count', () => {
    const previous = addDays(new Date(2026, 0, 1, 8, 0), -1)
    expect([previous.getFullYear(), previous.getMonth(), previous.getDate()]).toEqual([2025, 11, 31])
  })

  it('leaves the given date unchanged', () => {
    const given = new Date(2026, 9, 4, 8, 0)
    addDays(given, 3)
    expect([given.getDate(), given.getHours()]).toEqual([4, 8])
  })
})

describe('isSameLocalDay', () => {
  it('is true for two times on the same day', () => {
    expect(isSameLocalDay(new Date(2026, 9, 4, 0, 0), new Date(2026, 9, 4, 23, 59))).toBe(true)
  })

  it('is false between 23:59 and 00:00 of the next day', () => {
    expect(isSameLocalDay(new Date(2026, 9, 4, 23, 59), new Date(2026, 9, 5, 0, 0))).toBe(false)
  })

  it('is false for the same clock time on different days', () => {
    expect(isSameLocalDay(new Date(2026, 9, 4, 12, 0), new Date(2026, 9, 5, 12, 0))).toBe(false)
  })

  it('is false for the same day in a different month', () => {
    expect(isSameLocalDay(new Date(2026, 9, 4, 12, 0), new Date(2026, 10, 4, 12, 0))).toBe(false)
  })
})

describe('formatDeadline', () => {
  it('returns "Tanpa tenggat" for null', () => {
    expect(formatDeadline(null)).toBe('Tanpa tenggat')
  })

  it('returns "Tanpa tenggat" for an invalid value', () => {
    expect(formatDeadline('2026-02-31T10:00')).toBe('Tanpa tenggat')
  })

  it('formats a valid deadline with the year and a 24-hour clock time', () => {
    const formatted = formatDeadline('2026-10-04T23:59')
    expect(formatted).not.toBe('Tanpa tenggat')
    expect(formatted.length).toBeGreaterThan(0)
    expect(formatted).toContain('2026')
    expect(formatted).toMatch(/23[.:]59/)
  })

  it('renders midnight as hour zero rather than 24', () => {
    expect(formatDeadline('2026-10-04T00:00')).toMatch(/00[.:]00/)
  })
})

describe('toDeadlineInputValue', () => {
  it('returns the same string for a valid deadline', () => {
    expect(toDeadlineInputValue('2026-10-04T23:59')).toBe('2026-10-04T23:59')
  })

  it('returns an empty string for an invalid deadline', () => {
    expect(toDeadlineInputValue('2026-02-31T10:00')).toBe('')
  })

  it('returns an empty string for null', () => {
    expect(toDeadlineInputValue(null)).toBe('')
  })
})