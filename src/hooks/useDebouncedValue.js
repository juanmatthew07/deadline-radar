import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../utils/constants.js'

// Returns the value once it has stopped changing for delayMs. The first value is
// returned as it is, so a mount never waits, and only the newest value can land,
// because every change replaces the pending timer.
export function useDebouncedValue(value, delayMs = SEARCH_DEBOUNCE_MS) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    // Unmounting, or changing again, drops a value that never got its turn.
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return settled
}

export default useDebouncedValue