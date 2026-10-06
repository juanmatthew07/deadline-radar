import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UpcomingList } from '../UpcomingList.jsx'

describe('UpcomingList', () => {
  it('shows the empty state text when there are no tasks', () => {
    render(<UpcomingList tasks={[]} onOpenTask={vi.fn()} />)

    expect(screen.getByText('Tidak ada tugas yang menunggu.')).toBeInTheDocument()
  })

  it('renders the title of a task', () => {
    const tasks = [
      { id: '1', title: 'Task A', deadline: '2026-10-10T10:00', status: 'todo', course: 'Math' },
    ]
    render(<UpcomingList tasks={tasks} onOpenTask={vi.fn()} />)

    expect(screen.getByText('Task A')).toBeInTheDocument()
  })
})