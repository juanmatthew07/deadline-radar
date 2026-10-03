import { normalizeTask } from '../models/task.js'

// The single storage key of the app. Never add a second one.
export const STORAGE_KEY = 'deadlineradar:tasks:v1'

// A loading state is only honest when a read takes time, so every promise
// here settles after this delay.
export const SIMULATED_LATENCY_MS = 120

const UNAVAILABLE = 'unavailable'
const NOT_FOUND = 'not_found'

const STORAGE_UNAVAILABLE = 'Penyimpanan tidak tersedia. Coba lagi.'
const STORAGE_WRITE_FAILED = 'Gagal menyimpan. Penyimpanan penuh atau tidak tersedia.'
const TASK_NOT_FOUND = 'Tugas tidak ditemukan.'

// Carries one of two codes so the UI can tell a blocked storage from a task
// that is not there any more.
export class StorageError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'StorageError'
    this.code = code
  }
}

function waitForLatency() {
  return new Promise((resolve) => {
    setTimeout(resolve, SIMULATED_LATENCY_MS)
  })
}

// Repairs one stored entry with the model. An entry the model cannot repair
// is dropped instead of breaking the whole list.
function toTask(entry) {
  try {
    return normalizeTask(entry)
  } catch {
    return null
  }
}

function parseStored(raw) {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    // Unreadable JSON counts as no data, not as a failure to show the user.
    return []
  }
}

// Only a blocked storage access can throw here, never the stored content:
// a missing key, broken JSON, a value that is not an array, and unusable
// entries all end up as a shorter or empty list.
function readTasks() {
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    throw new StorageError(STORAGE_UNAVAILABLE, UNAVAILABLE)
  }
  if (raw === null) return []
  return parseStored(raw).map(toTask).filter((task) => task !== null)
}

// Quota and blocked storage both throw here, and neither is swallowed.
function writeTasks(tasks) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  } catch {
    throw new StorageError(STORAGE_WRITE_FAILED, UNAVAILABLE)
  }
}

export const taskRepository = {
  async list() {
    await waitForLatency()
    return readTasks()
  },

  async getById(id) {
    await waitForLatency()
    return readTasks().find((task) => task.id === id) ?? null
  },

  // The service builds and validates the task, so it is stored as given.
  async create(task) {
    await waitForLatency()
    const tasks = readTasks()
    tasks.push(task)
    writeTasks(tasks)
    return task
  },

  async update(task) {
    await waitForLatency()
    const tasks = readTasks()
    const index = tasks.findIndex((stored) => stored.id === task?.id)
    if (index === -1) throw new StorageError(TASK_NOT_FOUND, NOT_FOUND)
    const next = [...tasks]
    next[index] = task
    writeTasks(next)
    return task
  },

  // Deleting something that is already gone is not an error.
  async remove(id) {
    await waitForLatency()
    const tasks = readTasks()
    const next = tasks.filter((task) => task.id !== id)
    if (next.length === tasks.length) return
    writeTasks(next)
  },

  // Import path: every entry is repaired exactly as a normal read repairs it.
  async replaceAll(tasks) {
    await waitForLatency()
    const entries = Array.isArray(tasks) ? tasks : []
    const written = entries.map(toTask).filter((task) => task !== null)
    writeTasks(written)
    return written
  },
}

export default taskRepository