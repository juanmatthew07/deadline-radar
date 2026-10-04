import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import './DeleteDialog.css'

const TITLE_LABEL = 'Hapus tugas?'
const CANCEL_LABEL = 'Batal'
const CONFIRM_LABEL = 'Hapus'
const DELETING_LABEL = 'Menghapus...'
const CANNOT_BE_UNDONE = 'tidak dapat dibatalkan'

// The confirmation names the task and says the action cannot be undone. Nothing
// anywhere else deletes a task, so this is the only way one is removed.
function bodyText(title) {
  return `Tugas "${title}" akan dihapus dan ${CANNOT_BE_UNDONE}.`
}

// The one overlay of the app, mounted through a portal so it sits above the
// page instead of inside it. The backdrop carries no action: cancelling is the
// Batal button and nothing else.
export function DeleteDialog({ task, isDeleting = false, error = null, onConfirm, onCancel }) {
  const panelRef = useRef(null)
  const cancelRef = useRef(null)
  const headingId = useId()
  const bodyId = useId()

  // Mount only. The opener is read before the focus moves into the panel, and
  // gets the focus back on close unless it has left the document by then.
  useEffect(() => {
    const opener = document.activeElement
    cancelRef.current?.focus()

    return () => {
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus()
    }
  }, [])

  // Re-attached whenever the state of the actions changes, so Escape and Tab
  // always follow what can be pressed right now.
  useEffect(() => {
    function focusableButtons() {
      if (!panelRef.current) return []
      return Array.from(panelRef.current.querySelectorAll('button:not([disabled])'))
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        // A delete in flight cannot be called off halfway.
        if (isDeleting) return
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const buttons = focusableButtons()
      // Both actions are disabled while the delete runs, so there is nowhere to
      // move to and the focus stays inside the panel.
      if (buttons.length === 0) {
        event.preventDefault()
        return
      }

      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      const active = document.activeElement

      // Focus left the panel, so the first Tab brings it back to the first
      // button and the first Shift+Tab to the last one.
      if (!buttons.includes(active)) {
        event.preventDefault()
        const target = event.shiftKey ? last : first
        target.focus()
        return
      }

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDeleting, onCancel])

  return createPortal(
    <div className="delete-dialog__backdrop">
      <div
        className="delete-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        ref={panelRef}
      >
        <h2 className="delete-dialog__title" id={headingId}>
          {TITLE_LABEL}
        </h2>
        <p className="delete-dialog__body" id={bodyId}>
          {bodyText(task.title)}
        </p>
        {error ? (
          <p className="delete-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="delete-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={isDeleting}
            ref={cancelRef}
          >
            {CANCEL_LABEL}
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? DELETING_LABEL : CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default DeleteDialog