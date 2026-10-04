import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskDetailPage } from '../TaskDetailPage.jsx'

// The screen runs the real chain: page to hook to service to repository over the
// jsdom localStorage. Only Date is faked, so the urgency is judged against this
// moment while the repository latency still runs on real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

const TASK = createSampleTask({
  id: 'task-1',
  title: 'Esai Fisika',
  course: 'Fisika Dasar',
  deadline: '2026-10-04T23:59',
})
const OTHER = createSampleTask({ id: 'task-2', title: 'Laporan Kimia', course: 'Kimia' })

const BODY = 'Tugas "Esai Fisika" akan dihapus dan tidak dapat dibatalkan.'

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

// A write that cannot land, as in private mode or with a full quota.
function blockStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
  })
}

function renderPage(handlers = {}) {
  return render(
    <TaskDetailPage
      task={TASK}
      onEdit={handlers.onEdit ?? vi.fn()}
      onBack={handlers.onBack ?? vi.fn()}
      onDeleted={handlers.onDeleted ?? vi.fn()}
    />,
  )
}

// The detail screen and the dialog both carry an action named Hapus, so the
// confirm button is always looked up inside the dialog.
async function openDialog(user) {
  await user.click(screen.getByRole('button', { name: 'Hapus' }))
  return screen.findByRole('dialog', { name: 'Hapus tugas?' })
}

function detailHeading() {
  return screen.getByRole('heading', { level: 2, name: 'Esai Fisika' })
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

describe('TaskDetailPage on mount', () => {
  it('moves the focus to the heading of the screen', async () => {
    seed(TASK)
    renderPage()

    await waitFor(() => expect(detailHeading()).toHaveFocus())
  })
})

describe('TaskDetailPage and the delete confirmation', () => {
  it('opens the confirmation naming the task without deleting anything yet', async () => {
    const user = userEvent.setup()
    seed(TASK, OTHER)
    renderPage()

    const dialog = await openDialog(user)

    expect(dialog).toHaveAccessibleDescription(BODY)
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('keeps the task in storage and gives the focus back when the confirmation is cancelled', async () => {
    const user = userEvent.setup()
    seed(TASK, OTHER)
    renderPage()
    const dialog = await openDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Batal' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2'])
    expect(screen.getByRole('button', { name: 'Hapus' })).toHaveFocus()
  })

  it('deletes the task and reports back once when the confirmation is accepted', async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    seed(TASK, OTHER)
    renderPage({ onDeleted })
    const dialog = await openDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(readStored().map((task) => task.id)).toEqual(['task-2'])
  })
})

describe('TaskDetailPage when the delete cannot be stored', () => {
  it('keeps the confirmation open with the failure inside an alert', async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    seed(TASK, OTHER)
    renderPage()
    const dialog = await openDialog(user)
    blockStorage()

    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Gagal menghapus. Coba lagi.',
    )
    expect(screen.getByRole('dialog', { name: 'Hapus tugas?' })).toBeInTheDocument()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('deletes the task on a second attempt once storage works again', async () => {
    const user = userEvent.setup()
    const onDeleted = vi.fn()
    seed(TASK, OTHER)
    renderPage({ onDeleted })
    const dialog = await openDialog(user)
    const blocked = blockStorage()
    await user.click(within(dialog).getByRole('button', { name: 'Hapus' }))
    await within(dialog).findByRole('alert')

    blocked.mockRestore()
    await user.click(await within(dialog).findByRole('button', { name: 'Hapus' }))

    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1))
    expect(readStored().map((task) => task.id)).toEqual(['task-2'])
  })
})