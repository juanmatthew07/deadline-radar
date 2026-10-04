import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import {
  applyImport,
  buildBackup,
  checkImportFile,
  createBackupFile,
  getBackupFilename,
  parseBackup,
} from '../backupService.js'

// A fixed local moment, so the file name and the stamp are decided here.
const NOW = new Date(2026, 9, 4, 12, 0)

const TASK = createSampleTask({ id: 'task-1' })
const OTHER_TASK = createSampleTask({ id: 'task-2', title: 'Laporan Kimia' })

const NINE_FIELDS = [
  'course',
  'createdAt',
  'deadline',
  'description',
  'id',
  'priority',
  'status',
  'title',
  'updatedAt',
]

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

function backupOf(tasks) {
  return JSON.stringify({ version: 1, exportedAt: NOW.toISOString(), tasks })
}

// The service runs on the real repository over the jsdom localStorage, so every
// call waits the simulated latency and the fake clock is fully drained first.
async function settle(pending) {
  await vi.runAllTimersAsync()
  return pending
}

// The handler is attached before the clock moves, so a rejection never shows up
// as an unhandled rejection.
async function captureFailure(pending) {
  const captured = pending.then(
    () => null,
    (error) => error,
  )
  await vi.runAllTimersAsync()
  return captured
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('getBackupFilename', () => {
  it('names the file with the local day, zero padded', () => {
    expect(getBackupFilename(new Date(2026, 0, 5, 9, 0))).toBe(
      'deadlineradar-backup-2026-01-05.json',
    )
    expect(getBackupFilename(NOW)).toBe('deadlineradar-backup-2026-10-04.json')
  })

  it('keeps the local day late in the evening', () => {
    expect(getBackupFilename(new Date(2026, 9, 4, 23, 30))).toBe(
      'deadlineradar-backup-2026-10-04.json',
    )
  })
})

describe('buildBackup', () => {
  it('writes version 1, an ISO stamp, and only the nine fields', () => {
    const backup = buildBackup([{ ...TASK, urgency: 'overdue' }], NOW)

    expect(backup.version).toBe(1)
    expect(backup.exportedAt).toBe(NOW.toISOString())
    expect(Object.keys(backup.tasks[0]).sort()).toEqual(NINE_FIELDS)
    expect('urgency' in backup.tasks[0]).toBe(false)
  })

  it('never mutates the tasks it was given', () => {
    const source = [{ ...TASK, urgency: 'later' }]
    buildBackup(source, NOW)

    expect(source).toEqual([{ ...TASK, urgency: 'later' }])
  })

  it('treats a value that is not an array as no tasks', () => {
    expect(buildBackup(null, NOW).tasks).toEqual([])
    expect(buildBackup('bukan larik', NOW).tasks).toEqual([])
  })
})

describe('createBackupFile', () => {
  it('reads the stored tasks and its text parses back to the same tasks', async () => {
    seed(TASK)
    const { filename, text } = await settle(createBackupFile(NOW))

    expect(filename).toBe('deadlineradar-backup-2026-10-04.json')
    const parsed = JSON.parse(text)
    expect(parsed.version).toBe(1)
    expect(parsed.tasks).toEqual([TASK])
  })

  it('rejects when the stored tasks cannot be read', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
    })

    const error = await captureFailure(createBackupFile(NOW))
    expect(error.name).toBe('StorageError')
  })
})

describe('parseBackup when the file cannot be used', () => {
  it('refuses text that is not JSON', () => {
    expect(() => parseBackup('abc')).toThrowError('Berkas bukan JSON yang valid.')
  })

  it('refuses a JSON array instead of an object', () => {
    expect(() => parseBackup('[]')).toThrowError('Format berkas tidak dikenali.')
  })

  it('refuses an object without a tasks array', () => {
    expect(() => parseBackup(JSON.stringify({ version: 1 }))).toThrowError(
      'Format berkas tidak dikenali.',
    )
  })

  it('refuses another version', () => {
    expect(() => parseBackup(JSON.stringify({ version: 2, tasks: [TASK] }))).toThrowError(
      'Versi berkas tidak didukung.',
    )
  })

  it('refuses more than 5000 tasks before it maps a single entry', () => {
    // Every entry is unusable, so a check after the mapping would report this
    // file as having nothing valid in it instead.
    const tasks = Array.from({ length: 5001 }, () => ({ course: 'Fisika' }))

    expect(() => parseBackup(backupOf(tasks))).toThrowError(
      'Berkas berisi terlalu banyak tugas. Maksimal 5000.',
    )
  })

  it('refuses a file with no task at all', () => {
    expect(() => parseBackup(backupOf([]))).toThrowError('Berkas tidak berisi tugas.')
  })

  it('refuses a file where no entry survives', () => {
    expect(() => parseBackup(backupOf([{ course: 'Fisika' }]))).toThrowError(
      'Tidak ada tugas yang valid di berkas ini.',
    )
  })
})

describe('parseBackup with a usable file', () => {
  const MIXED = [
    TASK,
    { id: 'tanpa-judul', course: 'Fisika', deadline: '2026-10-04T23:59' },
    { id: 'tanpa-tenggat', title: 'Laporan', course: 'Kimia' },
    { ...TASK, title: 'Esai Fizika salinan' },
    { ...TASK, id: 'task-3', status: 'finished' },
  ]

  it('keeps the good entries and counts the skipped ones', () => {
    const result = parseBackup(backupOf(MIXED), NOW)

    expect(result.tasks.map((task) => task.id)).toEqual(['task-1', 'task-3'])
    expect(result.total).toBe(5)
    expect(result.skipped).toBe(3)
  })

  it('repairs an entry the model can save instead of dropping it', () => {
    const [repaired] = parseBackup(backupOf([MIXED[4]]), NOW).tasks

    expect(repaired.status).toBe('todo')
    expect(repaired.deadline).toBe('2026-10-04T23:59')
  })

  it('never returns a derived urgency', () => {
    expect('urgency' in parseBackup(backupOf([TASK]), NOW).tasks[0]).toBe(false)
  })

  it('returns no urgency of its own', () => {
    const result = parseBackup(backupOf([TASK]), NOW)

    expect(Object.keys(result).sort()).toEqual(['skipped', 'tasks', 'total'])
  })
})

describe('applyImport', () => {
  it('replaces the stored tasks and returns how many were written', async () => {
    seed(TASK, OTHER_TASK)

    await expect(settle(applyImport([createSampleTask({ id: 'task-9' })]))).resolves.toBe(1)
    expect(readStored().map((task) => task.id)).toEqual(['task-9'])
  })

  it('rejects and keeps the stored data when the write fails', async () => {
    seed(TASK)
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
    })

    const error = await captureFailure(applyImport([OTHER_TASK]))
    expect(error.name).toBe('StorageError')

    blocked.mockRestore()
    expect(readStored()).toEqual([TASK])
  })
})

describe('checkImportFile', () => {
  function fileOfSize(size) {
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  it('refuses a file larger than 2 MB', () => {
    expect(() => checkImportFile(fileOfSize(2 * 1024 * 1024 + 1))).toThrowError(
      'Berkas terlalu besar. Maksimal 2 MB.',
    )
  })

  it('accepts a file inside the limit', () => {
    expect(() => checkImportFile(fileOfSize(2 * 1024 * 1024))).not.toThrow()
  })
})
