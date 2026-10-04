import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { DashboardPage } from '../DashboardPage.jsx'

// The page runs the real chain: page to hook to service to repository over the
// jsdom localStorage. Only Date is faked, so the file name and the counts are
// decided against this moment while the repository latency still uses timers.
const NOW = new Date(2026, 9, 4, 12, 0)

// Catches emoji and pictographic symbols in rendered text.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u

const STORED = [
  createSampleTask({ id: 'task-1', title: 'Esai Fisika', course: 'Fisika' }),
  createSampleTask({
    id: 'task-2',
    title: 'Laporan Kimia',
    course: 'Kimia',
    deadline: '2026-10-06T08:00',
  }),
]

const IMPORTED = [
  createSampleTask({ id: 'task-9', title: 'UTS Biologi', course: 'Biologi' }),
]

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

function backupFile(tasks = IMPORTED) {
  const text = JSON.stringify({ version: 1, exportedAt: NOW.toISOString(), tasks })
  return new File([text], 'backup.json', { type: 'application/json' })
}

function fileOf(text) {
  return new File([text], 'backup.json', { type: 'application/json' })
}

// The card is a section of the page, so the messages are looked up inside it.
function backupCard() {
  return screen.getByRole('heading', { level: 3, name: 'Cadangan data' }).closest('section')
}

// Waits for the card, so the rest of a test can look inside it right away.
async function findBackupCard() {
  await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })
  return backupCard()
}

async function pick(file) {
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('Pilih berkas cadangan'), file)
  return user
}

beforeEach(() => {
  localStorage.clear()
  // jsdom has no object URL support, and the anchor click is spied on so jsdom
  // never follows the download link.
  URL.createObjectURL = vi.fn(() => 'blob:deadline-radar')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('the backup card', () => {
  it('sits below the widgets when there are tasks', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()

    expect(
      within(card).getByText(
        'Simpan salinan tugasmu sebagai berkas JSON, atau pulihkan dari salinan sebelumnya.',
      ),
    ).toBeInTheDocument()
  })

  it('sits below the empty state so an import works with no data', async () => {
    render(<DashboardPage />)
    await screen.findByText('Belum ada tugas.')

    expect(screen.getByRole('heading', { level: 3, name: 'Cadangan data' })).toBeInTheDocument()
  })

  it('offers export and import, and refuses to export nothing', async () => {
    render(<DashboardPage />)
    const card = await findBackupCard()

    expect(within(card).getByRole('button', { name: 'Ekspor data' })).toBeDisabled()
    expect(within(card).getByRole('button', { name: 'Impor data' })).toBeEnabled()
    expect(within(card).getByText('Belum ada tugas untuk diekspor.')).toBeInTheDocument()
  })
})

describe('exporting', () => {
  it('hands the tasks to the browser and says it', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()

    await user.click(within(card).getByRole('button', { name: 'Ekspor data' }))

    expect(await within(card).findByRole('status')).toHaveTextContent('Cadangan diunduh.')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const [blob] = URL.createObjectURL.mock.calls[0]
    expect(JSON.parse(await blob.text()).tasks).toHaveLength(2)
  })

  it('reports a failed read of the stored tasks and downloads nothing', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()

    // The read of the repository is blocked, so the run fails before the browser
    // is handed anything. The page shows its own alert for this, and the alert of
    // the card is looked up inside the card.
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
    })
    await user.click(within(card).getByRole('button', { name: 'Ekspor data' }))

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Gagal membuat cadangan. Coba lagi.',
    )
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    getItem.mockRestore()
  })
})

