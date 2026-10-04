import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskListPage } from '../TaskListPage.jsx'

// The page runs the real chain: page to hook to service to repository over the
// jsdom localStorage. Only Date is faked, so the urgency of every row is decided
// against this fixed moment while the repository latency still uses real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

// One task per urgency level, in the order they are stored. Nothing sorts yet,
// so the page must keep this order.
const OVERDUE = createSampleTask({
  id: 'task-overdue',
  title: 'Esai Fisika',
  deadline: '2026-10-03T23:59',
})
const DUE_TODAY = createSampleTask({
  id: 'task-today',
  title: 'Laporan Kimia',
  course: 'Kimia',
  deadline: '2026-10-04T23:59',
})
const THIS_WEEK = createSampleTask({
  id: 'task-week',
  title: 'UTS Biologi',
  course: 'Biologi',
  deadline: '2026-10-07T08:00',
})
const LATER = createSampleTask({
  id: 'task-later',
  title: 'Presentasi Matematika',
  course: 'Matematika',
  deadline: '2026-10-20T08:00',
})
const DONE = createSampleTask({
  id: 'task-done',
  title: 'Tugas Kosakata',
  course: 'Bahasa',
  deadline: '2026-10-01T08:00',
  status: 'done',
})

// Catches emoji and pictographic symbols in rendered text.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function blockStorage() {
  return vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
  })
}

// The urgency badge is a plain span without an ARIA role, so its data attribute
// is the only handle for that label alone.
function urgencyIn(row) {
  return row.querySelector('[data-urgency]')
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

describe('TaskListPage heading', () => {
  it('shows exactly one heading level 1 with the app name', async () => {
    render(<TaskListPage />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('DeadlineRadar')
  })
})

describe('TaskListPage with stored tasks', () => {
  it('shows one row per stored task', async () => {
    seed(OVERDUE, DUE_TODAY, THIS_WEEK, LATER, DONE)
    render(<TaskListPage />)
    expect(await screen.findAllByRole('listitem')).toHaveLength(5)
  })

  it('labels every row with the Indonesian label of its urgency', async () => {
    seed(OVERDUE, DUE_TODAY, THIS_WEEK, LATER, DONE)
    render(<TaskListPage />)
    const rows = await screen.findAllByRole('listitem')
    const labelled = rows.map((row) => {
      const badge = urgencyIn(row)
      return [badge.getAttribute('data-urgency'), badge.textContent]
    })
    expect(labelled).toEqual([
      ['overdue', 'Terlambat'],
      ['due_today', 'Hari ini'],
      ['this_week', 'Minggu ini'],
      ['later', 'Nanti'],
      ['done', 'Selesai'],
    ])
  })

  it('shows the title, course, and status of the first task', async () => {
    seed(DUE_TODAY)
    render(<TaskListPage />)
    const [row] = await screen.findAllByRole('listitem')
    expect(within(row).getByRole('heading', { level: 3 })).toHaveTextContent('Laporan Kimia')
    expect(within(row).getByText('Kimia')).toBeInTheDocument()
    expect(within(row).getByText('Belum')).toBeInTheDocument()
  })

  it('shows the deadline of a task inside a time element', async () => {
    seed(DUE_TODAY)
    render(<TaskListPage />)
    const [row] = await screen.findAllByRole('listitem')
    const deadline = within(row).getByText(/2026/)
    expect(deadline.tagName).toBe('TIME')
    expect(deadline).toHaveAttribute('datetime', '2026-10-04T23:59')
  })

  it('renders no emoji and no exclamation mark in the list', async () => {
    seed(OVERDUE, DUE_TODAY, THIS_WEEK, LATER, DONE)
    render(<TaskListPage />)
    await screen.findAllByRole('listitem')
    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})

describe('TaskListPage without stored tasks', () => {
  it('shows the empty state and one add action', async () => {
    render(<TaskListPage />)
    expect(await screen.findByText('Belum ada tugas.')).toBeInTheDocument()
    expect(screen.getByText('Tambah tugas pertamamu.')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Tambah tugas' })).toBeInTheDocument()
  })

  it('calls the onAddTask handler when the add button is clicked', async () => {
    const user = userEvent.setup()
    const onAddTask = vi.fn()
    render(<TaskListPage onAddTask={onAddTask} />)
    await user.click(await screen.findByRole('button', { name: 'Tambah tugas' }))
    expect(onAddTask).toHaveBeenCalledTimes(1)
  })

  it('renders no emoji and no exclamation mark in the empty state', async () => {
    render(<TaskListPage />)
    await screen.findByText('Belum ada tugas.')
    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})

describe('TaskListPage when storage cannot be read', () => {
  it('shows the failure message inside an alert', async () => {
    blockStorage()
    render(<TaskListPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Penyimpanan tidak tersedia. Coba lagi.',
    )
  })

  it('renders no emoji and no exclamation mark in the failure state', async () => {
    blockStorage()
    render(<TaskListPage />)
    await screen.findByRole('alert')
    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })

  it('shows the list after a retry once storage works again', async () => {
    const user = userEvent.setup()
    const blocked = blockStorage()
    seed(DUE_TODAY)
    render(<TaskListPage />)
    await screen.findByRole('alert')

    blocked.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByText('Laporan Kimia')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})