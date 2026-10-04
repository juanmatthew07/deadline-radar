import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import { STORAGE_KEY } from '../repository/taskRepository.js'
import { createSampleTask } from '../test/sampleTask.js'

// The app is exercised as the user meets it: the real service, the real
// repository, and the jsdom localStorage. Nothing is mocked except time.
const DEADLINE = '2026-10-10T23:59'
const STORED = createSampleTask({ id: 'task-1', title: 'Laporan Kimia' })

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function stored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

// The empty state carries its own add action, so the bar and the state can both
// match the same name.
function addButtons() {
  return screen.queryAllByRole('button', { name: 'Tambah tugas' })
}

function formHeading() {
  return screen.queryByRole('heading', { level: 2 })
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

// Waits for the list to have settled, so the empty state is not read too early.
async function waitForEmptyState() {
  await screen.findByText('Belum ada tugas.')
}

async function openForm(user) {
  await waitForEmptyState()
  await user.click(addButtons()[0])
  await waitFor(() => expect(formHeading()).toHaveTextContent('Tambah tugas'))
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('App in the list view', () => {
  it('shows the empty state when nothing has been stored', async () => {
    render(<App />)
    expect(await screen.findByText('Belum ada tugas.')).toBeInTheDocument()
  })

  it('offers the add action in the top bar and in the empty state', async () => {
    render(<App />)
    await waitForEmptyState()
    expect(addButtons()).toHaveLength(2)
  })

  it('shows the stored tasks as rows', async () => {
    seed(STORED)
    render(<App />)
    expect(await screen.findByText('Laporan Kimia')).toBeInTheDocument()
  })

  it('keeps one heading level 1 in the list view', async () => {
    seed(STORED)
    render(<App />)
    await screen.findByText('Laporan Kimia')
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('DeadlineRadar')
  })

  it('renders no emoji and no exclamation mark in the list view', async () => {
    render(<App />)
    await waitForEmptyState()
    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})

describe('App opening the form', () => {
  it('opens the form from the top bar add action', async () => {
    const user = userEvent.setup()
    render(<App />)

    await openForm(user)

    expect(formHeading()).toHaveTextContent('Tambah tugas')
  })

  it('hides the add actions while the form is open', async () => {
    const user = userEvent.setup()
    render(<App />)

    await openForm(user)

    expect(addButtons()).toHaveLength(0)
  })

  it('renders no emoji and no exclamation mark in the form view', async () => {
    const user = userEvent.setup()
    render(<App />)

    await openForm(user)

    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })

  it('keeps one heading level 1 in the form view', async () => {
    const user = userEvent.setup()
    render(<App />)

    await openForm(user)

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('DeadlineRadar')
  })

  it('returns to the list when the form is cancelled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    await waitForEmptyState()
  })

  it('stores nothing when the form is cancelled', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    await waitForEmptyState()
    expect(stored()).toBeNull()
  })
})

describe('App adding a task', () => {
  it('shows the new task in the list after the save', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText('Esai Fisika')).toBeInTheDocument()
  })

  it('shows the stored task when the app is loaded again', async () => {
    const user = userEvent.setup()
    const first = render(<App />)
    await openForm(user)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await screen.findByText('Esai Fisika')

    first.unmount()
    render(<App />)

    expect(await screen.findByText('Esai Fisika')).toBeInTheDocument()
  })

  it('renders the saved task as a row that opens in the list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Esai Fisika' })).toBeInTheDocument(),
    )
  })

  it('announces the save with a short notice inside a status role', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(screen.getByText('Tugas disimpan.')).toHaveAttribute('role', 'status'))
  })

  it('returns to the list view after the save', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)

    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    await waitFor(() => expect(screen.getByText('Esai Fisika')).toBeInTheDocument())
    expect(screen.queryByLabelText('Judul')).toBeNull()
  })

  it('clears the notice when the form opens again', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))
    await screen.findByText('Tugas disimpan.')

    await user.click(addButtons()[0])

    expect(screen.queryByText('Tugas disimpan.')).toBeNull()
  })

  it('keeps the notice on screen after the list reloads', async () => {
    const user = userEvent.setup()
    render(<App />)
    await openForm(user)
    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    await screen.findByText('Esai Fisika')

    expect(screen.getByText('Tugas disimpan.')).toBeInTheDocument()
  })
})