describe('importing', () => {
  it('names both counts and says it cannot be undone', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })
    await pick(backupFile())

    const dialog = await screen.findByRole('dialog', { name: 'Ganti semua tugas?' })
    expect(dialog).toHaveTextContent(
      'Impor ini akan mengganti 2 tugas saat ini dengan 1 tugas dari berkas dan tidak dapat dibatalkan.',
    )
  })

  it('reports how many entries were skipped', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })
    await pick(backupFile([...IMPORTED, { course: 'Kimia' }]))

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      '1 entri dilewati karena tidak valid.',
    )
  })

  it('leaves the stored data alone when the dialog is cancelled', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })
    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), backupFile())

    await user.click(await screen.findByRole('button', { name: 'Batal' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readStored()).toEqual(STORED)
  })

  it('replaces the stored tasks and updates the dashboard', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()
    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), backupFile())

    await user.click(await screen.findByRole('button', { name: 'Ganti semua' }))

    expect(await within(card).findByRole('status')).toHaveTextContent('1 tugas diimpor.')
    expect(readStored().map((task) => task.id)).toEqual(['task-9'])
    expect(screen.queryByRole('dialog')).toBeNull()
    // The tiles and the widgets read the new data, not the old one.
    expect(await screen.findByText('UTS Biologi')).toBeInTheDocument()
    expect(screen.queryByText('Esai Fisika')).toBeNull()
    const tiles = within(screen.getByRole('list', { name: 'Ringkasan urgensi' }))
    expect(tiles.getAllByRole('listitem').map((tile) => tile.textContent)).toEqual([
      'Terlambat0',
      'Hari ini1',
      'Minggu ini0',
      'Nanti0',
      'Selesai0',
    ])
  })

  it('works from the empty state', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await screen.findByText('Belum ada tugas.')
    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), backupFile())

    await user.click(await screen.findByRole('button', { name: 'Ganti semua' }))

    expect(await screen.findByRole('status')).toHaveTextContent('1 tugas diimpor.')
    expect(readStored().map((task) => task.id)).toEqual(['task-9'])
  })

  it('takes the same file again right after it was used', async () => {
    const user = userEvent.setup()
    const file = backupFile()
    seed(...STORED)
    render(<DashboardPage />)
    await findBackupCard()

    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), file)
    await user.click(await screen.findByRole('button', { name: 'Batal' }))

    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), file)

    expect(await screen.findByRole('dialog', { name: 'Ganti semua tugas?' })).toBeInTheDocument()
  })
})

describe('importing a file that cannot be used', () => {
  it('refuses text that is not JSON and stores nothing', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()

    await pick(fileOf('abc'))

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Berkas bukan JSON yang valid.',
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readStored()).toEqual(STORED)
  })

  it('refuses a file larger than 2 MB', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()
    const file = fileOf('{}')
    Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 + 1 })

    await pick(file)

    expect(await within(card).findByRole('alert')).toHaveTextContent(
      'Berkas terlalu besar. Maksimal 2 MB.',
    )
    expect(readStored()).toEqual(STORED)
  })

  it('reports a file it could not read and stores nothing', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    const card = await findBackupCard()

    // readFileAsText listens with onerror, so the reader fails the same way the
    // utility rejects: with an error the hook does not recognise as a refusal.
    const readAsText = vi.spyOn(FileReader.prototype, 'readAsText').mockImplementation(
      function fail() {
        this.onerror(new Error('gagal membaca'))
      },
    )
    await pick(backupFile())

    expect(await within(card).findByRole('alert')).toHaveTextContent('Gagal membaca berkas.')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(readStored()).toEqual(STORED)
    readAsText.mockRestore()
  })

  it('keeps the dialog open and the old data when the write fails', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })
    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), backupFile())

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
    })
    await user.click(await screen.findByRole('button', { name: 'Ganti semua' }))

    const dialog = await screen.findByRole('dialog', { name: 'Ganti semua tugas?' })
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Gagal mengimpor. Data lama tidak diubah.',
    )
    expect(within(dialog).getByRole('button', { name: 'Ganti semua' })).toBeEnabled()
    expect(readStored()).toEqual(STORED)
  })

  it('shows the failed import message once, inside the dialog', async () => {
    const user = userEvent.setup()
    seed(...STORED)
    render(<DashboardPage />)
    await findBackupCard()
    await user.upload(screen.getByLabelText('Pilih berkas cadangan'), backupFile())

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
    })
    await user.click(await screen.findByRole('button', { name: 'Ganti semua' }))

    // The card and the dialog both receive the failure, and only the dialog shows
    // it, so the message is read once instead of announced twice.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Gagal mengimpor. Data lama tidak diubah.',
    )
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    expect(screen.getByRole('dialog', { name: 'Ganti semua tugas?' })).toBeInTheDocument()
    expect(readStored()).toEqual(STORED)
    setItem.mockRestore()
  })
})

describe('the copy of the backup card', () => {
  it('renders no emoji and no exclamation mark', async () => {
    seed(...STORED)
    render(<DashboardPage />)
    await screen.findByRole('heading', { level: 3, name: 'Cadangan data' })

    expect(document.body.textContent).not.toMatch(EMOJI)
    expect(document.body.textContent).not.toContain('!')
  })
})
