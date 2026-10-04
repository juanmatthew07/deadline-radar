import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SEARCH_DEBOUNCE_MS } from '../../utils/constants.js'
import { useDebouncedValue } from '../useDebouncedValue.js'

const DELAY = 200

// The hook only owns a timer, so the clock is the only thing faked.
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function renderDebounced(initial = 'a') {
  return renderHook(({ value }) => useDebouncedValue(value, DELAY), {
    initialProps: { value: initial },
  })
}

describe('useDebouncedValue', () => {
  it('returns the new value only after the delay has passed', () => {
    const { result, rerender } = renderDebounced()

    rerender({ value: 'ab' })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(DELAY - 1)
    })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('ab')
  })

  it('settles on the last value after rapid changes', () => {
    const { result, rerender } = renderDebounced()

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(DELAY / 2)
    })
    rerender({ value: 'abc' })
    expect(result.current).toBe('a')

    act(() => {
      vi.advanceTimersByTime(DELAY)
    })
    expect(result.current).toBe('abc')
  })

  it('waits the search delay by default', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'a' },
    })

    rerender({ value: 'ab' })
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
    })
    expect(result.current).toBe('ab')
  })
})