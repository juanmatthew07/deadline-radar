import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskFormPage } from '../TaskFormPage.jsx'

// The page runs the real chain: form to hook to service to repository over the
// jsdom localStorage, so every save waits the simulated repository latency. Only
// Date is faked, and only in the test that reads a timestamp.
const DEADLINE = '2026-10-10T23:59'
const EDIT_INSTANT = new Date(2026, 9, 5, 9, 0)

const STORED = createSampleTask({
  id: 'task-1',
  title: 'Esai Fisika',
  course: 'Fisika Dasar',
  description: 'Ringkasan gaya.',
  deadline: DEADLINE,
  priority: 'high',
  status: 'in_progress',
})

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function stored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

function blockWrites() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
  })
}

// jsdom cannot type into a datetime-local input, so the value is set directly.
function setDeadline(value = DEADLINE) {
  fireEvent.change(screen.getByLabelText('Tenggat'), { target: { value } })
}

async function fillRequiredFields(user, title = 'Esai Fisika') {
  await user.type(screen.getByLabelText('Judul'), title)
  await user.type(screen.getByLabelText('Mata kuliah'), 'Fisika Dasar')
  setDeadline()
}

function submit(user) {
  return user.click(screen.getByRole('button', { name: 'Simpan' }))
}

// onSaved only runs once the write has settled, so waiting on it keeps every
// assertion about storage from reading a half finished save.
async function submitAndWait(user, onSaved) {
  await submit(user)
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))
  return onSaved.mock.calls[0][0]
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('TaskFormPage heading', () => {
  it('names the create screen in create mode', () => {
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Tambah tugas')
  })

  it('names the edit screen in edit mode', () => {
    render(<TaskFormPage task={STORED} onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Ubah tugas')
  })

  it('moves focus to the heading on mount', () => {
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 }))
  })
})

describe('TaskFormPage create flow', () => {
  it('reports the saved task to the caller', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    const saved = await submitAndWait(user, onSaved)

    expect(saved).toMatchObject({
      title: 'Esai Fisika',
      course: 'Fisika Dasar',
      deadline: DEADLINE,
    })
  })

  it('stores exactly one task in create mode', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submitAndWait(user, onSaved)

    expect(stored()).toHaveLength(1)
  })

  it('shows no failure message after a successful create', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submitAndWait(user, onSaved)

    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('stores the trimmed values it received', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('Judul'), '  Esai Fisika  ')
    await user.type(screen.getByLabelText('Mata kuliah'), '  Fisika Dasar  ')
    setDeadline()

    await submitAndWait(user, onSaved)

    expect(stored()[0].title).toBe('Esai Fisika')
    expect(stored()[0].course).toBe('Fisika Dasar')
  })

  it('stores the default status and priority of a new task', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submitAndWait(user, onSaved)

    expect(stored()[0].status).toBe('todo')
    expect(stored()[0].priority).toBe('medium')
  })

  it('stores the deadline exactly as it was typed', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submitAndWait(user, onSaved)

    expect(stored()[0].deadline).toBe(DEADLINE)
  })
})

describe('TaskFormPage edit flow', () => {
  function renderEditPage() {
    seed(STORED)
    const onSaved = vi.fn()
    const onCancel = vi.fn()
    render(<TaskFormPage task={STORED} onSaved={onSaved} onCancel={onCancel} />)
    return { onSaved, onCancel }
  }

  it('reports the edited task to the caller', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Esai Baru')

    const saved = await submitAndWait(user, onSaved)

    expect(saved).toMatchObject({ id: 'task-1', title: 'Esai Baru' })
  })

  it('replaces the stored task instead of adding one', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Esai Baru')

    await submitAndWait(user, onSaved)

    expect(stored()).toHaveLength(1)
  })

  it('stores the new title of the edited task', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Esai Baru')

    await submitAndWait(user, onSaved)

    expect(stored()[0].title).toBe('Esai Baru')
  })

  it('keeps the id and the created time of the edited task', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Esai Baru')

    await submitAndWait(user, onSaved)

    expect(stored()[0].id).toBe('task-1')
    expect(stored()[0].createdAt).toBe(STORED.createdAt)
  })

  it('moves the updated time to the moment of the save', async () => {
    const user = userEvent.setup()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(EDIT_INSTANT)
    const { onSaved } = renderEditPage()

    await submitAndWait(user, onSaved)

    expect(stored()[0].updatedAt).toBe(EDIT_INSTANT.toISOString())
  })

  it('keeps the deadline of the edited task unchanged', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    expect(screen.getByLabelText('Tenggat')).toHaveValue(DEADLINE)

    await submitAndWait(user, onSaved)

    expect(stored()[0].deadline).toBe(DEADLINE)
  })

  it('keeps the priority and the status of the edited task', async () => {
    const user = userEvent.setup()
    const { onSaved } = renderEditPage()
    await user.selectOptions(screen.getByLabelText('Prioritas'), 'low')
    await user.selectOptions(screen.getByLabelText('Status'), 'done')

    await submitAndWait(user, onSaved)

    expect(stored()[0].priority).toBe('low')
    expect(stored()[0].status).toBe('done')
  })
})

describe('TaskFormPage when the write fails', () => {
  it('shows the failure message inside an alert', async () => {
    const user = userEvent.setup()
    blockWrites()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Gagal menyimpan. Coba lagi.',
    )
  })

  it('offers a retry action with the failure message', async () => {
    const user = userEvent.setup()
    blockWrites()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submit(user)
    await screen.findByRole('alert')

    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })

  it('keeps every typed value after the failure', async () => {
    const user = userEvent.setup()
    blockWrites()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submit(user)
    await screen.findByRole('alert')

    expect(screen.getByLabelText('Judul')).toHaveValue('Esai Fisika')
    expect(screen.getByLabelText('Mata kuliah')).toHaveValue('Fisika Dasar')
    expect(screen.getByLabelText('Tenggat')).toHaveValue(DEADLINE)
  })

  it('saves nothing until the retry succeeds', async () => {
    const user = userEvent.setup()
    blockWrites()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submit(user)
    await screen.findByRole('alert')

    expect(stored()).toBeNull()
  })

  it('saves on retry once storage works again', async () => {
    const user = userEvent.setup()
    const blocked = blockWrites()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)
    await submit(user)
    await screen.findByRole('alert')

    blocked.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1))

    expect(stored()).toHaveLength(1)
  })

  it('does not report the saved task while the write keeps failing', async () => {
    const user = userEvent.setup()
    blockWrites()
    const onSaved = vi.fn()
    render(<TaskFormPage onSaved={onSaved} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await submit(user)
    await screen.findByRole('alert')

    expect(onSaved).not.toHaveBeenCalled()
  })
})

describe('TaskFormPage actions', () => {
  it('calls the cancel handler when the cancel action is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('writes nothing when the form is cancelled', async () => {
    const user = userEvent.setup()
    render(<TaskFormPage onSaved={vi.fn()} onCancel={vi.fn()} />)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(stored()).toBeNull()
  })
})