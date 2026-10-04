import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import { DeleteDialog } from '../DeleteDialog.jsx'

// The dialog is presentational: the task, the busy flag, and the message are
// props, and the two actions report back through callbacks. Its behaviour and
// the overlay belong to the shared ConfirmDialog, which has its own tests.
const TASK = createSampleTask({ id: 'task-1', title: 'Esai Fisika' })
const BODY = 'Tugas "Esai Fisika" akan dihapus dan tidak dapat dibatalkan.'

function renderDialog(overrides = {}) {
  return render(<DeleteDialog task={TASK} {...overrides} />)
}

describe('DeleteDialog copy', () => {
  it('asks whether the task should be deleted', () => {
    renderDialog()

    expect(screen.getByRole('heading', { level: 2, name: 'Hapus tugas?' })).toBeInTheDocument()
  })

  it('names the task in its body', () => {
    renderDialog()

    expect(screen.getByText(BODY)).toBeInTheDocument()
  })

  it('says in its body that the delete cannot be undone', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toHaveTextContent('tidak dapat dibatalkan')
  })

  it('offers exactly the two actions, Batal and Hapus', () => {
    renderDialog()

    const actions = within(screen.getByRole('dialog')).getAllByRole('button')
    expect(actions.map((action) => action.textContent)).toEqual(['Batal', 'Hapus'])
  })

  it('keeps the filled danger confirm button of a destructive confirmation', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Hapus' })).toHaveClass('button--danger-filled')
  })
})

describe('DeleteDialog while the delete is pending', () => {
  it('says that it is deleting instead of naming the action', () => {
    renderDialog({ isDeleting: true })

    expect(screen.getByRole('button', { name: 'Menghapus...' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Hapus' })).toBeNull()
  })

  it('disables Batal as well, because a run in flight cannot be called off', () => {
    renderDialog({ isDeleting: true })

    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled()
  })
})

describe('DeleteDialog actions', () => {
  it('confirms with onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })

    await user.click(screen.getByRole('button', { name: 'Hapus' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancels with onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ onCancel })

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})