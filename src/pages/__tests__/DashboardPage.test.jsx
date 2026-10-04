import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { DashboardPage } from '../DashboardPage.jsx'

// The page runs the real chain: page to hook to service to repository over the
// jsdom localStorage. Only Date is faked, so every count is decided against this
// fixed moment while the repository latency still uses real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

// A mix that puts one task in each urgency level and a second one overdue.
const OVERDUE = createSampleTask({
  id: 'task-overdue-1',
  title: 'Esai Fisika',
  course: 'Fisika',
  deadline: '2026-10-03T23:59',
})
const ALSO_OVERDUE = createSampleTask({
  id: 'task-overdue-2',
  title: 'Laporan Kimia',
  course: 'Kimia',
  deadline: '2026-10-01T08:00',
})
const DUE_TODAY = createSampleTask({
  id: 'task-today',
  title: 'UTS Biologi',
  course: 'Biologi',
  deadline: '2026-10-04T23:59',
})
const THIS_WEEK = createSampleTask({
  id: 'task-week',
  title: 'Presentasi Matematika',
  course: 'Matematika',
  deadline: '2026-10-07T08:00',
})
const LATER = createSampleTask({
  id: 'task-later',
  title: 'Makalah Bahasa',
  course: 'Bahasa',
  deadline: '2026-10-20T08:00',
})
const DONE = createSampleTask({
  id: 'task-done',
  title: 'Tugas Kosakata',
  course: 'Bahasa',
  deadline: '2026-10-01T08:00',
  status: 'done',
})

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function blockStorage() {
  return vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
  })
}

// The tiles read as one list with one entry per urgency level, badge label first.
function tileTexts() {
  const tiles = screen.getByRole('list', { name: 'Ringkasan urgensi' })
  return within(tiles).getAllByRole('listitem').map((tile) => tile.textContent)
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

describe('DashboardPage with stored tasks', () => {
  it('counts every stored task under its urgency level', async () => {
    seed(OVERDUE, ALSO_OVERDUE, DUE_TODAY, THIS_WEEK, LATER, DONE)
    render(<DashboardPage />)
    await screen.findByRole('list', { name: 'Ringkasan urgensi' })
    expect(tileTexts()).toEqual([
      'Terlambat2',
      'Hari ini1',
      'Minggu ini1',
      'Nanti1',
      'Selesai1',
    ])
  })

  it('shows a zero for a level that has no task', async () => {
    seed(DUE_TODAY)
    render(<DashboardPage />)
    await screen.findByRole('list', { name: 'Ringkasan urgensi' })
    expect(tileTexts()).toEqual(['Terlambat0', 'Hari ini1', 'Minggu ini0', 'Nanti0', 'Selesai0'])
  })

  it('names the screen and prints the day in full', async () => {
    seed(DUE_TODAY)
    render(<DashboardPage />)
    expect(await screen.findByRole('heading', { level: 2 })).toHaveTextContent('Ringkasan')
    expect(screen.getByText(/Minggu, 4 Oktober 2026/)).toBeInTheDocument()
  })
})

describe('DashboardPage while it loads', () => {
  it('says it is loading before any tile is on screen', () => {
    render(<DashboardPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Memuat ringkasan...')
    expect(screen.queryByRole('list', { name: 'Ringkasan urgensi' })).toBeNull()
  })
})

describe('DashboardPage without stored tasks', () => {
  it('shows the empty state and one add action', async () => {
    render(<DashboardPage />)
    expect(await screen.findByText('Belum ada tugas.')).toBeInTheDocument()
    expect(screen.getByText('Tambah tugas pertamamu.')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('calls onAddTask when the add action is clicked', async () => {
    const user = userEvent.setup()
    const onAddTask = vi.fn()
    render(<DashboardPage onAddTask={onAddTask} />)
    await user.click(await screen.findByRole('button', { name: 'Tambah tugas' }))
    expect(onAddTask).toHaveBeenCalledTimes(1)
  })
})

describe('DashboardPage when storage cannot be read', () => {
  it('shows the failure message inside an alert', async () => {
    blockStorage()
    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Penyimpanan tidak tersedia. Coba lagi.',
    )
  })

  it('shows the tiles after a retry once storage works again', async () => {
    const user = userEvent.setup()
    const blocked = blockStorage()
    seed(DUE_TODAY)
    render(<DashboardPage />)
    await screen.findByRole('alert')

    blocked.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))

    expect(await screen.findByRole('list', { name: 'Ringkasan urgensi' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})