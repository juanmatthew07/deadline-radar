import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskList } from '../TaskList.jsx'

const FIRST = createSampleTask({ id: 'task-1', title: 'Esai Fisika' })
const SECOND = createSampleTask({ id: 'task-2', title: 'Laporan Kimia', course: 'Kimia' })
const THIRD = createSampleTask({ id: 'task-3', title: 'UTS Fisika', status: 'done' })

// The component is presentational, so every state is driven by props and the
// returned props give access to the mocks a test needs.
function renderList(overrides = {}) {
  const props = {
    tasks: [],
    status: 'ready',
    error: null,
    isRefreshing: false,
    onAddTask: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  }
  return { ...render(<TaskList {...props} />), props }
}

describe('TaskList while loading', () => {
  it('shows the loading text inside a status role', () => {
    renderList({ status: 'loading' })
    expect(screen.getByRole('status')).toHaveTextContent('Memuat tugas...')
  })

  it('renders three static skeleton rows', () => {
    renderList({ status: 'loading' })
    // The skeleton list is hidden from the accessibility tree.
    expect(screen.getAllByRole('listitem', { hidden: true })).toHaveLength(3)
  })

  it('shows no row of real data and no action while loading', () => {
    renderList({ status: 'loading' })
    expect(screen.queryByRole('heading')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('TaskList when empty', () => {
  it('states that there is no task yet', () => {
    renderList()
    expect(screen.getByText('Belum ada tugas.')).toBeInTheDocument()
  })

  it('invites the user to add the first task', () => {
    renderList()
    expect(screen.getByText('Tambah tugas pertamamu.')).toBeInTheDocument()
  })

  it('offers exactly one action labelled with a verb', () => {
    renderList()
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Tambah tugas')
  })

  it('calls onAddTask once when the add button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderList()
    await user.click(screen.getByRole('button', { name: 'Tambah tugas' }))
    expect(props.onAddTask).toHaveBeenCalledTimes(1)
  })
})

describe('TaskList on failure', () => {
  it('shows the failure message inside an alert', () => {
    renderList({ status: 'error', error: 'Penyimpanan tidak tersedia. Coba lagi.' })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Penyimpanan tidak tersedia. Coba lagi.',
    )
  })

  it('falls back to the default wording when the message is empty', () => {
    renderList({ status: 'error', error: '' })
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal memuat tugas.')
  })

  it('calls onRefresh when the retry button is clicked', async () => {
    const user = userEvent.setup()
    const { props } = renderList({ status: 'error', error: 'Gagal memuat tugas.' })
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }))
    expect(props.onRefresh).toHaveBeenCalledTimes(1)
  })

  it('offers the retry without an add action', () => {
    renderList({ status: 'error', error: 'Gagal memuat tugas.' })
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName('Coba lagi')
  })

  it('takes over the list when a failed refresh leaves no row behind', () => {
    renderList({ status: 'ready', error: 'Gagal membaca daftar.', tasks: [] })
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal membaca daftar.')
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })
})

describe('TaskList with rows', () => {
  it('renders one list item per task', () => {
    renderList({ tasks: [FIRST, SECOND] })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('keeps the order the tasks were given in', () => {
    renderList({ tasks: [THIRD, FIRST, SECOND] })
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(titles).toEqual(['UTS Fisika', 'Esai Fisika', 'Laporan Kimia'])
  })

  it('shows no add action once there are rows', () => {
    renderList({ tasks: [FIRST] })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('keeps the rows on screen when a refresh failed', () => {
    renderList({ tasks: [FIRST, SECOND], error: 'Gagal membaca daftar.' })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('alert')).toHaveTextContent('Gagal membaca daftar.')
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument()
  })

  it('announces a background refresh without hiding the rows', () => {
    renderList({ tasks: [FIRST, SECOND], isRefreshing: true })
    expect(screen.getByRole('status')).toHaveTextContent('Memuat ulang...')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })
})