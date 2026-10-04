import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskFilters } from '../../hooks/useTaskFilters.js'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskListPage } from '../TaskListPage.jsx'

// The page runs the real chain: page to hook to service to repository over the
// jsdom localStorage. The search debounce is the only wait, so real timers are
// used and the waits below are given room for it.
const FIRST = createSampleTask({
  id: 'task-1',
  title: 'Esai Fisika',
  course: 'Fisika Dasar',
  deadline: '2026-10-05T08:00',
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
  deadline: '2026-10-07T08:00',
})

const DEBOUNCE_ROOM = 2000

// App owns the filter state and hands it to the page, so the harness does the
// same instead of building a query object by hand.
function Harness() {
  const filters = useTaskFilters()
  return <TaskListPage filters={filters} />
}

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function titles() {
  return screen.getAllByRole('listitem').map((row) => within(row).getByRole('button').textContent)
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TaskListPage toolbar', () => {
  it('shows the search and the filters once there is a task to filter', async () => {
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)

    expect(await screen.findByRole('search', { name: 'Cari dan filter tugas' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Cari tugas' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mata kuliah' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Urutkan' })).toBeInTheDocument()
  })

  it('hides the toolbar when nothing is stored', async () => {
    render(<Harness />)

    expect(await screen.findByText('Belum ada tugas.')).toBeInTheDocument()
    expect(screen.queryByRole('search')).toBeNull()
  })
})

describe('TaskListPage search', () => {
  it('narrows the list and counts what is left', async () => {
    const user = userEvent.setup()
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)
    await screen.findAllByRole('listitem')

    await user.type(screen.getByRole('searchbox', { name: 'Cari tugas' }), 'Kimia')

    await waitFor(() => expect(titles()).toEqual(['Laporan Kimia']), { timeout: DEBOUNCE_ROOM })
    expect(screen.getByText('Menampilkan 1 dari 3 tugas')).toBeInTheDocument()
  })

  it('offers its own reset when nothing matches and restores every row', async () => {
    const user = userEvent.setup()
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)
    await screen.findAllByRole('listitem')

    await user.type(screen.getByRole('searchbox', { name: 'Cari tugas' }), 'tidak ada')

    expect(await screen.findByText('Tidak ada tugas yang cocok.')).toBeInTheDocument()
    expect(screen.getByText('Ubah kata kunci atau filter.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Atur ulang filter' }))

    expect(titles()).toEqual(['Esai Fisika', 'Laporan Kimia', 'UTS Biologi'])
    expect(screen.getByRole('searchbox', { name: 'Cari tugas' })).toHaveValue('')
  })
})

describe('TaskListPage course filter', () => {
  it('lists the courses of the stored tasks', async () => {
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)
    await screen.findAllByRole('listitem')

    const select = screen.getByRole('combobox', { name: 'Mata kuliah' })
    const options = within(select).getAllByRole('option')

    expect(options.map((option) => option.textContent)).toEqual([
      'Semua mata kuliah',
      'Biologi',
      'Fisika Dasar',
      'Kimia',
    ])
  })

  it('keeps only the rows of the chosen course', async () => {
    const user = userEvent.setup()
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)
    await screen.findAllByRole('listitem')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mata kuliah' }), 'Kimia')

    expect(titles()).toEqual(['Laporan Kimia'])
  })
})

describe('TaskListPage sort', () => {
  it('reverses the order of the rows', async () => {
    const user = userEvent.setup()
    seed(FIRST, SECOND, THIRD)
    render(<Harness />)
    await screen.findAllByRole('listitem')
    expect(titles()).toEqual(['Esai Fisika', 'Laporan Kimia', 'UTS Biologi'])

    await user.selectOptions(screen.getByRole('combobox', { name: 'Urutkan' }), 'Tenggat terjauh')

    expect(titles()).toEqual(['UTS Biologi', 'Laporan Kimia', 'Esai Fisika'])
  })
})