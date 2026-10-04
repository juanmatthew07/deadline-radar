import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'
import { TriangleAlert } from './icons.js'
import './ConfirmDialog.css'

const CANCEL_LABEL = 'Batal'

// The one overlay of the app, mounted through a portal so it sits above the page
// instead of inside it. Two tones: danger for the delete confirmation, neutral
// for the import one. The backdrop carries no action, because cancelling is the
// Batal button and nothing else.
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel,
  tone = 'danger',
  isBusy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  const panelRef = useRef(null)
  const cancelRef = useRef(null)
  const headingId = useId()
  const bodyId = useId()
  const isDanger = tone === 'danger'

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
        // A run in flight cannot be called off halfway.
        if (isBusy) return
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') return

      const buttons = focusableButtons()
      // Both actions are disabled while the run is pending, so there is nowhere
      // to move to and the focus stays inside the panel.
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
  }, [isBusy, onCancel])

  return createPortal(
    <div className="confirm-dialog__backdrop">
      <div
        className="confirm-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        ref={panelRef}
      >
        <h2 className="confirm-dialog__title" id={headingId}>
          {isDanger ? (
            <Icon as={TriangleAlert} className="confirm-dialog__icon--danger" />
          ) : null}
          {title}
        </h2>
        <p className="confirm-dialog__body" id={bodyId}>
          {children}
        </p>
        {error ? (
          <p className="confirm-dialog__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onCancel}
            disabled={isBusy}
            ref={cancelRef}
          >
            {CANCEL_LABEL}
          </button>
          <button
            type="button"
            className={
              isDanger ? 'button button--danger-filled' : 'button button--primary'
            }
            onClick={onConfirm}
            disabled={isBusy}
          >
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ConfirmDialog
