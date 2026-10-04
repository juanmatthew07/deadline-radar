import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskDetail } from '../TaskDetail.jsx'

// The reference moment every task is judged against: 4 October 2026, noon. The
// component takes it as a prop, so no clock has to be faked here.
const NOW = new Date(2026, 9, 4, 12, 0)

// One term and its value live in the same pair of the definition list, so the
// value is looked up inside its own pair. That keeps a label such as Selesai,
// which the urgency and the status can both say, apart.
function fieldFor(label) {
  return screen.getByText(label).closest('div')
}

function renderDetail(task, handlers = {}) {
  return render(
    <TaskDetail
      task={task}
      now={NOW}
      onEdit={handlers.onEdit ?? vi.fn()}
      onDelete={handlers.onDelete ?? vi.fn()}
      onBack={handlers.onBack ?? vi.fn()}
    />,
  )
}

describe('TaskDetail fields', () => {
  it('shows the title of the task as the heading of the screen', () => {
    renderDetail(createSampleTask({ title: 'Esai Fisika' }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'Esai Fisika' }),
    ).toBeInTheDocument()
  })

  it('shows the course of the task', () => {
    renderDetail(createSampleTask({ course: 'Fisika Dasar' }))

    expect(within(fieldFor('Mata kuliah')).getByText('Fisika Dasar')).toBeInTheDocument()
  })

  it('shows the deadline in a time element with a dateTime attribute', () => {
    renderDetail(createSampleTask({ deadline: '2026-10-04T23:59' }))

    const deadline = within(fieldFor('Tenggat')).getByText(/2026/)
    expect(deadline.tagName).toBe('TIME')
    expect(deadline).toHaveAttribute('datetime', '2026-10-04T23:59')
    expect(deadline).toHaveTextContent('23.59')
  })

  it('shows "Tanpa tenggat" and no time element when the deadline is missing', () => {
    renderDetail(createSampleTask({ deadline: null }))

    const field = fieldFor('Tenggat')
    expect(within(field).getByText('Tanpa tenggat')).toBeInTheDocument()
    expect(field.querySelector('time[datetime]')).toBeNull()
  })

  it('derives the urgency label from the deadline and the reference moment', () => {
    renderDetail(createSampleTask({ deadline: '2026-10-04T23:59' }))

    expect(within(fieldFor('Urgensi')).getByText('Hari ini')).toBeInTheDocument()
  })

  it('shows Selesai as the urgency of a done task whose deadline has passed', () => {
    renderDetail(createSampleTask({ deadline: '2026-10-01T08:00', status: 'done' }))

    expect(within(fieldFor('Urgensi')).getByText('Selesai')).toBeInTheDocument()
  })

  it('shows the priority label of the task', () => {
    renderDetail(createSampleTask({ priority: 'high' }))

    expect(within(fieldFor('Prioritas')).getByText('Tinggi')).toBeInTheDocument()
  })

  it('shows the status label of the task', () => {
    renderDetail(createSampleTask({ status: 'in_progress' }))

    expect(within(fieldFor('Status')).getByText('Dikerjakan')).toBeInTheDocument()
  })

  it('shows the description of the task', () => {
    renderDetail(createSampleTask({ description: 'Ringkasan gaya dan medan listrik.' }))

    expect(
      within(fieldFor('Deskripsi')).getByText('Ringkasan gaya dan medan listrik.'),
    ).toBeInTheDocument()
  })

  it('says there is no description when the field is empty', () => {
    renderDetail(createSampleTask({ description: '   ' }))

    expect(within(fieldFor('Deskripsi')).getByText('Tidak ada deskripsi.')).toBeInTheDocument()
  })

  it('shows the moment the task was created', () => {
    renderDetail(createSampleTask({ createdAt: '2026-10-01T08:00:00.000Z' }))

    expect(fieldFor('Dibuat')).toHaveTextContent('2026')
  })

  it('shows the moment the task was last changed', () => {
    renderDetail(createSampleTask({ updatedAt: '2026-10-02T09:30:00.000Z' }))

    expect(fieldFor('Diubah')).toHaveTextContent('2026')
  })
})

describe('TaskDetail actions', () => {
  it('reports an edit with the task on screen', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    renderDetail(createSampleTask({ title: 'Esai Fisika' }), { onEdit })

    await user.click(screen.getByRole('button', { name: 'Ubah' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))
  })

  it('reports a delete request without deleting anything itself', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()
    renderDetail(createSampleTask(), { onDelete })

    await user.click(screen.getByRole('button', { name: 'Hapus' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('reports going back', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    renderDetail(createSampleTask(), { onBack })

    await user.click(screen.getByRole('button', { name: 'Kembali' }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})

describe('TaskDetail and the task it renders', () => {
  it('does not mutate the task and adds no urgency field to it', () => {
    // A frozen task turns any write attempt into a TypeError in strict mode.
    const task = Object.freeze(createSampleTask({ deadline: '2026-10-04T23:59' }))

    expect(() => renderDetail(task)).not.toThrow()
    expect(screen.getByRole('heading', { level: 2, name: 'Esai Fisika' })).toBeInTheDocument()
    expect('urgency' in task).toBe(false)
    expect(Object.keys(task)).not.toContain('urgency')
  })
})