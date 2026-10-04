import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UrgencyBadge } from '../UrgencyBadge.jsx'

// The label is the only reliable signal, so every level must render as text.
describe('UrgencyBadge', () => {
  it('shows the label Terlambat for an overdue task', () => {
    render(<UrgencyBadge urgency="overdue" />)
    const badge = screen.getByText('Terlambat')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'overdue')
  })

  it('shows the label Hari ini for a task due today', () => {
    render(<UrgencyBadge urgency="due_today" />)
    const badge = screen.getByText('Hari ini')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'due_today')
  })

  it('shows the label Minggu ini for a task due this week', () => {
    render(<UrgencyBadge urgency="this_week" />)
    const badge = screen.getByText('Minggu ini')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'this_week')
  })

  it('shows the label Nanti for a task due later', () => {
    render(<UrgencyBadge urgency="later" />)
    const badge = screen.getByText('Nanti')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'later')
  })

  it('shows the label Selesai for a finished task', () => {
    render(<UrgencyBadge urgency="done" />)
    const badge = screen.getByText('Selesai')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'done')
  })

  it('renders readable text without any icon or emoji', () => {
    render(<UrgencyBadge urgency="overdue" />)
    expect(screen.getByText('Terlambat').textContent).toBe('Terlambat')
  })

  it('falls back to the label Nanti for an urgency value that does not exist', () => {
    render(<UrgencyBadge urgency="tidak-dikenal" />)
    const badge = screen.getByText('Nanti')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-urgency', 'tidak-dikenal')
  })
})