import { useId, useState } from 'react'
import {
  DEFAULT_PRIORITY,
  DEFAULT_STATUS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from '../utils/constants.js'
import './TaskForm.css'

const REQUIRED_MARK = 'wajib'
const OPTIONAL_MARK = 'opsional'
const SUBMIT_LABEL = 'Simpan'
const SAVING_LABEL = 'Menyimpan...'
const CANCEL_LABEL = 'Batal'
const RETRY_LABEL = 'Coba lagi'

// Create mode starts here. Edit mode passes the task instead.
const BLANK_VALUES = {
  title: '',
  course: '',
  deadline: '',
  description: '',
  priority: DEFAULT_PRIORITY,
  status: DEFAULT_STATUS,
}

// One descriptor per field, in the order the form shows them. Rendering from
// this list keeps the label, the id, and the message wired the same way for
// every field, and keeps the two modes on one markup.
const FIELDS = [
  { name: 'title', label: 'Judul', mark: REQUIRED_MARK, control: 'input', type: 'text' },
  { name: 'course', label: 'Mata kuliah', mark: REQUIRED_MARK, control: 'input', type: 'text' },
  {
    name: 'deadline',
    label: 'Tenggat',
    mark: REQUIRED_MARK,
    control: 'input',
    type: 'datetime-local',
  },
  { name: 'priority', label: 'Prioritas', control: 'select', options: PRIORITY_LABELS },
  { name: 'status', label: 'Status', control: 'select', options: STATUS_LABELS },
  { name: 'description', label: 'Deskripsi', mark: OPTIONAL_MARK, control: 'textarea' },
]

// The three controls differ only in the element and its options, so they share
// one set of props from the field loop.
function renderControl(field, shared) {
  if (field.control === 'select') {
    return (
      <select {...shared}>
        {Object.entries(field.options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    )
  }

  if (field.control === 'textarea') {
    return <textarea {...shared} rows={4} />
  }

  return <input {...shared} type={field.type} />
}

// One form for create and edit. It owns the values and which fields the user
// has left, while the save itself and its messages come from the page.
export function TaskForm({
  initialValues,
  onSubmit,
  validate,
  isSaving,
  saveError,
  fieldErrors = {},
  onRetry,
  onCancel,
  submitLabel = SUBMIT_LABEL,
}) {
  // One prefix per form, so every label, control, and message id is unique.
  const idPrefix = useId()

  const [values, setValues] = useState(() => ({ ...BLANK_VALUES, ...initialValues }))
  const [touched, setTouched] = useState({})
  const [edited, setEdited] = useState({})
  const [errors, setErrors] = useState({})
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Checks one field against the whole set of values, because the rules can
  // look at more than the field on its own.
  function revalidate(field, nextValues) {
    const message = validate(nextValues)[field]
    setErrors((previous) => {
      const next = { ...previous }
      if (message === undefined) delete next[field]
      else next[field] = message
      return next
    })
  }

  // The page can hand back the messages of a rejected save. They show as they
  // are, until the user edits that field and the local check takes over.
  function messageFor(field) {
    if (!touched[field] && !submitAttempted && !fieldErrors[field]) return undefined
    if (errors[field]) return errors[field]
    if (edited[field]) return undefined
    return fieldErrors[field]
  }

  function handleChange(field) {
    return (event) => {
      const next = { ...values, [field]: event.target.value }
      setValues(next)
      setEdited((previous) => ({ ...previous, [field]: true }))
      // Nothing is checked per keystroke, except a field that is already
      // showing a message, which then clears as soon as it is fixed.
      if (messageFor(field)) revalidate(field, next)
    }
  }

  function handleBlur(field) {
    return () => {
      setTouched((previous) => ({ ...previous, [field]: true }))
      revalidate(field, values)
    }
  }

  // Focus by the id the field already carries, so the form keeps no ref for a
  // control it only reaches on a failed submit.
  function focusFirstInvalid(found) {
    const first = FIELDS.find((field) => found[field.name])
    if (first) document.getElementById(`${idPrefix}${first.name}`)?.focus()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSaving) return

    const found = validate(values)
    setSubmitAttempted(true)
    setErrors(found)
    focusFirstInvalid(found)
    if (Object.keys(found).length > 0) return

    try {
      await onSubmit(values)
    } catch {
      // The page owns the outcome and the hook turns a failure into a message,
      // so a rejection here carries nothing new to show.
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit} noValidate>
      {FIELDS.map((field) => {
        const name = field.name
        const id = `${idPrefix}${name}`
        const messageId = `${id}-message`
        const message = messageFor(name)

        return (
          <div className="task-form__field" key={name}>
            <div className="task-form__label-row">
              <label className="task-form__label" htmlFor={id}>
                {field.label}
              </label>
              {field.mark ? <span className="task-form__mark">{field.mark}</span> : null}
            </div>
            {renderControl(field, {
              id,
              name,
              className: 'task-form__control',
              value: values[name] ?? '',
              onChange: handleChange(name),
              onBlur: handleBlur(name),
              'aria-invalid': message ? 'true' : undefined,
              'aria-describedby': message ? messageId : undefined,
            })}
            {message ? (
              <p className="task-form__error" id={messageId}>
                {message}
              </p>
            ) : null}
          </div>
        )
      })}

      {saveError ? (
        <div className="task-form__failure" role="alert">
          <p className="task-form__failure-message">{saveError}</p>
          {onRetry ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={() => onRetry(values)}
            >
              {RETRY_LABEL}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="task-form__actions">
        <button type="submit" className="button button--primary" disabled={isSaving}>
          {isSaving ? SAVING_LABEL : submitLabel}
        </button>
        <button type="button" className="button button--secondary" onClick={onCancel}>
          {CANCEL_LABEL}
        </button>
      </div>
    </form>
  )
}

export default TaskForm
