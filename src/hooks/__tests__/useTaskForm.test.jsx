import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SIMULATED_LATENCY_MS,
  STORAGE_KEY,
} from '../../repository/taskRepository.js'
import taskService from '../../services/taskService.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { useTaskForm } from '../useTaskForm.js'

const VALID_VALUES = {
  title: 'Esai Fisika',
  course: 'Fisika Dasar',
  deadline: '2026-10-10T23:59',
}

const STORED = createSampleTask({ id: 'task-1', title: 'Esai Fisika' })
const MISSING_VALUES = { title: '', course: '', deadline: '' }

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function stored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
}

// A full quota or a blocked write, so the save fails inside the repository.
function blockWrites() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Runs one save and flushes every state it sets before the result is read.
async function runSave(result, values) {
  let outcome
  await act(async () => {
    outcome = await result.current.save(values)
  })
  return outcome
}

// Starts a save without waiting for it, so the pending state can be asserted.
async function startSave(result, values) {
  let pending
  await act(async () => {
    pending = result.current.save(values)
  })
  return pending
}

// Reads through the real service, which is the only path to the stored tasks.
async function readStored() {
  return taskService.list()
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useTaskForm validation', () => {
  it('reports the field errors of the service for an empty draft', () => {
    const { result } = renderHook(() => useTaskForm())
    expect(result.current.validate(MISSING_VALUES)).toEqual({
      title: 'Judul wajib diisi.',
      course: 'Mata kuliah wajib diisi.',
      deadline: 'Tenggat wajib diisi.',
    })
  })

  it('reports no field error for valid values', () => {
    const { result } = renderHook(() => useTaskForm())
    expect(result.current.validate(VALID_VALUES)).toEqual({})
  })
})

describe('useTaskForm saving in create mode', () => {
  it('resolves with ok true and the saved task', async () => {
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, VALID_VALUES)

    expect(outcome.ok).toBe(true)
    expect(outcome.task).toMatchObject(VALID_VALUES)
  })

  it('writes the new task into storage', async () => {
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, VALID_VALUES)
    const tasks = await readStored()

    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe(outcome.task.id)
  })

  it('gives the new task the default status and priority', async () => {
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, VALID_VALUES)

    expect(outcome.task.status).toBe('todo')
    expect(outcome.task.priority).toBe('medium')
  })

  it('keeps the deadline exactly as it was given', async () => {
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, VALID_VALUES)

    expect(outcome.task.deadline).toBe('2026-10-10T23:59')
  })

  it('leaves no failure message after a successful save', async () => {
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, VALID_VALUES)
    expect(result.current.saveError).toBe(null)
  })
})

describe('useTaskForm saving invalid values', () => {
  it('resolves with ok false and the field errors', async () => {
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, MISSING_VALUES)

    expect(outcome).toEqual({
      ok: false,
      fieldErrors: {
        title: 'Judul wajib diisi.',
        course: 'Mata kuliah wajib diisi.',
        deadline: 'Tenggat wajib diisi.',
      },
    })
  })

  it('writes nothing when the values are not valid', async () => {
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, MISSING_VALUES)
    expect(stored()).toBeNull()
  })

  it('reports no failure message for values the service refuses', async () => {
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, MISSING_VALUES)
    expect(result.current.saveError).toBe(null)
  })
})

describe('useTaskForm while a save is pending', () => {
  it('reports isSaving until the write has settled', async () => {
    const { result } = renderHook(() => useTaskForm())

    const pending = await startSave(result, VALID_VALUES)
    expect(result.current.isSaving).toBe(true)

    await act(async () => {
      await pending
    })
    expect(result.current.isSaving).toBe(false)
  })

  it('ignores a second save while the first one is pending', async () => {
    const { result } = renderHook(() => useTaskForm())
    let outcomes

    await act(async () => {
      // Both calls start in the same tick, which is the double submit case.
      outcomes = await Promise.all([
        result.current.save(VALID_VALUES),
        result.current.save({ ...VALID_VALUES, title: 'Esai Kedua' }),
      ])
    })

    expect(outcomes[0].ok).toBe(true)
    expect(outcomes[1]).toEqual({ ok: false })
  })

  it('writes one task only when two saves are started together', async () => {
    const { result } = renderHook(() => useTaskForm())

    await act(async () => {
      await Promise.all([
        result.current.save(VALID_VALUES),
        result.current.save({ ...VALID_VALUES, title: 'Esai Kedua' }),
      ])
    })

    const tasks = await readStored()
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Esai Fisika')
  })
})

