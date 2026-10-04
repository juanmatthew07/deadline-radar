import { normalizeTask } from '../models/task.js'
import { taskRepository } from '../repository/taskRepository.js'
import { list, validateTask } from './taskService.js'

// The one backup format this version writes and the only one it reads.
export const BACKUP_VERSION = 1

// A file that large or long is not a backup of a study list, so it is refused
// before it is read and before a single entry is mapped.
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024
export const MAX_IMPORT_TASKS = 5000

const FILE_PREFIX = 'deadlineradar-backup-'
const MEGABYTES = 1024 * 1024

// Every message is Bahasa Indonesia because the UI shows it as it is.
const NOT_JSON = 'Berkas bukan JSON yang valid.'
const UNKNOWN_FORMAT = 'Format berkas tidak dikenali.'
const UNSUPPORTED_VERSION = 'Versi berkas tidak didukung.'
const TOO_MANY_TASKS = `Berkas berisi terlalu banyak tugas. Maksimal ${MAX_IMPORT_TASKS}.`
const NO_TASKS = 'Berkas tidak berisi tugas.'
const NOTHING_VALID = 'Tidak ada tugas yang valid di berkas ini.'
const FILE_TOO_LARGE = `Berkas terlalu besar. Maksimal ${MAX_IMPORT_BYTES / MEGABYTES} MB.`

// The nine stored fields, one by one, so a derived key such as urgency on the
// input can never reach the file.
const TASK_FIELDS = Object.freeze([
  'id',
  'title',
  'course',
  'description',
  'deadline',
  'priority',
  'status',
  'createdAt',
  'updatedAt',
])

// Carries one of the messages above, so the hook can show it and tell a refused
// file apart from a failed read.
export class BackupError extends Error {
  constructor(message) {
    super(message)
    this.name = 'BackupError'
  }
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

// Local date parts, never toISOString: the file name has to name the day the
// student pressed the button, and a UTC string can name yesterday.
export function getBackupFilename(now = new Date()) {
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${FILE_PREFIX}${day}.json`
}

function toEntry(task) {
  const source = isPlainObject(task) ? task : {}
  const entry = {}
  for (const field of TASK_FIELDS) entry[field] = source[field] ?? null
  return entry
}

// Pure and never mutates the given array. A value that is not an array is no
// tasks at all, so a caller cannot make a broken file out of it.
export function buildBackup(tasks, now = new Date()) {
  const list = Array.isArray(tasks) ? tasks : []
  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    tasks: list.map(toEntry),
  }
}

// Reads the stored tasks through the service, so storage is never touched here,
// and a storage failure reaches the caller as it is.
export async function createBackupFile(now = new Date()) {
  const tasks = await list()
  return {
    filename: getBackupFilename(now),
    text: JSON.stringify(buildBackup(tasks, now), null, 2),
  }
}

// Pure and synchronous, so it can validate everything before a caller writes
// anything. Returns the entries that survived, plus how many were skipped.
export function parseBackup(text, now = new Date()) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError(NOT_JSON)
  }

  if (!isPlainObject(parsed) || !Array.isArray(parsed.tasks)) {
    throw new BackupError(UNKNOWN_FORMAT)
  }

  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupError(UNSUPPORTED_VERSION)
  }

  const entries = parsed.tasks
  // The size is checked before any entry is mapped, so a huge file costs a
  // number comparison instead of thousands of repairs.
  if (entries.length > MAX_IMPORT_TASKS) throw new BackupError(TOO_MANY_TASKS)
  if (entries.length === 0) throw new BackupError(NO_TASKS)

  const total = entries.length
  const seen = new Set()
  const kept = []

  for (const entry of entries) {
    // The model repairs the entry, and repairs what it can: a bad status becomes
    // the default, a missing title drops the entry.
    const task = normalizeTask(entry, now)
    if (!task) continue
    // The model clears an unusable deadline instead of keeping it, so a task
    // without a real one cannot be stored and is skipped here.
    if (Object.keys(validateTask(task)).length > 0) continue
    // The first entry of an id wins, so a repeated id is counted as skipped.
    if (seen.has(task.id)) continue
    seen.add(task.id)
    kept.push(task)
  }

  if (kept.length === 0) throw new BackupError(NOTHING_VALID)

  return { tasks: kept, total, skipped: total - kept.length }
}

// Refuses an oversize file before it is read into memory.
export function checkImportFile(file) {
  if (typeof file?.size === 'number' && file.size > MAX_IMPORT_BYTES) {
    throw new BackupError(FILE_TOO_LARGE)
  }
}

// The one write of an import: replaceAll writes once, so a failure leaves the
// stored data exactly as it was.
export async function applyImport(tasks) {
  const written = await taskRepository.replaceAll(Array.isArray(tasks) ? tasks : [])
  return written.length
}
