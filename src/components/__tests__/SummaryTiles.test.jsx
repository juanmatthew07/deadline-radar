import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SummaryTiles } from '../SummaryTiles.jsx'

describe('SummaryTiles', () => {
  it('renders the urgency labels and zero counts with no tasks', () => {
    render(<SummaryTiles tasks={[]} />)

    expect(screen.getByText('Terlambat')).toBeInTheDocument()
    expect(screen.getByText('Hari ini')).toBeInTheDocument()
    expect(screen.getByText('Minggu ini')).toBeInTheDocument()
    expect(screen.getByText('Nanti')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()

    const counts = screen.getAllByText('0')
    expect(counts).toHaveLength(5)
  })
})