import { useEffect, useRef, useState } from 'react'
import DeleteDialog from '../components/DeleteDialog.jsx'
import TaskDetail from '../components/TaskDetail.jsx'
import { useDeleteTask } from '../hooks/useDeleteTask.js'
import './TaskDetailPage.css'

// The screen for one task, a page under the same top bar and not a modal. It
// composes the detail component and the confirmation dialog, while the hook
// holds the async state of the delete.
export function TaskDetailPage({ task, onEdit, onBack, onDeleted }) {
  const containerRef = useRef(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { remove, isDeleting, error, clearError } = useDeleteTask()

  // The screen opens on its own heading, so the keyboard and a screen reader
  // start here instead of back at the top bar. The heading belongs to the
  // component below, so it is looked up instead of held in a ref of its own.
  useEffect(() => {
    containerRef.current?.querySelector('h2')?.focus()
  }, [])

  function openDialog() {
    // A message of an earlier attempt never greets the next one.
    clearError()
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
  }

  async function handleConfirm() {
    const result = await remove(task.id)

    // On a failure the dialog stays open with its message, so only a success
    // reports back and lets the caller leave the screen.
    if (result.ok) onDeleted()
  }

  return (
    <main className="task-detail-page" ref={containerRef}>
      <TaskDetail task={task} onEdit={onEdit} onDelete={openDialog} onBack={onBack} />
      {isDialogOpen ? (
        <DeleteDialog
          task={task}
          isDeleting={isDeleting}
          error={error}
          onConfirm={handleConfirm}
          onCancel={closeDialog}
        />
      ) : null}
    </main>
  )
}

export default TaskDetailPage