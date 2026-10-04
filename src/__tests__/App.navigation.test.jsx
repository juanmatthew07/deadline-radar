import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'
import { STORAGE_KEY } from '../repository/taskRepository.js'
import { createSampleTask } from '../test/sampleTask.js'

// The shell is exercised as the user meets it: the real service, the real
// repository, and the jsdom localStorage. Only Date is faked, so the urgency of
// the seeded task is decided against this fixed moment while the repository
// latency still uses real timers.
const NOW = new Date(2026, 9, 4, 12, 0)
const STORED = createSampleTask({
  id: 'task-1',
  title: 'Laporan Kimia',
  course: 'Kimia',
  deadline: '2026-10-20T23:59',
})

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// The dashboard is the home screen. It is ready once it has stopped loading,
// which it shows either as the tiles under its heading or as the empty state.
function dashboardReady() {
  return waitFor(() =>
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Ringkasan' }) ??
        screen.queryByText('Belum ada tugas.'),
    ).not.toBeNull(),
  )
}

async function openTasks(user) {
  await user.click(screen.getByRole('button', { name: 'Tugas' }))
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

describe('App navigation', () => {
  it('opens on the dashboard', async () => {
    seed(STORED)
    render(<App />)
    expect(await screen.findByRole('heading', { level: 2, name: 'Ringkasan' })).toBeInTheDocument()
  })

  it('marks the active tab with aria-current and moves the mark', async () => {
    const user = userEvent.setup()
    render(<App />)
    await dashboardReady()
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Tugas' })).not.toHaveAttribute('aria-current')

    await openTasks(user)

    expect(screen.getByRole('button', { name: 'Tugas' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('shows the list screen behind the Tugas tab', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await dashboardReady()

    expect(await openTasks(user)).toBeInTheDocument()
  })

  it('keeps the typed search text through a switch away and back', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await dashboardReady()
    await openTasks(user)
    const search = await screen.findByLabelText('Cari tugas')
    await user.type(search, 'Kimia')

    await user.click(screen.getByRole('button', { name: 'Dashboard' }))
    await dashboardReady()
    await openTasks(user)

    expect(await screen.findByLabelText('Cari tugas')).toHaveValue('Kimia')
  })

  it('offers the add action on both sections and hides it in the form', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await dashboardReady()
    expect(screen.getAllByRole('button', { name: 'Tambah tugas' })).toHaveLength(1)

    await openTasks(user)
    expect(screen.getAllByRole('button', { name: 'Tambah tugas' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Tambah tugas' }))
    await screen.findByRole('heading', { level: 2, name: 'Tambah tugas' })
    expect(screen.queryAllByRole('button', { name: 'Tambah tugas' })).toHaveLength(0)
  })

  it('returns to the dashboard when the form opened there is cancelled', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await dashboardReady()
    await user.click(screen.getByRole('button', { name: 'Tambah tugas' }))
    await screen.findByRole('heading', { level: 2, name: 'Tambah tugas' })

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Ringkasan' })).toBeInTheDocument()
  })

  it('opens an upcoming task from the dashboard and comes back to it', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await screen.findByRole('heading', { level: 2, name: 'Ringkasan' })

    await user.click(screen.getByRole('button', { name: 'Laporan Kimia' }))
    await screen.findByRole('heading', { level: 2, name: 'Laporan Kimia' })

    await user.click(screen.getByRole('button', { name: 'Kembali' }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Ringkasan' })).toBeInTheDocument()
  })

  it('keeps one heading level 1 in every view', async () => {
    const user = userEvent.setup()
    seed(STORED)
    render(<App />)
    await dashboardReady()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    await openTasks(user)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    await user.click(await screen.findByRole('button', { name: 'Laporan Kimia' }))
    await screen.findByRole('heading', { level: 2, name: 'Laporan Kimia' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Ubah' }))
    await screen.findByRole('heading', { level: 2, name: 'Ubah tugas' })
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})