describe('useTaskForm when the write fails', () => {
  it('resolves with ok false and no field errors', async () => {
    blockWrites()
    const { result } = renderHook(() => useTaskForm())

    const outcome = await runSave(result, VALID_VALUES)

    expect(outcome).toEqual({ ok: false })
  })

  it('reports the failure message', async () => {
    blockWrites()
    const { result } = renderHook(() => useTaskForm())

    await runSave(result, VALID_VALUES)

    expect(result.current.saveError).toBe('Gagal menyimpan. Coba lagi.')
  })

  it('stores nothing when the write throws', async () => {
    blockWrites()
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, VALID_VALUES)
    expect(stored()).toBeNull()
  })

  it('clears the failure message at the start of the next save', async () => {
    const blocked = blockWrites()
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, VALID_VALUES)
    expect(result.current.saveError).not.toBe(null)

    blocked.mockRestore()
    await startSave(result, VALID_VALUES)

    expect(result.current.saveError).toBe(null)
  })

  it('lets a later save succeed once storage works again', async () => {
    const blocked = blockWrites()
    const { result } = renderHook(() => useTaskForm())
    await runSave(result, VALID_VALUES)

    blocked.mockRestore()
    const outcome = await runSave(result, VALID_VALUES)

    expect(outcome.ok).toBe(true)
    expect(await readStored()).toHaveLength(1)
  })

  it('reports a task that is no longer there when editing', async () => {
    seed()
    const { result } = renderHook(() => useTaskForm(STORED))

    const outcome = await runSave(result, { title: 'Esai Baru' })

    expect(outcome).toEqual({ ok: false })
    expect(result.current.saveError).toBe('Tugas tidak ditemukan.')
  })
})

describe('useTaskForm saving in edit mode', () => {
  it('replaces the stored task instead of adding one', async () => {
    seed(STORED)
    const { result } = renderHook(() => useTaskForm(STORED))

    await runSave(result, { title: 'Esai Baru' })

    const tasks = await readStored()
    expect(tasks).toHaveLength(1)
  })

  it('keeps the id of the edited task', async () => {
    seed(STORED)
    const { result } = renderHook(() => useTaskForm(STORED))

    const outcome = await runSave(result, { title: 'Esai Baru' })

    expect(outcome.task.id).toBe('task-1')
  })

  it('stores the changed title of the edited task', async () => {
    seed(STORED)
    const { result } = renderHook(() => useTaskForm(STORED))

    await runSave(result, { title: 'Esai Baru' })

    const [task] = await readStored()
    expect(task.title).toBe('Esai Baru')
  })

  it('keeps the fields the change did not mention', async () => {
    seed(STORED)
    const { result } = renderHook(() => useTaskForm(STORED))

    await runSave(result, { title: 'Esai Baru' })

    const [task] = await readStored()
    expect(task.course).toBe(STORED.course)
    expect(task.deadline).toBe(STORED.deadline)
  })
})

describe('useTaskForm after unmounting', () => {
  it('writes no state while a save is still pending', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useTaskForm())

    let pending
    act(() => {
      pending = result.current.save(VALID_VALUES)
    })
    unmount()
    await pending
    await sleep(SIMULATED_LATENCY_MS + 50)

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('still writes the task into storage after unmounting', async () => {
    const { result, unmount } = renderHook(() => useTaskForm())

    let pending
    act(() => {
      pending = result.current.save(VALID_VALUES)
    })
    unmount()
    await pending

    await waitFor(async () => {
      expect(stored()).not.toBeNull()
    })
  })
})