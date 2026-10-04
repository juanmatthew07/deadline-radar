import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { validateTask } from '../../services/taskService.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { toDeadlineInputValue } from '../../utils/date.js'
import { TaskForm } from '../TaskForm.jsx'

const TITLE_ERROR = 'Judul wajib diisi.'
const COURSE_ERROR = 'Mata kuliah wajib diisi.'
const DEADLINE_ERROR = 'Tenggat wajib diisi.'
const SAVE_FAILED = 'Gagal menyimpan. Coba lagi.'
const DEADLINE = '2026-10-10T23:59'

// The form is presentational, so validate and the handlers come in as props.
// validate is the service rule wrapped in a spy, which keeps the messages under
// test identical to the ones the service writes into storage.
function renderForm(overrides = {}) {
  const props = {
    onSubmit: vi.fn().mockResolvedValue({ ok: true }),
    validate: vi.fn(validateTask),
    isSaving: false,
    saveError: null,
    onRetry: vi.fn(),
    onCancel: vi.fn(),
    submitLabel: 'Simpan',
    ...overrides,
  }
  return { ...render(<TaskForm {...props} />), props }
}

// jsdom cannot type into a datetime-local input, so the value is set directly.
function setDeadline(value = DEADLINE) {
  fireEvent.change(screen.getByLabelText('Tenggat'), { target: { value } })
}

async function fillRequiredFields(user) {
  await user.type(screen.getByLabelText('Judul'), 'Esai Fisika')
  await user.type(screen.getByLabelText('Mata kuliah'), 'Fisika Dasar')
  setDeadline()
}

describe('TaskForm labels', () => {
  it('labels every field so each one can be found by its label text', () => {
    renderForm()
    for (const label of ['Judul', 'Mata kuliah', 'Tenggat', 'Prioritas', 'Status', 'Deskripsi']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('marks the three required fields with the word wajib', () => {
    renderForm()
    expect(screen.getAllByText('wajib')).toHaveLength(3)
  })

  it('marks the description with the word opsional', () => {
    renderForm()
    expect(screen.getByText('opsional')).toBeInTheDocument()
  })

  it('marks no field invalid before the user acts', () => {
    renderForm()
    expect(screen.getByLabelText('Judul')).not.toHaveAttribute('aria-invalid')
  })
})

describe('TaskForm defaults in create mode', () => {
  it('starts every text field empty', () => {
    renderForm()
    expect(screen.getByLabelText('Judul')).toHaveValue('')
    expect(screen.getByLabelText('Mata kuliah')).toHaveValue('')
    expect(screen.getByLabelText('Tenggat')).toHaveValue('')
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('')
  })

  it('starts with the Sedang priority selected', () => {
    renderForm()
    const priority = screen.getByLabelText('Prioritas')
    expect(priority).toHaveValue('medium')
    expect(screen.getByRole('option', { name: 'Sedang' }).selected).toBe(true)
  })

  it('starts with the Belum status selected', () => {
    renderForm()
    const status = screen.getByLabelText('Status')
    expect(status).toHaveValue('todo')
    expect(screen.getByRole('option', { name: 'Belum' }).selected).toBe(true)
  })
})

describe('TaskForm validation timing', () => {
  it('shows no message while the user types in a field that was not left', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByLabelText('Judul'), 'Esai')

    expect(screen.queryByText(TITLE_ERROR)).toBeNull()
  })

  it('does not check the values while the user types in an untouched field', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()

    await user.type(screen.getByLabelText('Judul'), 'Esai')

    expect(props.validate).not.toHaveBeenCalled()
  })

  it('shows a message after an empty required field is left', async () => {
    const user = userEvent.setup()
    renderForm()
    const title = screen.getByLabelText('Judul')

    await user.click(title)
    await user.tab()

    expect(screen.getByText(TITLE_ERROR)).toBeInTheDocument()
  })

  it('removes the message as soon as the field is fixed', async () => {
    const user = userEvent.setup()
    renderForm()
    const title = screen.getByLabelText('Judul')

    await user.click(title)
    await user.tab()
    expect(screen.getByText(TITLE_ERROR)).toBeInTheDocument()

    await user.type(title, 'Esai Fisika')

    expect(screen.queryByText(TITLE_ERROR)).toBeNull()
  })

  it('shows the field messages the page hands back from a rejected save', () => {
    renderForm({ fieldErrors: { title: TITLE_ERROR } })
    expect(screen.getByText(TITLE_ERROR)).toBeVisible()
  })
})

