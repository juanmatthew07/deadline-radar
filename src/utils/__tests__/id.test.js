import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from '../id.js'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('createId', () => {
  it('returns a non-empty string', () => {
    const id = createId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns a different value on every call', () => {
    expect(createId()).not.toBe(createId())
  })

  it('still returns a non-empty string when crypto is missing entirely', () => {
    vi.stubGlobal('crypto', undefined)
    const id = createId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('falls back when crypto exists but has no randomUUID', () => {
    vi.stubGlobal('crypto', {})
    const id = createId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns different values on every call without randomUUID', () => {
    vi.stubGlobal('crypto', undefined)
    expect(createId()).not.toBe(createId())
  })

  it('uses the clock and Math.random when randomUUID is unavailable', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T08:00:00.000Z'))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    vi.stubGlobal('crypto', undefined)
    expect(createId()).toBe(createId())
  })

  it('changes the id when the clock advances', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T08:00:00.000Z'))
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    vi.stubGlobal('crypto', undefined)
    const first = createId()
    vi.setSystemTime(new Date('2026-10-01T08:00:10.000Z'))
    expect(createId()).not.toBe(first)
  })

  it('uses randomUUID again once it is available', () => {
    const uuid = '11111111-2222-3333-4444-555555555555'
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => uuid) })
    expect(createId()).toBe(uuid)
  })
})