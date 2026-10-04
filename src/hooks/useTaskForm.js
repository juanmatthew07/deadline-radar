import { useCallback, useEffect, useRef, useState } from 'react'
import { StorageError } from '../repository/taskRepository.js'
import taskService, { validateTask, ValidationError } from '../services/taskService.js'

const TASK_NOT_FOUND = 'Tugas tidak ditemukan.'
const SAVE_FAILED = 'Gagal menyimpan. Coba lagi.'
const NOT_FOUND = 'not_found'

// Async state for one create or edit form. The hook only orchestrates: every
// write goes through the service, which owns the rules and the storage access.
export function useTaskForm(task) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  // The row in edit mode, read once per save so a form always writes to the
  // task it was opened with.
  const taskId = task?.id ?? null
  // A ref, not state, because two clicks in the same tick have to count as one
  // save before React has re-rendered.
  const savingRef = useRef(false)
  // Every outcome is written through this, so a form that was closed mid save
  // never sets state.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const save = useCallback(
    async (values) => {
      // A second call while a save is pending is dropped, not queued.
      if (savingRef.current) return { ok: false }
      savingRef.current = true
      setSaveError(null)
      setIsSaving(true)

      try {
        const saved = taskId
          ? await taskService.update(taskId, values)
          : await taskService.create(values)
        return { ok: true, task: saved }
      } catch (failure) {
        // Messages per field belong to the form, not to this state.
        if (failure instanceof ValidationError) {
          return { ok: false, fieldErrors: failure.fieldErrors }
        }
        // A task deleted while the form was open is the one failure with its
        // own wording. Everything else shares the retry wording.
        if (failure instanceof StorageError && failure.code === NOT_FOUND) {
          if (mountedRef.current) setSaveError(TASK_NOT_FOUND)
        } else if (mountedRef.current) {
          setSaveError(SAVE_FAILED)
        }
        return { ok: false }
      } finally {
        savingRef.current = false
        if (mountedRef.current) setIsSaving(false)
      }
    },
    [taskId],
  )

  const clearSaveError = useCallback(() => {
    if (mountedRef.current) setSaveError(null)
  }, [])

  return { validate: validateTask, save, isSaving, saveError, clearSaveError }
}

export default useTaskForm
