import { useCallback, useMemo, useState } from 'react'
import { DEFAULT_QUERY, SEARCH_DEBOUNCE_MS } from '../utils/constants.js'
import { useDebouncedValue } from './useDebouncedValue.js'

// The search text, the two filters, and the sort order of the list. It holds no
// task data and encodes no query rule: applyQuery in the service owns those, and
// nothing here is persisted, so a reload starts from the defaults again.
export function useTaskFilters() {
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY.search)
  const [status, setStatus] = useState(DEFAULT_QUERY.status)
  const [course, setCourse] = useState(DEFAULT_QUERY.course)
  const [sort, setSort] = useState(DEFAULT_QUERY.sort)

  const settledSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS)
  // Typing waits for a pause, but an empty or whitespace-only search applies at
  // once, because a list that stays filtered by a cleared field looks stuck.
  const search = searchInput.trim() === '' ? searchInput : settledSearch

  const query = useMemo(
    () => ({ search, status, course, sort }),
    [search, status, course, sort],
  )

  // The raw text decides this, not the debounced one, so a half-typed word still
  // counts as a filter the student can undo.
  const isDefault =
    searchInput.trim() === DEFAULT_QUERY.search &&
    status === DEFAULT_QUERY.status &&
    course === DEFAULT_QUERY.course &&
    sort === DEFAULT_QUERY.sort

  const reset = useCallback(() => {
    setSearchInput(DEFAULT_QUERY.search)
    setStatus(DEFAULT_QUERY.status)
    setCourse(DEFAULT_QUERY.course)
    setSort(DEFAULT_QUERY.sort)
  }, [])

  return {
    searchInput,
    setSearchInput,
    status,
    setStatus,
    course,
    setCourse,
    sort,
    setSort,
    query,
    isDefault,
    reset,
  }
}

export default useTaskFilters