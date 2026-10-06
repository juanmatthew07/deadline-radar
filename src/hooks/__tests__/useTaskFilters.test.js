import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SEARCH_DEBOUNCE_MS } from '../../utils/constants.js'
import { useTaskFilters } from '../useTaskFilters.js'

describe('useTaskFilters initial state', () => {
  it('starts with the default query and isDefault true', () => {
    const { result } = renderHook(() => useTaskFilters())

    expect(result.current.searchInput).toBe('')
    expect(result.current.status).toBe('all')
    expect(result.current.course).toBe('all')
    expect(result.current.sort).toBe('deadline_asc')
    expect(result.current.query).toEqual({
      search: '',
      status: 'all',
      course: 'all',
      sort: 'deadline_asc',
    })
    expect(result.current.isDefault).toBe(true)
  })
})

describe('useTaskFilters updates', () => {
  it('marks isDefault false after any setter runs', () => {
    const { result } = renderHook(() => useTaskFilters())

    act(() => {
      result.current.setSearchInput('Fisika')
    })
    expect(result.current.searchInput).toBe('Fisika')
    expect(result.current.isDefault).toBe(false)

    act(() => {
      result.current.setStatus('in_progress')
    })
    expect(result.current.status).toBe('in_progress')
    expect(result.current.isDefault).toBe(false)

    act(() => {
      result.current.setCourse('Kimia')
    })
    expect(result.current.course).toBe('Kimia')
    expect(result.current.isDefault).toBe(false)

    act(() => {
      result.current.setSort('deadline_desc')
    })
    expect(result.current.sort).toBe('deadline_desc')
    expect(result.current.isDefault).toBe(false)
  })
})

describe('useTaskFilters reset', () => {
  it('restores every default value and isDefault true', () => {
    const { result } = renderHook(() => useTaskFilters())

    act(() => {
      result.current.setSearchInput('Fisika')
      result.current.setStatus('in_progress')
      result.current.setCourse('Kimia')
      result.current.setSort('deadline_desc')
    })
    expect(result.current.isDefault).toBe(false)

    act(() => {
      result.current.reset()
    })

    expect(result.current.searchInput).toBe('')
    expect(result.current.status).toBe('all')
    expect(result.current.course).toBe('all')
    expect(result.current.sort).toBe('deadline_asc')
    expect(result.current.query).toEqual({
      search: '',
      status: 'all',
      course: 'all',
      sort: 'deadline_asc',
    })
    expect(result.current.isDefault).toBe(true)
  })
})

describe('useTaskFilters debounced search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps query.search empty until the debounce settles', () => {
    const { result } = renderHook(() => useTaskFilters())

    act(() => {
      result.current.setSearchInput('Fisika')
    })
    expect(result.current.searchInput).toBe('Fisika')
    expect(result.current.query.search).toBe('')

    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS)
    })

    expect(result.current.query.search).toBe('Fisika')
  })
})