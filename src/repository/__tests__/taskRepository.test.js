import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSampleTask } from '../../test/sampleTask.js'
import {
  SIMULATED_LATENCY_MS,
  STORAGE_KEY,
  StorageError,
  taskRepository,
} from '../taskRepository.js'

// Fixed clock so a repaired timestamp is predictable.
const FIXED_INSTANT = new Date(Date.UTC(2026, 9, 1, 8, 0, 0))

const KEPT_TASK = createSampleTask({ id: 'task-1' })
const OTHER_TASK = createSampleTask({ id: 'task-2', title: 'Laporan Kimia' })

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function seedRaw(raw) {
  localStorage.setItem(STORAGE_KEY, raw)
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

// Every method waits SIMULATED_LATENCY_MS and update waits twice, so the fake
// clock is fully drained before a result is read.
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

function blockStorage(method) {
  return vi.spyOn(Storage.prototype, method).mockImplementation(() => {
    throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_INSTANT)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('list', () => {
  it('returns an empty array when the key has never been written', async () => {
    await expect(settle(taskRepository.list())).resolves.toEqual([])
  })

  it('returns an empty array when the stored JSON is not an array', async () => {
    seedRaw(JSON.stringify({ title: 'Esai Fisika', course: 'Fisika Dasar' }))
    await expect(settle(taskRepository.list())).resolves.toEqual([])
  })

  it('returns an empty array when the stored text is not valid JSON', async () => {
    seedRaw('{ ini bukan json')
    await expect(settle(taskRepository.list())).resolves.toEqual([])
  })

  it('keeps only the usable entries of a mixed array', async () => {
    seed(
      createSampleTask({ id: 'task-1' }),
      { course: 'Fisika Dasar' },
      'bukan sebuah tugas',
      null,
      42,
    )
    const tasks = await settle(taskRepository.list())
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('task-1')
  })

  it('drops a stored urgency field because it is derived data', async () => {
    seed(createSampleTask({ id: 'task-1', urgency: 'overdue' }))
    const [task] = await settle(taskRepository.list())
    expect('urgency' in task).toBe(false)
  })

  it('repairs a stored entry field by field', async () => {
    seedRaw(
      JSON.stringify([
        {
          title: 'Laporan',
          course: '  Kimia  ',
          deadline: '2026-10-04',
          priority: 'urgent',
          status: 'finished',
          description: 42,
          createdAt: 'kemarin',
        },
      ]),
    )
    const [task] = await settle(taskRepository.list())
    expect(task.title).toBe('Laporan')
    expect(task.course).toBe('Kimia')
    expect(task.description).toBe('')
    expect(task.deadline).toBeNull()
    expect(task.priority).toBe('medium')
    expect(task.status).toBe('todo')
    // The unusable stored stamp is replaced by a real instant instead of kept.
    expect(task.createdAt).toBe(task.updatedAt)
    expect(Date.parse(task.createdAt)).toBeGreaterThanOrEqual(FIXED_INSTANT.getTime())
  })

  it('does not settle before the simulated latency has passed', async () => {
    let settled = false
    const pending = taskRepository.list().then((tasks) => {
      settled = true
      return tasks
    })
    await vi.advanceTimersByTimeAsync(SIMULATED_LATENCY_MS - 1)
    expect(settled).toBe(false)
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual([])
  })

  it('rejects with an unavailable StorageError when reading storage throws', async () => {
    blockStorage('getItem')
    const error = await captureFailure(taskRepository.list())
    expect(error).toBeInstanceOf(StorageError)
    expect(error.code).toBe('unavailable')
    expect(error.message).toBe('Penyimpanan tidak tersedia. Coba lagi.')
  })
})

describe('getById', () => {
  it('returns the task with the matching id', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    const task = await settle(taskRepository.getById('task-2'))
    expect(task.title).toBe('Laporan Kimia')
  })

  it('returns null for an unknown id', async () => {
    seed(KEPT_TASK)
    await expect(settle(taskRepository.getById('tidak-ada'))).resolves.toBeNull()
  })
})

describe('create', () => {
  it('appends the task so a later list returns it', async () => {
    seed(KEPT_TASK)
    const created = await settle(taskRepository.create(OTHER_TASK))
    const tasks = await settle(taskRepository.list())
    expect(created).toBe(OTHER_TASK)
    expect(tasks).toHaveLength(2)
    expect(tasks[1].id).toBe('task-2')
  })

  it('writes only under the single storage key', async () => {
    await settle(taskRepository.create(KEPT_TASK))
    expect(localStorage.length).toBe(1)
    expect(readStored()).toHaveLength(1)
  })

  it('rejects with an unavailable StorageError when writing storage throws', async () => {
    seed(KEPT_TASK)
    blockStorage('setItem')
    const error = await captureFailure(taskRepository.create(OTHER_TASK))
    expect(error).toBeInstanceOf(StorageError)
    expect(error.code).toBe('unavailable')
    expect(error.message.length).toBeGreaterThan(0)
    expect(error.message).toBe('Gagal menyimpan. Penyimpanan penuh atau tidak tersedia.')
  })
})

describe('update', () => {
  const REVISED = createSampleTask({
    id: 'task-1',
    title: 'Esai Fisika Revisi',
    updatedAt: '2026-10-02T10:00:00.000Z',
  })

  it('replaces the stored task with the same id and returns it', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    await expect(settle(taskRepository.update(REVISED))).resolves.toEqual(REVISED)
    const tasks = await settle(taskRepository.list())
    expect(tasks[0].title).toBe('Esai Fisika Revisi')
  })

  it('leaves the other stored tasks untouched', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    await settle(taskRepository.update(REVISED))
    const tasks = await settle(taskRepository.list())
    expect(tasks).toHaveLength(2)
    expect(tasks[1]).toEqual(expect.objectContaining({ id: 'task-2', title: 'Laporan Kimia' }))
  })

  it('rejects with a not_found StorageError for an unknown id', async () => {
    seed(KEPT_TASK)
    const error = await captureFailure(
      taskRepository.update(createSampleTask({ id: 'tidak-ada' })),
    )
    expect(error).toBeInstanceOf(StorageError)
    expect(error.code).toBe('not_found')
    expect(error.message).toBe('Tugas tidak ditemukan.')
  })
})

describe('remove', () => {
  it('deletes the task with the given id', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    await expect(settle(taskRepository.remove('task-1'))).resolves.toBeUndefined()
    const tasks = await settle(taskRepository.list())
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('task-2')
  })

  it('resolves without throwing and keeps the other tasks for an unknown id', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    await expect(settle(taskRepository.remove('tidak-ada'))).resolves.toBeUndefined()
    const tasks = await settle(taskRepository.list())
    expect(tasks).toHaveLength(2)
  })
})

describe('replaceAll', () => {
  it('writes the normalized entries and returns them', async () => {
    const result = await settle(
      taskRepository.replaceAll([createSampleTask({ id: 'task-9', title: '  Esai Baru  ' })]),
    )
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(
      expect.objectContaining({ id: 'task-9', title: 'Esai Baru' }),
    )
  })

  it('replaces every previously stored task', async () => {
    seed(KEPT_TASK, OTHER_TASK)
    await settle(taskRepository.replaceAll([createSampleTask({ id: 'task-9' })]))
    const tasks = await settle(taskRepository.list())
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('task-9')
  })

  it('drops unusable entries and keeps the rest', async () => {
    const result = await settle(
      taskRepository.replaceAll([{ course: 'Fisika Dasar' }, 'bukan tugas', OTHER_TASK]),
    )
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('task-2')
  })
})