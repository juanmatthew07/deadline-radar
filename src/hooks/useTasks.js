import { useCallback, useEffect, useRef, useState } from 'react'
import taskService from '../services/taskService.js'

// The service rejects with an Error that already carries an Indonesian message,
// so the UI can show it as it is. Anything else becomes an empty message and
// the view falls back to its own default wording.
function toMessage(failure) {
  if (failure instanceof Error && failure.message) return failure.message
  if (typeof failure === 'string' && failure.trim()) return failure.trim()
  return ''
}

// Async state for the task list. It only orchestrates: every read goes through
// the service, which owns the storage access.
export function useTasks() {
  const [tasks, setTasks] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Every read takes a number. Only the newest one may write state, so an older
  // slower read cannot overwrite it and nothing writes after unmount.
  const requestId = useRef(0)
  // True once a read has succeeded, so a later reload is a background one.
  const hasLoaded = useRef(false)

  const applyLoaded = useCallback((id, list) => {
    if (id !== requestId.current) return
    hasLoaded.current = true
    setTasks(list)
    setError(null)
    setStatus('ready')
  }, [])

  const applyFailed = useCallback((id, failure) => {
    if (id !== requestId.current) return
    setError(toMessage(failure))
    // With rows already on screen a failure is a notice, not a whole page.
    setStatus(hasLoaded.current ? 'ready' : 'error')
  }, [])

  // A reload asked for by the user. Once data is on screen it stays there and
  // only the refreshing flag moves; a retry after a failed first read starts
  // over from the loading state.
  const refresh = useCallback(async () => {
    const id = requestId.current + 1
    requestId.current = id

    if (hasLoaded.current) {
      setError(null)
      setIsRefreshing(true)
    } else {
      setStatus('loading')
    }

    try {
      applyLoaded(id, await taskService.list())
    } catch (failure) {
      applyFailed(id, failure)
    } finally {
      if (id === requestId.current) setIsRefreshing(false)
    }
  }, [applyFailed, applyLoaded])

  useEffect(() => {
    const id = requestId.current + 1
    requestId.current = id

    // The outcome is written from inside the promise callbacks, so mounting
    // never sets state synchronously. The cleanup drops this read, which also
    // covers the double effect of StrictMode.
    taskService.list().then(
      (list) => applyLoaded(id, list),
      (failure) => applyFailed(id, failure),
    )

    return () => {
      requestId.current += 1
    }
  }, [applyFailed, applyLoaded])

  return { tasks, status, error, isRefreshing, refresh }
}

export default useTasks