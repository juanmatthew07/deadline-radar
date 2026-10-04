import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SIMULATED_LATENCY_MS,
  STORAGE_KEY,
} from '../../repository/taskRepository.js'
import { createSampleTask } from '../../test/sampleTask.js'
import { useTasks } from '../useTasks.js'

// Every read runs on the real service over the real repository and the jsdom
// localStorage. Only Date is faked, so the clock is fixed while the simulated
// repository latency still runs on real timers.
const NOW = new Date(2026, 9, 4, 12, 0)

const FIRST = createSampleTask({ id: 'task-1', title: 'Esai Fisika' })
const SECOND = createSampleTask({ id: 'task-2', title: 'Laporan Kimia', course: 'Kimia' })

function seed(...tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

function seedRaw(raw) {
  localStorage.setItem(STORAGE_KEY, raw)
}

// A blocked read, as in private mode or with a full quota.
function blockStorage() {
  return vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('Penyimpanan diblokir.', 'SecurityError')
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Runs a refresh and flushes the state it sets before the read settles.
async function startRefresh(result) {
  let pending
  await act(async () => {
    pending = result.current.refresh()
  })
  return pending
}

// Runs a refresh to completion.
async function runRefresh(result) {
  await act(async () => {
    await result.current.refresh()
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

describe('useTasks on mount', () => {
  it('starts in loading with no tasks', () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    expect(result.current.status).toBe('loading')
    expect(result.current.tasks).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('becomes ready with the stored tasks', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.tasks.map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('becomes ready with an empty list when nothing has been stored', async () => {
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.tasks).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('becomes ready with an empty list when the stored text is not valid JSON', async () => {
    seedRaw('{ ini bukan json')
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.tasks).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('reports an error status with a message when storage cannot be read', async () => {
    blockStorage()
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(typeof result.current.error).toBe('string')
    expect(result.current.error.length).toBeGreaterThan(0)
  })

  it('reports no tasks when storage cannot be read', async () => {
    blockStorage()
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.tasks).toEqual([])
  })

  it('does not set state after unmounting while a read is pending', async () => {
    seed(FIRST)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useTasks())
    unmount()
    await sleep(SIMULATED_LATENCY_MS + 50)
    expect(consoleError).not.toHaveBeenCalled()
  })
})

describe('useTasks after a failure', () => {
  it('shows the loading status again while a retry is pending', async () => {
    const blocked = blockStorage()
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('error'))

    blocked.mockRestore()
    seed(FIRST)
    await startRefresh(result)

    expect(result.current.status).toBe('loading')
    expect(result.current.isRefreshing).toBe(false)
  })

  it('becomes ready with the tasks once a retry succeeds', async () => {
    const blocked = blockStorage()
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('error'))

    blocked.mockRestore()
    seed(FIRST)
    await runRefresh(result)

    expect(result.current.status).toBe('ready')
    expect(result.current.tasks.map((task) => task.id)).toEqual(['task-1'])
    expect(result.current.error).toBe(null)
  })

  })

describe('useTasks refresh', () => {
  it('keeps the ready status and the current tasks while the read is pending', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await startRefresh(result)

    expect(result.current.status).toBe('ready')
    expect(result.current.isRefreshing).toBe(true)
    expect(result.current.tasks).toHaveLength(1)
  })

  it('picks up tasks written after the first read', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    seed(FIRST, SECOND)
    await runRefresh(result)

    expect(result.current.tasks.map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('stops reporting a refresh once the read has settled', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    const pending = await startRefresh(result)
    expect(result.current.isRefreshing).toBe(true)

    await act(async () => {
      await pending
    })

    expect(result.current.isRefreshing).toBe(false)
  })

  it('keeps the old tasks and the ready status when a refresh fails', async () => {
    seed(FIRST, SECOND)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    blockStorage()
    await runRefresh(result)

    expect(result.current.status).toBe('ready')
    expect(result.current.tasks.map((task) => task.id)).toEqual(['task-1', 'task-2'])
  })

  it('reports the failure message when a refresh fails', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    blockStorage()
    await runRefresh(result)

    expect(result.current.error).toBe('Penyimpanan tidak tersedia. Coba lagi.')
  })

  it('clears the refreshing flag after a failed read', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    blockStorage()
    await runRefresh(result)

    expect(result.current.isRefreshing).toBe(false)
  })

  it('clears the failure message after a later refresh succeeds', async () => {
    seed(FIRST)
    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.status).toBe('ready'))

    blockStorage()
    await runRefresh(result)
    expect(result.current.error).not.toBe(null)

    vi.restoreAllMocks()
    await runRefresh(result)

    expect(result.current.error).toBe(null)
    expect(result.current.status).toBe('ready')
  })
})