// Deadlines are local wall-clock values stored exactly as datetime-local emits
// them: "2026-10-04T23:59", optionally with seconds. A date-only value is
// rejected on purpose, because it is parsed as UTC and would shift the day.
export const DEADLINE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

const NO_DEADLINE_LABEL = 'Tanpa tenggat'
const NO_TIMESTAMP_LABEL = '-'

const deadlineFormatter = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// createdAt and updatedAt are real instants, so unlike a deadline they are
// shown in the local zone of the student, with the seconds dropped.
const timestampFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function buildLocalDate(year, month, day, hour, minute, second) {
  const date = new Date(year, month - 1, day, hour, minute, second, 0)
  // new Date() maps years 0-99 into the 1900s, so put the real year back.
  if (year >= 0 && year < 100) date.setFullYear(year)
  return date
}

// Returns a Date built in local time, or null when the value is not a valid
// deadline string. Impossible dates such as 2026-02-31 return null because the
// parsed parts are compared back against the input.
export function parseDeadline(value) {
  if (typeof value !== 'string' || !DEADLINE_PATTERN.test(value)) return null
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const hour = Number(value.slice(11, 13))
  const minute = Number(value.slice(14, 16))
  const second = value.length > 16 ? Number(value.slice(17, 19)) : 0
  const date = buildLocalDate(year, month, day, hour, minute, second)
  const matches =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === minute &&
    date.getSeconds() === second
  return matches ? date : null
}

export function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// Calendar arithmetic through setDate, never 24h additions, so a daylight
// saving change inside the range does not shift the result.
export function addDays(date, days) {
  const next = new Date(date.getTime())
  next.setDate(next.getDate() + days)
  return next
}

export function isSameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatDeadline(value) {
  const date = parseDeadline(value)
  return date ? deadlineFormatter.format(date) : NO_DEADLINE_LABEL
}

export function toDeadlineInputValue(value) {
  return parseDeadline(value) ? value : ''
}

// A stored instant, shown in Indonesian local time. Anything that is not a
// parseable string shows as a dash, so a repaired entry never prints an
// invalid date.
export function formatTimestamp(value) {
  if (typeof value !== 'string') return NO_TIMESTAMP_LABEL
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return NO_TIMESTAMP_LABEL
  return timestampFormatter.format(date)
}