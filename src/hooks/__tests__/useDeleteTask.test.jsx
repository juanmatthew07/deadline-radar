import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEY } from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { useDeleteTask } from '../useDeleteTask.js'

// The hook is exercised over the real service, the real repository and the jsdom
// localStorage, so every case here is the write the app really performs. Only Date
// is faked, which leaves the simulated repository latency on real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

const FIRST = createSampleTask({ id: 'task-1', title: 'Esai Fisika' })
const SECOND = createSampleTask({ id: 'task-2', title: 'Laporan Kimia', course: 'Kimia' })

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function readStored() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY))
}

// A write that cannot land, as in private mode or with a full quota.
function blockStorage() {
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan penuh.', 'QuotaExceededError')
  })
}

// Starts a removal and flushes the state it sets before the write settles. The
// returned promise is the removal itself, still pending.
async function startRemove(result, id) {
  let pending
  await act(async () => {
    pending = result.current.remove(id)
  })
  return pending
}

// Runs a removal to completion and returns what it resolved to.
async function runRemove(result, id) {
  let outcome
  await act(async () => {
    outcome = await result.current.remove(id)
  })
  return outcome
}

// Awaits a pending removal, so every outcome it would write has already run.
async function settle(pending) {
  await act(async () => {
    await pending
  })
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useDeleteTask remove', () => {
  it('deletes the task from storage and reports a success', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useDeleteTask())

    const outcome = await runRemove(result, FIRST.id)

    expect(outcome).toEqual({ ok: true })
    expect(readStored().map((task) => task.id)).toEqual(['task-2'])
  })

  it('reports a success for an id that is not stored and keeps the other tasks', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useDeleteTask())

    const outcome = await runRemove(result, 'task-does-not-exist')

    expect(outcome).toEqual({ ok: true })
    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('reports the failure message when the write cannot land', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useDeleteTask())
    blockStorage()

    const outcome = await runRemove(result, FIRST.id)

    expect(outcome).toEqual({ ok: false })
    expect(result.current.error).toBe('Gagal menghapus. Coba lagi.')
  })

  it('keeps the task in storage when the write cannot land', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useDeleteTask())
    blockStorage()

    await runRemove(result, FIRST.id)

    expect(readStored().map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('is busy while the removal is pending and idle once it settles', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useDeleteTask())
    expect(result.current.isDeleting).toBe(false)

    const pending = await startRemove(result, FIRST.id)
    expect(result.current.isDeleting).toBe(true)

    await settle(pending)
    expect(result.current.isDeleting).toBe(false)
  })

  it('clears the message of an earlier failure when the next removal starts', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useDeleteTask())
    const blocked = blockStorage()
    await runRemove(result, FIRST.id)
    expect(result.current.error).not.toBe(null)

    blocked.mockRestore()
    const pending = await startRemove(result, FIRST.id)

    expect(result.current.error).toBe(null)
    await settle(pending)
  })

  it('drops a second removal while one is still pending', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useDeleteTask())

    // Both removals start in the same tick, which is exactly the double click the
    // guard exists for.
    let first
    let second
    await act(async () => {
      first = result.current.remove(FIRST.id)
      second = result.current.remove(SECOND.id)
    })

    await settle(first)

    expect(await second).toEqual({ ok: false })
    expect(readStored().map((task) => task.id)).toEqual(['task-2'])
  })

  it('does not warn about state after unmounting during a pending removal', async () => {
    seed(FIRST)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useDeleteTask())

    const pending = await startRemove(result, FIRST.id)
    unmount()
    await settle(pending)

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('does not warn about state after unmounting during a failing removal', async () => {
    seed(FIRST)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useDeleteTask())
    blockStorage()

    const pending = await startRemove(result, FIRST.id)
    unmount()
    await settle(pending)

    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('useDeleteTask clearError', () => {
  it('drops the failure message', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useDeleteTask())
    blockStorage()
    await runRemove(result, FIRST.id)
    expect(result.current.error).not.toBe(null)

    await act(async () => {
      result.current.clearError()
    })

    expect(result.current.error).toBe(null)
  })

  it('does not warn about state when the screen is already gone', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result, unmount } = renderHook(() => useDeleteTask())

    unmount()
    await act(async () => {
      result.current.clearError()
    })

    expect(consoleError).not.toHaveBeenCalled()
  })
})