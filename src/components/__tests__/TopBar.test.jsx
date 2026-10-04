import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../TopBar.jsx'

// The bar is presentational, so every action comes in as a prop.
describe('TopBar', () => {
  it('shows the app name as the only heading level 1', () => {
    render(<TopBar />)
    const headings = screen.getAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent('DeadlineRadar')
  })

  it('shows the add action when showAdd is true', () => {
    render(<TopBar showAdd onAddTask={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tambah tugas' })).toBeInTheDocument()
  })

  it('shows no action when showAdd is false', () => {
    render(<TopBar showAdd={false} onAddTask={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('calls onAddTask once when the add action is clicked', async () => {
    const user = userEvent.setup()
    const onAddTask = vi.fn()
    render(<TopBar showAdd onAddTask={onAddTask} />)

    await user.click(screen.getByRole('button', { name: 'Tambah tugas' }))

    expect(onAddTask).toHaveBeenCalledTimes(1)
  })

  it('renders no emoji and no exclamation mark', () => {
    render(<TopBar showAdd onAddTask={vi.fn()} />)
    expect(document.body.textContent).not.toMatch(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u,
    )
    expect(document.body.textContent).not.toContain('!')
  })
})