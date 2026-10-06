import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBackup } from '../useBackup.js'

vi.mock('../../services/backupService.js', () => ({
  BackupError: class extends Error {},
  createBackupFile: vi.fn(),
  applyImport: vi.fn(),
  checkImportFile: vi.fn(),
  parseBackup: vi.fn(),
}))

vi.mock('../../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  readFileAsText: vi.fn(),
}))

import { createBackupFile, applyImport, parseBackup } from '../../services/backupService.js'
import { downloadTextFile, readFileAsText } from '../../utils/download.js'

describe('useBackup export', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('downloads the file and shows the success notice', async () => {
    createBackupFile.mockResolvedValue({ filename: 'cadangan.json', text: '{}' })
    const { result } = renderHook(() => useBackup())

    await act(async () => {
      await result.current.exportBackup()
    })

    expect(downloadTextFile).toHaveBeenCalledWith('cadangan.json', '{}')
    expect(result.current.notice).toBe('Cadangan diunduh.')
    expect(result.current.error).toBe('')
    expect(result.current.isBusy).toBe(false)
  })

  it('shows the failure notice when export fails', async () => {
    createBackupFile.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useBackup())

    await act(async () => {
      await result.current.exportBackup()
    })

    expect(downloadTextFile).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Gagal membuat cadangan. Coba lagi.')
    expect(result.current.notice).toBe('')
    expect(result.current.isBusy).toBe(false)
  })
})

describe('useBackup import flow', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('starts, confirms, and reports how many tasks were imported', async () => {
    readFileAsText.mockResolvedValue('{}')
    parseBackup.mockReturnValue({ tasks: [{ id: '1' }], total: 1, skipped: 0 })
    applyImport.mockResolvedValue(1)

    const onImported = vi.fn()
    const { result } = renderHook(() => useBackup({ onImported }))

    await act(async () => {
      await result.current.startImport(new File([''], 'a.json'))
    })
    expect(result.current.pendingImport).toEqual({
      tasks: [{ id: '1' }],
      total: 1,
      skipped: 0,
    })

    await act(async () => {
      await result.current.confirmImport()
    })

    expect(applyImport).toHaveBeenCalledWith([{ id: '1' }])
    expect(result.current.pendingImport).toBe(null)
    expect(result.current.notice).toBe('1 tugas diimpor.')
    expect(onImported).toHaveBeenCalled()
    expect(result.current.isBusy).toBe(false)
  })
})

describe('useBackup unmount safety', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('does not write state or log after the card is gone', async () => {
    let resolveExport
    createBackupFile.mockReturnValue(
      new Promise((resolve) => {
        resolveExport = resolve
      }),
    )

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useBackup())

    act(() => {
      result.current.exportBackup()
    })
    expect(result.current.isBusy).toBe(true)

    unmount()

    resolveExport({ filename: 'x.json', text: '{}' })
    await act(async () => {
      await Promise.resolve()
    })

    expect(consoleError).not.toHaveBeenCalled()
    expect(result.current.isBusy).toBe(true)
    consoleError.mockRestore()
  })
})