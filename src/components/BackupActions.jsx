import { useRef } from 'react'
import { useBackup } from '../hooks/useBackup.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import Icon from './Icon.jsx'
import { Check, Download, Upload } from './icons.js'
import './BackupActions.css'

const TITLE = 'Cadangan data'
const HINT = 'Simpan salinan tugasmu sebagai berkas JSON, atau pulihkan dari salinan sebelumnya.'
const EXPORT_LABEL = 'Ekspor data'
const IMPORT_LABEL = 'Impor data'
const NOTHING_TO_EXPORT = 'Belum ada tugas untuk diekspor.'
const FILE_LABEL = 'Pilih berkas cadangan'
const ACCEPT = '.json,application/json'
const CANNOT_BE_UNDONE = 'tidak dapat dibatalkan'

const DIALOG_TITLE = 'Ganti semua tugas?'
const CONFIRM_LABEL = 'Ganti semua'
const IMPORTING_LABEL = 'Mengimpor...'

// The backup card of the dashboard. It renders no data logic: the hook holds the
// async state, the service owns the file rules, and the confirmation is the same
// dialog the delete uses, in the neutral tone because an import is not destructive
// while it is still unconfirmed.
export function BackupActions({ taskCount, onImported }) {
  const fileInputRef = useRef(null)
  const {
    exportBackup,
    startImport,
    pendingImport,
    confirmImport,
    cancelImport,
    isBusy,
    notice,
    error,
  } = useBackup({ onImported })

  // The dialog renders the same failure while it stays open, so the card shows its
  // message only when no dialog is on screen. One run, one message: it is never
  // shown and announced twice.
  const isDialogOpen = Boolean(pendingImport)

  // Both messages sit above the actions, so the result of a run is where the
  // buttons that started it are.
  function importBody({ tasks, skipped }) {
    const counts = `Impor ini akan mengganti ${taskCount} tugas saat ini dengan ${tasks.length} tugas dari berkas dan ${CANNOT_BE_UNDONE}.`
    return skipped > 0 ? `${counts} ${skipped} entri dilewati karena tidak valid.` : counts
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    // Cleared straight away, because otherwise picking the same file twice would
    // not raise a change event and the second attempt would do nothing.
    event.target.value = ''
    startImport(file)
  }

  return (
    <section className="card backup-actions">
      <h3 className="backup-actions__title">{TITLE}</h3>
      <p className="backup-actions__hint">{HINT}</p>

      {notice && !isDialogOpen ? (
        <p className="backup-actions__notice" role="status">
          <Icon as={Check} size={16} />
          {notice}
        </p>
      ) : null}
      {error && !isDialogOpen ? (
        <p className="backup-actions__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="backup-actions__row">
        <button
          type="button"
          className="button button--secondary"
          onClick={exportBackup}
          disabled={taskCount === 0 || isBusy}
        >
          <Icon as={Download} />
          {EXPORT_LABEL}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
        >
          <Icon as={Upload} />
          {IMPORT_LABEL}
        </button>
      </div>

      {taskCount === 0 ? (
        <p className="backup-actions__empty">{NOTHING_TO_EXPORT}</p>
      ) : null}

      {/* Hidden, because the button above is the control with the label. */}
      <input
        type="file"
        accept={ACCEPT}
        aria-label={FILE_LABEL}
        hidden
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {pendingImport ? (
        <ConfirmDialog
          title={DIALOG_TITLE}
          confirmLabel={CONFIRM_LABEL}
          busyLabel={IMPORTING_LABEL}
          tone="neutral"
          isBusy={isBusy}
          error={error}
          onConfirm={confirmImport}
          onCancel={cancelImport}
        >
          {importBody(pendingImport)}
        </ConfirmDialog>
      ) : null}
    </section>
  )
}

export default BackupActions
