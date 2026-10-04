import { useEffect, useRef, useState } from 'react'
import TaskForm from '../components/TaskForm.jsx'
import { useTaskForm } from '../hooks/useTaskForm.js'
import { toDeadlineInputValue } from '../utils/date.js'
import './TaskFormPage.css'

const CREATE_TITLE = 'Tambah tugas'
const EDIT_TITLE = 'Ubah tugas'
const SUBMIT_LABEL = 'Simpan'

// The create and edit screen, a page under the same top bar and not a modal.
// It composes the form and the hook, and holds no data logic of its own.
export function TaskFormPage({ task, onSaved, onCancel }) {
  const headingRef = useRef(null)
  // Messages of a save the service refused, shown on the matching fields.
  const [fieldErrors, setFieldErrors] = useState({})
  const { validate, save, isSaving, saveError } = useTaskForm(task)

  // The screen opens on its own heading, so the keyboard and a screen reader
  // start here instead of back at the top bar.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function handleSubmit(values) {
    const result = await save(values)

    if (result.ok) {
      onSaved(result.task)
      return
    }

    setFieldErrors(result.fieldErrors ?? {})
  }

  // No task means create mode, so the form falls back to its own defaults. The
  // stored deadline is already a datetime-local value and stays as it is.
  const initialValues = task
    ? {
        title: task.title ?? '',
        course: task.course ?? '',
        deadline: toDeadlineInputValue(task.deadline),
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
      }
    : undefined

  return (
    <main className="task-form-page">
      <h2 className="task-form-page__title" tabIndex={-1} ref={headingRef}>
        {task ? EDIT_TITLE : CREATE_TITLE}
      </h2>
      <TaskForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onRetry={handleSubmit}
        validate={validate}
        isSaving={isSaving}
        saveError={saveError}
        fieldErrors={fieldErrors}
        onCancel={onCancel}
        submitLabel={SUBMIT_LABEL}
      />
    </main>
  )
}

export default TaskFormPage
