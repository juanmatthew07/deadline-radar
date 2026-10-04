import { useCallback, useEffect, useRef, useState } from 'react'
import taskService from '../services/taskService.js'

const DELETE_FAILED = 'Gagal menghapus. Coba lagi.'

// Async state for one delete. Like the form hook it only orchestrates: the write
// goes through the service, which owns the rules and the storage access. A
// removal that finds nothing left to remove is not a failure, so the
// repository no-op resolves as a success.
export function useDeleteTask() {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState(null)

  // A ref, not state, because two clicks in the same tick have to count as one
  // removal before React has re-rendered.
  const deletingRef = useRef(false)
  // Every outcome is written through this, so a dialog that was closed mid
  // delete never sets state.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const remove = useCallback(async (id) => {
    // A second call while a delete is pending is dropped, not queued.
    if (deletingRef.current) return { ok: false }
    deletingRef.current = true
    setError(null)
    setIsDeleting(true)

    try {
      await taskService.remove(id)
      return { ok: true }
    } catch {
      // One wording for every failure, because the dialog only offers a retry.
      if (mountedRef.current) setError(DELETE_FAILED)
      return { ok: false }
    } finally {
      deletingRef.current = false
      if (mountedRef.current) setIsDeleting(false)
    }
  }, [])

  const clearError = useCallback(() => {
    if (mountedRef.current) setError(null)
  }, [])

  return { remove, isDeleting, error, clearError }
}

export default useDeleteTask
