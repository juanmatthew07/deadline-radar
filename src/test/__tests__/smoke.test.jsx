import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../../App.jsx'

describe('smoke', () => {
  it('runs a trivial assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('renders the app name', () => {
    render(<App />)
    expect(screen.getByText('DeadlineRadar')).toBeInTheDocument()
  })
})