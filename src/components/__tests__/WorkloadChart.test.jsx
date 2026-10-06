import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getWorkload } from '../../utils/stats.js'
import { WorkloadChart } from '../WorkloadChart.jsx'

describe('WorkloadChart', () => {
  it('renders the empty state with no tasks', () => {
    const days = getWorkload([])
    render(<WorkloadChart days={days} />)

    expect(screen.getByText('Beban 7 hari ke depan')).toBeInTheDocument()
    expect(
      screen.getByText('Tidak ada tugas jatuh tempo dalam 7 hari ke depan'),
    ).toBeInTheDocument()
  })

  it('renders without crashing when given a task with a deadline', () => {
    const tasks = [
      { id: '1', title: 'Task A', deadline: '2026-10-10T10:00', status: 'todo' },
    ]
    const days = getWorkload(tasks)
    const { container } = render(<WorkloadChart days={days} />)

    expect(screen.getByText('Beban 7 hari ke depan')).toBeInTheDocument()
    expect(container.firstChild).toBeInTheDocument()
  })
})