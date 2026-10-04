import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import { TaskRow } from '../TaskRow.jsx'

// The reference moment the row is judged against: 4 October 2026, noon.
const NOW = new Date(2026, 9, 4, 12, 0)

// The row renders a list item, so it is always placed inside a list.
function renderRow(task, now = NOW, onOpen = vi.fn()) {
  return render(
    <ul>
      <TaskRow task={task} now={now} onOpen={onOpen} />
    </ul>,
  )
}

function renderedRow() {
  return screen.getByRole('listitem')
}

// The urgency badge is a plain span without an ARIA role, so its data
// attribute is the only handle for that label alone. A finished task shows
// Selesai twice in one row: once as urgency and once as status.
function urgencyIn(row) {
  return row.querySelector('[data-urgency]')
}

describe('TaskRow', () => {
  it('shows the title of the task', () => {
    renderRow(createSampleTask({ title: 'Esai Fisika' }))
    expect(screen.getByRole('button', { name: 'Esai Fisika' })).toBeInTheDocument()
  })

  it('shows the course of the task', () => {
    renderRow(createSampleTask({ course: 'Fisika Dasar' }))
    expect(within(renderedRow()).getByText('Fisika Dasar')).toBeInTheDocument()
  })

  it('shows the status label of the task', () => {
    renderRow(createSampleTask({ status: 'in_progress' }))
    expect(within(renderedRow()).getByText('Dikerjakan')).toBeInTheDocument()
  })

  it('shows the formatted deadline inside a time element with a dateTime attribute', () => {
    renderRow(createSampleTask({ deadline: '2026-10-04T23:59' }))
    const deadline = within(renderedRow()).getByText(/2026/)
    expect(deadline.tagName).toBe('TIME')
    expect(deadline).toHaveAttribute('datetime', '2026-10-04T23:59')
    expect(deadline).toHaveTextContent('23.59')
  })

  it('shows the urgency label derived from the deadline', () => {
    renderRow(createSampleTask({ deadline: '2026-10-04T23:59' }))
    expect(urgencyIn(renderedRow())).toHaveTextContent('Hari ini')
    expect(urgencyIn(renderedRow())).toHaveAttribute('data-urgency', 'due_today')
  })

  it('shows "Tanpa tenggat" and the urgency Nanti for a task without a deadline', () => {
    renderRow(createSampleTask({ deadline: null }))
    const row = renderedRow()
    expect(within(row).getByText('Tanpa tenggat')).toBeInTheDocument()
    expect(urgencyIn(row)).toHaveTextContent('Nanti')
  })

  it('shows "Tanpa tenggat" and the urgency Nanti for an impossible deadline', () => {
    renderRow(createSampleTask({ deadline: '2026-02-31T10:00' }))
    const row = renderedRow()
    expect(within(row).getByText('Tanpa tenggat')).toBeInTheDocument()
    expect(urgencyIn(row)).toHaveTextContent('Nanti')
  })

  it('renders no time element with a dateTime when the deadline is not valid', () => {
    renderRow(createSampleTask({ deadline: null }))
    expect(renderedRow().querySelector('time[datetime]')).toBeNull()
  })

  it('shows Selesai and not Terlambat for a done task whose deadline has passed', () => {
    renderRow(createSampleTask({ deadline: '2026-10-01T08:00', status: 'done' }))
    const row = renderedRow()
    expect(urgencyIn(row)).toHaveTextContent('Selesai')
    expect(urgencyIn(row)).toHaveAttribute('data-urgency', 'done')
    expect(within(row).queryByText('Terlambat')).toBeNull()
  })

  it('reports a task of this week as Minggu ini for the given reference time', () => {
    renderRow(createSampleTask({ deadline: '2026-10-11T23:59' }), new Date(2026, 9, 4, 12, 0))
    expect(urgencyIn(renderedRow())).toHaveTextContent('Minggu ini')
  })

  it('reports the same task as Terlambat once the reference time has passed it', () => {
    renderRow(createSampleTask({ deadline: '2026-10-11T23:59' }), new Date(2026, 9, 12, 12, 0))
    expect(urgencyIn(renderedRow())).toHaveTextContent('Terlambat')
  })

  it('opens the task from the single control of the row', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()
    renderRow(createSampleTask(), NOW, onOpen)

    const control = screen.getByRole('button', { name: 'Esai Fisika' })
    await user.click(control)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.queryByRole('link')).toBeNull()
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }))
  })

  it('does not mutate the task and adds no urgency field to it', () => {
    // A frozen task turns any write attempt into a TypeError in strict mode.
    const task = Object.freeze(createSampleTask({ deadline: '2026-10-04T23:59' }))
    expect(() => renderRow(task, NOW)).not.toThrow()
    expect(screen.getByRole('listitem')).toBeInTheDocument()
    expect('urgency' in task).toBe(false)
    expect(Object.keys(task)).not.toContain('urgency')
  })

  it('renders without error when no open action was passed', () => {
    render(
      <ul>
        <TaskRow task={createSampleTask({ title: 'Esai Fisika' })} now={NOW} />
      </ul>,
    )

    expect(screen.getByRole('button', { name: 'Esai Fisika' })).toBeInTheDocument()
  })
})