import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BackupActions } from '../BackupActions.jsx'

describe('BackupActions', () => {
  it('renders the export button', () => {
    render(
      <BackupActions
        onExport={vi.fn()}
        onImport={vi.fn()}
        isBusy={false}
      />,
    )

    expect(screen.getByRole('button', { name: 'Ekspor data' })).toBeInTheDocument()
  })

  it('calls onExport when the export button is clicked', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()

    render(
      <BackupActions
        onExport={onExport}
        onImport={vi.fn()}
        isBusy={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Ekspor data' }))

    expect(onExport).toHaveBeenCalledTimes(1)
  })
})