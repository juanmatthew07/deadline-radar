import ConfirmDialog from './ConfirmDialog.jsx'

const TITLE_LABEL = 'Hapus tugas?'
const CONFIRM_LABEL = 'Hapus'
const DELETING_LABEL = 'Menghapus...'
const CANNOT_BE_UNDONE = 'tidak dapat dibatalkan'

// The confirmation names the task and says the action cannot be undone. Nothing
// anywhere else deletes a task, so this is the only way one is removed. The
// behaviour and the overlay live in the shared ConfirmDialog.
function bodyText(title) {
  return `Tugas "${title}" akan dihapus dan ${CANNOT_BE_UNDONE}.`
}

export function DeleteDialog({ task, isDeleting = false, error = null, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      title={TITLE_LABEL}
      confirmLabel={CONFIRM_LABEL}
      busyLabel={DELETING_LABEL}
      tone="danger"
      isBusy={isDeleting}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      {bodyText(task.title)}
    </ConfirmDialog>
  )
}

export default DeleteDialog
