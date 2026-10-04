import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BackupError,
  applyImport,
  checkImportFile,
  createBackupFile,
  parseBackup,
} from '../services/backupService.js'
import { downloadTextFile, readFileAsText } from '../utils/download.js'

// One wording per outcome, because a card shows the message and nothing else.
const EXPORTED_NOTICE = 'Cadangan diunduh.'
const EXPORT_FAILED = 'Gagal membuat cadangan. Coba lagi.'
const READ_FAILED = 'Gagal membaca berkas.'
const IMPORT_FAILED = 'Gagal mengimpor. Data lama tidak diubah.'

// Async state for export and import. It only orchestrates: the rules live in the
// service and the storage access in the repository. An import is never written
// here, it waits for the confirmation the pending state holds.
export function useBackup({ onImported } = {}) {
  const [pendingImport, setPendingImport] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // A ref, not state, because two clicks in the same tick have to count as one
  // run before React has re-rendered.
  const busyRef = useRef(false)
  // True while the card is on screen. The effect claims it on mount and gives it
  // back in the cleanup, and it starts out true as well, so the guard still holds
  // when StrictMode runs the effect twice in development.
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Every state setter of this hook goes through here, the ones after an await
  // and the ones in a finally block included, so nothing is written once the card
  // is gone.
  const safeSet = useCallback((setter, value) => {
    if (!mountedRef.current) return
    setter(value)
  }, [])

  const clearMessages = useCallback(() => {
    safeSet(setNotice, '')
    safeSet(setError, '')
  }, [safeSet])

  const exportBackup = useCallback(async () => {
    // A second call while a run is pending is dropped, not queued.
    if (busyRef.current) return
    busyRef.current = true
    safeSet(setNotice, '')
    safeSet(setError, '')
    safeSet(setIsBusy, true)

    try {
      const { filename, text } = await createBackupFile()
      downloadTextFile(filename, text)
      safeSet(setNotice, EXPORTED_NOTICE)
    } catch {
      safeSet(setError, EXPORT_FAILED)
    } finally {
      busyRef.current = false
      safeSet(setIsBusy, false)
    }
  }, [safeSet])

  // Reads and validates the file without writing anything. The confirmation stays
  // open until the user answers, so a pending import is held in state.
  const startImport = useCallback(
    async (file) => {
      clearMessages()
      if (!file) return

      busyRef.current = true
      safeSet(setIsBusy, true)

      try {
        checkImportFile(file)
        const parsed = parseBackup(await readFileAsText(file))
        safeSet(setPendingImport, parsed)
      } catch (failure) {
        // A refused file carries its own reason, anything else is a read that
        // did not finish.
        safeSet(setError, failure instanceof BackupError ? failure.message : READ_FAILED)
      } finally {
        busyRef.current = false
        safeSet(setIsBusy, false)
      }
    },
    [clearMessages, safeSet],
  )

  const confirmImport = useCallback(async () => {
    if (busyRef.current || !pendingImport) return
    busyRef.current = true
    safeSet(setError, '')
    safeSet(setIsBusy, true)

    try {
      const written = await applyImport(pendingImport.tasks)
      const skipped = pendingImport.skipped
      safeSet(setPendingImport, null)
      safeSet(
        setNotice,
        `${written} tugas diimpor.${skipped > 0 ? ` ${skipped} dilewati.` : ''}`,
      )
      onImported?.()
    } catch {
      // The dialog stays open, because the stored data is still the old one and
      // the student may want to try again.
      safeSet(setError, IMPORT_FAILED)
    } finally {
      busyRef.current = false
      safeSet(setIsBusy, false)
    }
  }, [onImported, pendingImport, safeSet])

  const cancelImport = useCallback(() => {
    safeSet(setPendingImport, null)
    safeSet(setError, '')
  }, [safeSet])

  return {
    exportBackup,
    startImport,
    pendingImport,
    confirmImport,
    cancelImport,
    isBusy,
    notice,
    error,
    clearMessages,
  }
}

export default useBackup
