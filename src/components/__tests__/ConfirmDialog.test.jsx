import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../ConfirmDialog.jsx'

// The component is presentational, so every state is a prop. The neutral tone is
// used everywhere except the danger describe below.
const PROPS = {
  title: 'Ganti semua tugas?',
  confirmLabel: 'Ganti semua',
  busyLabel: 'Mengimpor...',
  tone: 'neutral',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
}

// The component is presentational, so every state is a prop.
function renderDialog(overrides = {}) {
  return render(<ConfirmDialog {...PROPS} {...overrides} />)
}

// The dialog is mounted and unmounted by a control of the test itself, so the
// focus can be followed out of the overlay again.
function ConfirmToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Buka konfirmasi
      </button>
      {isOpen ? (
        <ConfirmDialog {...PROPS} onCancel={() => setIsOpen(false)}>
          Impor ini.
        </ConfirmDialog>
      ) : null}
    </>
  )
}

describe('ConfirmDialog in the neutral tone', () => {
  const NEUTRAL = { children: 'Impor ini akan mengganti 3 tugas saat ini.' }

  it('names itself and describes itself with its body', () => {
    renderDialog(NEUTRAL)

    const dialog = screen.getByRole('dialog', { name: 'Ganti semua tugas?' })
    expect(dialog).toHaveAccessibleDescription('Impor ini akan mengganti 3 tugas saat ini.')
  })

  it('has no icon in the heading', () => {
    renderDialog(NEUTRAL)

    expect(
      screen.getByRole('heading', { level: 2 }).querySelector('svg'),
    ).toBeNull()
  })

  it('confirms with a primary button', () => {
    renderDialog(NEUTRAL)

    expect(screen.getByRole('button', { name: 'Ganti semua' })).toHaveClass(
      'button--primary',
    )
  })
})

describe('ConfirmDialog in the danger tone', () => {
  const DANGER = { tone: 'danger', children: 'Hapus tugas ini.', confirmLabel: 'Hapus' }

  it('warns with an icon in the danger colour', () => {
    renderDialog(DANGER)

    expect(
      screen.getByRole('heading', { level: 2 }).querySelector('svg'),
    ).not.toBeNull()
  })

  it('keeps the filled danger confirm button', () => {
    renderDialog(DANGER)

    expect(screen.getByRole('button', { name: 'Hapus' })).toHaveClass(
      'button--danger-filled',
    )
  })
})

describe('ConfirmDialog as a modal panel', () => {
  it('marks the panel as modal and wires it to its own heading and body', () => {
    renderDialog({ children: 'Impor ini akan mengganti 3 tugas saat ini.' })

    const dialog = screen.getByRole('dialog')
    const heading = screen.getByRole('heading', { level: 2 })
    const body = screen.getByText('Impor ini akan mengganti 3 tugas saat ini.')

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id)
    expect(dialog.getAttribute('aria-describedby')).toBe(body.id)
  })
})

describe('ConfirmDialog while the run is pending', () => {
  it('swaps the confirm label and disables both actions', () => {
    renderDialog({ children: 'Impor ini.', isBusy: true })

    expect(screen.getByRole('button', { name: 'Mengimpor...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled()
  })

  it('shows the failure inside an alert and keeps the confirm button', () => {
    renderDialog({ children: 'Impor ini.', error: 'Gagal mengimpor. Data lama tidak diubah.' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Gagal mengimpor. Data lama tidak diubah.',
    )
    expect(screen.getByRole('button', { name: 'Ganti semua' })).toBeEnabled()
  })

  it('ignores Escape, because a run in flight cannot be called off', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ children: 'Impor ini.', isBusy: true, onCancel })

    await user.keyboard('{Escape}')

    expect(onCancel).not.toHaveBeenCalled()
  })
})

describe('ConfirmDialog keyboard and focus', () => {
  it('starts on Batal so nothing is confirmed by accident', () => {
    renderDialog({ children: 'Impor ini.' })

    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus()
  })

  it('cancels on Escape', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ children: 'Impor ini.', onCancel })

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('keeps the focus on its own buttons while Tab and Shift+Tab are pressed', async () => {
    const user = userEvent.setup()
    renderDialog({ children: 'Impor ini.' })
    const buttons = within(screen.getByRole('dialog')).getAllByRole('button')

    await user.tab()
    expect(buttons).toContain(document.activeElement)
    await user.tab()
    expect(buttons).toContain(document.activeElement)
    await user.tab()
    expect(buttons).toContain(document.activeElement)

    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(buttons).toContain(document.activeElement)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(buttons).toContain(document.activeElement)
  })

  it('does not cancel when the backdrop behind the panel is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    renderDialog({ children: 'Impor ini.', onCancel })
    // The backdrop wraps the panel and carries no handler of its own.
    const backdrop = screen.getByRole('dialog').parentElement

    await user.click(backdrop)

    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('gives the focus back to the control that opened it', async () => {
    const user = userEvent.setup()
    render(<ConfirmToggle />)
    const opener = screen.getByRole('button', { name: 'Buka konfirmasi' })

    await user.click(opener)
    expect(screen.getByRole('button', { name: 'Batal' })).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Batal' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
  })
})