describe('TaskForm on a failed submit', () => {
  it('shows a message under each empty required field', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(screen.getByText(TITLE_ERROR)).toBeVisible()
    expect(screen.getByText(COURSE_ERROR)).toBeVisible()
    expect(screen.getByText(DEADLINE_ERROR)).toBeVisible()
  })

  it('links every message to its input and marks that input invalid', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    for (const [label, message] of [
      ['Judul', TITLE_ERROR],
      ['Mata kuliah', COURSE_ERROR],
      ['Tenggat', DEADLINE_ERROR],
    ]) {
      const field = screen.getByLabelText(label)
      const element = screen.getByText(message)
      expect(element).toHaveAttribute('id')
      expect(field).toHaveAttribute('aria-describedby', element.id)
      expect(field).toHaveAttribute('aria-invalid', 'true')
    }
  })

  it('moves focus to the first invalid field', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(document.activeElement).toBe(screen.getByLabelText('Judul'))
  })

  it('does not call onSubmit while the values are not valid', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})

describe('TaskForm on a valid submit', () => {
  it('hands the deadline to onSubmit exactly as it was typed', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(screen.getByLabelText('Tenggat')).toHaveValue(DEADLINE)
    expect(props.onSubmit).toHaveBeenCalledTimes(1)
    expect(props.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: DEADLINE }),
    )
  })

  it('hands every field value to onSubmit', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()
    await fillRequiredFields(user)
    await user.selectOptions(screen.getByLabelText('Prioritas'), 'high')
    await user.selectOptions(screen.getByLabelText('Status'), 'done')
    await user.type(screen.getByLabelText('Deskripsi'), 'Ringkasan gaya.')

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(props.onSubmit).toHaveBeenCalledWith({
      title: 'Esai Fisika',
      course: 'Fisika Dasar',
      deadline: DEADLINE,
      description: 'Ringkasan gaya.',
      priority: 'high',
      status: 'done',
    })
  })
})

describe('TaskForm while saving', () => {
  it('disables the submit button and names the saving state', () => {
    renderForm({ isSaving: true })
    expect(screen.getByRole('button', { name: 'Menyimpan...' })).toBeDisabled()
  })

  it('does not submit again while a save is pending', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ isSaving: true })
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Menyimpan...' }))

    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})

describe('TaskForm after a failed save', () => {
  it('shows the failure message inside an alert', () => {
    renderForm({ saveError: SAVE_FAILED })
    expect(screen.getByRole('alert')).toHaveTextContent(SAVE_FAILED)
  })

  it('hands the current values to the retry action', async () => {
    const user = userEvent.setup()
    const { props } = renderForm({ saveError: SAVE_FAILED })
    await user.type(screen.getByLabelText('Judul'), 'Esai Fisika')

    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(props.onRetry).toHaveBeenCalledTimes(1)
    expect(props.onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Esai Fisika' }),
    )
  })

  it('keeps the typed values when the failure message arrives', async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderForm()
    await user.type(screen.getByLabelText('Judul'), 'Esai Fisika')

    rerender(<TaskForm {...props} saveError={SAVE_FAILED} />)

    expect(screen.getByLabelText('Judul')).toHaveValue('Esai Fisika')
  })

  it('hides the alert once the failure message is gone', () => {
    const { props, rerender } = renderForm({ saveError: SAVE_FAILED })

    rerender(<TaskForm {...props} saveError={null} />)

    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('TaskForm actions', () => {
  it('calls onCancel when the cancel action is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not submit the values when the cancel action is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderForm()
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(props.onSubmit).not.toHaveBeenCalled()
  })
})

describe('TaskForm in edit mode', () => {
  const STORED = createSampleTask({
    id: 'task-1',
    title: 'Esai Fisika',
    course: 'Fisika Dasar',
    description: 'Ringkasan gaya.',
    deadline: '2026-10-10T23:59',
    priority: 'high',
    status: 'in_progress',
  })

  function renderEditForm() {
    return renderForm({
      initialValues: {
        title: STORED.title,
        course: STORED.course,
        description: STORED.description,
        deadline: toDeadlineInputValue(STORED.deadline),
        priority: STORED.priority,
        status: STORED.status,
      },
    })
  }

  it('shows the text values of the task', () => {
    renderEditForm()
    expect(screen.getByLabelText('Judul')).toHaveValue('Esai Fisika')
    expect(screen.getByLabelText('Mata kuliah')).toHaveValue('Fisika Dasar')
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('Ringkasan gaya.')
  })

  it('shows the stored deadline without changing it', () => {
    renderEditForm()
    expect(screen.getByLabelText('Tenggat')).toHaveValue('2026-10-10T23:59')
  })

  it('shows the priority and the status of the task', () => {
    renderEditForm()
    expect(screen.getByLabelText('Prioritas')).toHaveValue('high')
    expect(screen.getByLabelText('Status')).toHaveValue('in_progress')
  })

  it('uses the submit label it was given', () => {
    renderEditForm()
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeInTheDocument()
  })
})