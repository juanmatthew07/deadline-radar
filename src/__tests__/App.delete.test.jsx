import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import { STORAGE_KEY } from '../repository/taskRepository.js'
import { createSampleTask } from '../test/sampleTask.js'

// The delete flow is exercised through the whole app: the real service, the real
// repository and the jsdom localStorage. Only Date is faked, so the urgency and
// the order of the list are decided against this moment while the repository
// latency still runs on real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

const FIRST = createSampleTask({
  id: 'task-1',
  title: 'Esai Fisika',
  course: 'Fisika Dasar',
  deadline: '2026-10-04T23:59',
})
const SECOND = createSampleTask({
  id: 'task-2',
  title: 'Laporan Kimia',
  course: 'Kimia',
  deadline: '2026-10-06T08:00',
})
const THIRD = createSampleTask({
  id: 'task-3',
  title: 'UTS Biologi',
  course: 'Biologi',
  deadline: '2026-10-09T08:00',
})

const ALL = [FIRST, SECOND, THIRD]
const DELETE_BODY = 'Tugas "Esai Fisika" akan dihapus dan tidak dapat dibatalkan.'

// Catches emoji and pictographic symbols in rendered text.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

// The dashboard is the home screen, so every test about the list opens it
// through the navigation first.
async function openList(user) {
  await user.click(screen.getByRole('button', { name: 'Tugas' }))
  return screen.findByRole('heading', { level: 2, name: 'Daftar tugas' })
}

// Opens one task from the list and waits for the detail screen.
async function openDetail(user, title) {
  await user.click(await screen.findByRole('button', { name: title }))
  return screen.findByRole('heading', { level: 2, name: title })
}

// The detail screen and the dialog both carry an action named Hapus, so the
// confirm button is always looked up inside the dialog.
async function openDeleteDialog(user) {
  await user.click(screen.getByRole('button', { name: 'Hapus' }))
  return screen.findByRole('dialog', { name: 'Hapus tugas?' })
}

async function confirmDelete(user, dialog) {
  await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
  return screen.findByRole('heading', { level: 2, name: 'Daftar tugas' })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('the detail screen of the app', () => {
  it('shows the task that was opened from the list', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)

    await openDetail(user, 'Esai Fisika')

    expect(screen.getByRole('button', { name: 'Ubah' })).toBeInTheDocument()
    expect(screen.getByText('Fisika Dasar')).toBeInTheDocument()
  })

  it('hides the top bar add action, which belongs to the two sections', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    expect(screen.queryAllByRole('button', { name: 'Tambah tugas' })).toHaveLength(0)
  })

  it('keeps the one heading level 1 of the app', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('DeadlineRadar')
  })

  it('returns to the list when Kembali is pressed', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    await user.click(screen.getByRole('button', { name: 'Kembali' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Daftar tugas' })).toBeInTheDocument()
    // The rows arrive after the read of the list, so the wait is on a row.
    expect(await screen.findByRole('button', { name: 'Esai Fisika' })).toBeInTheDocument()
  })

  it('renders no emoji and no exclamation mark on the detail screen', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })

  it('renders no emoji and no exclamation mark while the confirmation is open', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    await openDeleteDialog(user)

    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})

describe('editing from the detail screen of the app', () => {
  it('opens the form filled with the task on screen', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    await user.click(screen.getByRole('button', { name: 'Ubah' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Ubah tugas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Judul')).toHaveValue('Esai Fisika')
    expect(screen.getByLabelText('Mata kuliah')).toHaveValue('Fisika Dasar')
  })

  it('returns to the detail of the same task when the form is cancelled', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    await user.click(screen.getByRole('button', { name: 'Ubah' }))
    await screen.findByRole('heading', { level: 2, name: 'Ubah tugas' })

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Esai Fisika' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hapus' })).toBeInTheDocument()
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2', 'task-3'])
  })

  it('returns to the list with the new title and a notice when the change is saved', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    await user.click(screen.getByRole('button', { name: 'Ubah' }))
    await screen.findByRole('heading', { level: 2, name: 'Ubah tugas' })

    await user.clear(screen.getByLabelText('Judul'))
    await user.type(screen.getByLabelText('Judul'), 'Esai Fisika Revisi')
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Daftar tugas' })).toBeInTheDocument()
    expect(await screen.findByText('Esai Fisika Revisi')).toBeInTheDocument()
    expect(screen.getByText('Tugas disimpan.')).toHaveAttribute('role', 'status')
  })
})

describe('deleting from the detail screen of the app', () => {
  it('asks for a confirmation that names the task', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')

    const dialog = await openDeleteDialog(user)

    expect(dialog).toHaveAccessibleDescription(DELETE_BODY)
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2', 'task-3'])
  })

  it('changes nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    const dialog = await openDeleteDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2', 'task-3'])
    expect(screen.getByRole('heading', { level: 2, name: 'Esai Fisika' })).toBeInTheDocument()
  })

  it('removes the task from the list and keeps the other two', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    const dialog = await openDeleteDialog(user)

    await confirmDelete(user, dialog)

    // The remaining rows arrive after the reload of the list.
    expect(await screen.findByText('Laporan Kimia')).toBeInTheDocument()
    expect(screen.queryByText('Esai Fisika')).toBeNull()
    expect(screen.getByText('UTS Biologi')).toBeInTheDocument()
    expect(readStored().map((task) => task.id)).toEqual(['task-2', 'task-3'])
  })

  it('announces the delete with a short notice inside a status role', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    const dialog = await openDeleteDialog(user)

    await confirmDelete(user, dialog)

    expect(await screen.findByText('Tugas dihapus.')).toHaveAttribute('role', 'status')
  })

  it('has no trace of the task left once the app is loaded again', async () => {
    const user = userEvent.setup()
    seed(...ALL)
    const first = render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    const dialog = await openDeleteDialog(user)
    await confirmDelete(user, dialog)
    await waitFor(() => expect(screen.queryByText('Esai Fisika')).toBeNull())

    first.unmount()
    render(<App />)
    await openList(user)

    expect(await screen.findByText('Laporan Kimia')).toBeInTheDocument()
    expect(screen.queryByText('Esai Fisika')).toBeNull()
    expect(screen.getByText('UTS Biologi')).toBeInTheDocument()
  })

  it('lands on the empty state when the last task is deleted', async () => {
    const user = userEvent.setup()
    seed(FIRST)
    render(<App />)
    await openList(user)
    await openDetail(user, 'Esai Fisika')
    const dialog = await openDeleteDialog(user)

    await confirmDelete(user, dialog)

    expect(await screen.findByText('Belum ada tugas.')).toBeInTheDocument()
    expect(screen.getByText('Tugas dihapus.')).toHaveAttribute('role', 'status')
    expect(readStored()).toEqual([])
  })
})