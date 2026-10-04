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

// Catches emoji and pictographic symbols in rendered text.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

// A mix with one task per urgency level, one task eight days out, and two tasks
// in the same course.
const MIX = [
  createSampleTask({
    id: 'task-overdue',
    title: 'Esai Fisika',
    course: 'Fisika',
    deadline: '2026-10-03T23:59',
  }),
  createSampleTask({
    id: 'task-today',
    title: 'UTS Biologi',
    course: 'Biologi',
    deadline: '2026-10-04T23:59',
  }),
  createSampleTask({
    id: 'task-week',
    title: 'Presentasi Matematika',
    course: 'Matematika',
    deadline: '2026-10-07T08:00',
  }),
  createSampleTask({
    id: 'task-beyond',
    title: 'Tugas Praktikum',
    course: 'Praktikum',
    deadline: '2026-10-12T08:00',
  }),
  createSampleTask({
    id: 'task-later',
    title: 'Makalah Bahasa',
    course: 'Bahasa',
    deadline: '2026-10-20T08:00',
  }),
  createSampleTask({
    id: 'task-done',
    title: 'Tugas Kosakata',
    course: 'Bahasa',
    deadline: '2026-10-01T08:00',
    status: 'done',
  }),
]

// Eight courses, so the list of courses has more than it can show.
const WIDE = [
  'Kalkulus',
  'Fisika',
  'Kimia',
  'Biologi',
  'Matematika',
  'Bahasa',
  'Sejarah',
  'Akuntansi',
].map((course, index) =>
  createSampleTask({
    id: `task-${index}`,
    title: `Tugas ${course}`,
    course,
    deadline: '2026-10-01T08:00',
    status: 'done',
  }),
)

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

// Each widget is a section card under its own heading.
function widget(name) {
  return screen.getByRole('heading', { level: 3, name }).closest('section')
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

describe('the upcoming deadlines widget', () => {
  it('lists the open tasks with the nearest deadline first', async () => {
    seed(...MIX)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Deadline terdekat' })

    const titles = within(widget('Deadline terdekat'))
      .getAllByRole('listitem')
      .map((item) => within(item).getByRole('button').textContent)

    expect(titles).toEqual([
      'Esai Fisika',
      'UTS Biologi',
      'Presentasi Matematika',
      'Tugas Praktikum',
      'Makalah Bahasa',
    ])
  })

  it('opens the task whose title was clicked', async () => {
    const user = userEvent.setup()
    const onOpenTask = vi.fn()
    seed(...MIX)
    render(<DashboardPage onOpenTask={onOpenTask} />)
    const card = await screen.findByRole('heading', { level: 3, name: 'Deadline terdekat' })

    await user.click(within(card.closest('section')).getByRole('button', { name: 'UTS Biologi' }))

    expect(onOpenTask).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'task-today', title: 'UTS Biologi' }),
    )
  })

  it('hands over to the task list', async () => {
    const user = userEvent.setup()
    const onViewAll = vi.fn()
    seed(...MIX)
    render(<DashboardPage onViewAll={onViewAll} />)

    await user.click(await screen.findByRole('button', { name: 'Lihat semua tugas' }))

    expect(onViewAll).toHaveBeenCalledTimes(1)
  })

  it('says nothing is waiting when every task is done', async () => {
    seed(MIX[MIX.length - 1])
    render(<DashboardPage />)

    expect(await screen.findByText('Tidak ada tugas yang menunggu.')).toBeInTheDocument()
  })
})

describe('the workload widget', () => {
  it('shows one column per day with the count of that day', async () => {
    seed(...MIX)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Beban 7 hari ke depan' })

    const days = within(widget('Beban 7 hari ke depan')).getAllByRole('listitem')

    expect(days.map((day) => day.textContent)).toEqual([
      '1 tugas jatuh tempoHari ini',
      '0 tugas jatuh tempoSen 5',
      '0 tugas jatuh tempoSel 6',
      '1 tugas jatuh tempoRab 7',
      '0 tugas jatuh tempoKam 8',
      '0 tugas jatuh tempoJum 9',
      '0 tugas jatuh tempoSab 10',
    ])
  })

  it('sums the days in the line under the title', async () => {
    seed(...MIX)
    render(<DashboardPage />)

    expect(
      await screen.findByText('2 tugas jatuh tempo dalam 7 hari ke depan'),
    ).toBeInTheDocument()
  })

  it('leaves a task that falls after the seventh day out', async () => {
    seed(MIX[3])
    render(<DashboardPage />)

    expect(
      await screen.findByText('Tidak ada tugas jatuh tempo dalam 7 hari ke depan'),
    ).toBeInTheDocument()
  })
})

describe('the course progress widget', () => {
  it('shows the overall progress and one row per course', async () => {
    seed(...MIX)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Progres per mata kuliah' })
    const card = widget('Progres per mata kuliah')

    expect(within(card).getByText('1 dari 6 tugas selesai')).toBeInTheDocument()
    expect(
      within(card)
        .getAllByRole('listitem')
        .map((item) => within(item).getByText(/dari \d+ selesai/).textContent),
    ).toEqual([
      '1 dari 2 selesai',
      '0 dari 1 selesai',
      '0 dari 1 selesai',
      '0 dari 1 selesai',
      '0 dari 1 selesai',
    ])
  })

  it('gives every bar its own label and value', async () => {
    seed(...MIX)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Progres per mata kuliah' })

    const bars = within(widget('Progres per mata kuliah')).getAllByRole('progressbar')

    expect(bars.map((bar) => [bar.getAttribute('aria-label'), bar.getAttribute('aria-valuenow')])).toEqual([
      ['Progres keseluruhan', '17'],
      ['Progres Bahasa', '50'],
      ['Progres Biologi', '0'],
      ['Progres Fisika', '0'],
      ['Progres Matematika', '0'],
      ['Progres Praktikum', '0'],
    ])
  })

  it('reports the courses that did not fit', async () => {
    seed(...WIDE)
    render(<DashboardPage />)

    expect(await screen.findByText('dan 2 mata kuliah lainnya.')).toBeInTheDocument()
  })
})

describe('the dashboard widgets', () => {
  it('render no emoji and no exclamation mark', async () => {
    seed(...MIX)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Deadline terdekat' })

    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})