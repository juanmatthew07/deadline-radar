# ARCHITECTURE.md

DeadlineRadar is a single-user, browser-only CRUD app. No backend, no database, no login. Persistence is browser `localStorage` behind a repository interface, so a real API can replace it later without touching the UI.

## Detected stack

Confirmed by reading `package.json`, `vite.config.js`, `eslint.config.js`, and `src/`:

- Vite 8 (`vite`, `@vitejs/plugin-react`), dev server and build via `vite` / `vite build`.
- React 19 with plain JavaScript and JSX. No TypeScript: files are `.js` / `.jsx`, and `tsconfig.json` does not exist.
- `type: module`, so all modules use ESM `import` / `export`.
- ESLint 10 flat config (`eslint.config.js`) covering `**/*.{js,jsx}` with `js.configs.recommended`, `react-hooks` (flat recommended) and `react-refresh` (`vite` preset). Lint runs as `eslint .`.
- Styling: plain CSS. `src/index.css` holds `:root` custom properties as a design-token block and resets, `src/App.css` holds component styles using nested selectors and those variables. No CSS framework, no CSS-in-JS, no utility library.
- State: React built-ins only (`useState`, `useEffect`, `useMemo`). No Redux, Zustand, or other state library.
- No router dependency; view switching is handled with local component state or the History API.
- Testing: not installed yet. `package.json` has no `test` script and Vitest is not a dependency. See the testing section below.
- Current app code is the untouched Vite starter (`src/App.jsx` renders the template hero). It is a scaffold to be replaced, not a pattern to extend.
- Note: the starter's tokens in `src/index.css` include a purple accent (`--accent: #aa3bff`). DESIGN.md forbids purple-to-blue schemes, so the token file must be replaced with the project palette.

## Structure

```text
src/
  main.jsx              React entry point, imports tokens + global CSS
  App.jsx               Route/view switch, nothing else
  pages/                Screen-level composition
    DashboardPage.jsx   Home screen: summary tiles and the widgets below them
    TaskListPage.jsx    Main screen: heading, notice, filters, list
    TaskDetailPage.jsx  (optional) single task view
  components/           Reusable, presentational
    TopBar.jsx          App name, navigation tabs, add button
    SummaryStrip.jsx    Counts per urgency level
    SummaryTiles.jsx    Five urgency stat tiles on the dashboard
    FilterRow.jsx       Status and course filters, sort control
    TaskList.jsx        List of rows, empty and loading states
    TaskRow.jsx         Title, course, deadline, urgency label, status
    TaskForm.jsx        Create and edit form with inline validation
    UrgencyBadge.jsx    Text label plus muted marker
    ConfirmDialog.jsx  The one overlay: delete and import confirmations
    DeleteDialog.jsx    Thin wrapper naming the task, over ConfirmDialog
    BackupActions.jsx   Dashboard card for exporting and importing tasks
    Icon.jsx            Wrapper around lucide-react, the only importer of it
    icons.js            Explicit list of allowed icon components
  hooks/
    useTasks.js         Load, create, update, delete, search, filter, sort
    useBackup.js        Export and import state, the pending confirmation
    useDebouncedValue.js
  services/
    taskService.js      Business logic: validation, search, filter, sort
    backupService.js    Backup envelope, file parsing, and the import write
  repository/
    taskRepository.js   localStorage read/write, promise-based
  models/
    task.js             Task create, update, normalize, field limits
  utils/
    urgency.js          Pure urgency derivation from deadline + status
    date.js             ISO parsing and formatting, day boundaries
    stats.js            Pure dashboard statistics over all tasks
    download.js         Blob download and FileReader text read
    id.js               Id generation
  styles/
    tokens.css          All CSS custom properties
    base.css            Reset and element defaults
```

Existing files: `src/main.jsx`, `src/App.jsx`, `src/styles/tokens.css`, `src/styles/base.css`. Reuse and extend rather than duplicate.

## Layering

```text
UI (presentational components)
  -> page (screen composition, owns no storage logic)
    -> component (reusable UI, no storage access)
      -> hook (state, async lifecycle, loading/error flags)
        -> service (business rules: validation, search, filter, sort)
          -> repository (localStorage only, returns promises)
            -> localStorage
```

Flow diagram:

```text
User types in TaskForm
        |
        v
useTasks.handleCreate()      loading = true, error = null
        |
        v
taskService.create(draft)   validates, normalizes, stamps timestamps
        |                    returns { task } or throws ValidationError
        v
taskRepository.create(task)  awaits small latency, writes storage key
        |                    "deadlineradar:tasks:v1"
        v
useTasks refreshes list --> service re-runs search/filter/sort --> page re-renders
```

Rules that keep the flow intact:

- A component never calls `localStorage` and never imports the repository directly.
- A hook never encodes business rules; it only orchestrates and holds async state.
- A service never touches storage and never imports React.
- The repository holds no business rules and no validation, only read and write.

## Data model

```js
// Task, as stored in localStorage
{
  id: string,             // stable, generated on create
  title: string,          // required, trimmed, 1-120 chars
  course: string,         // required, trimmed, 1-80 chars
  description: string,    // optional, may be ''
  deadline: string,       // ISO 8601 date-time, e.g. "2026-10-04T23:59"
  priority: 'low' | 'medium' | 'high',
  status: 'todo' | 'in_progress' | 'done',
  createdAt: string,      // ISO timestamp, set once
  updatedAt: string       // ISO timestamp, set on every write
}
```

Derived urgency is never stored:

```js
// utils/urgency.js, pure function, takes a task and a reference date
type Urgency = 'overdue' | 'due_today' | 'this_week' | 'later' | 'done'
```

- `done` when `status === 'done'`, regardless of deadline.
- `overdue` when the deadline has passed.
- `due_today` when the deadline falls on the current local day.
- `this_week` when the deadline falls within the next seven days.
- `later` otherwise.

`utils/urgency.js` exposes pure functions such as `getUrgency(task, now)` and `countByUrgency(tasks, now)`, plus `URGENCY_LABELS` for the Bahasa Indonesia text labels. No Date objects are stored and no urgency value is written to storage. Day boundaries are computed in the student's local timezone by `utils/date.js`, so a task due at 23:59 stays "today" until local midnight.

## CRUD flows

- Create: form submit -> `taskService.create` validates -> repository inserts -> list refreshes -> inline success message.
- Read: on mount the hook calls `taskService.list`, which reads all tasks, validates their shape, and returns them. Search, filter, and sort are applied in the service on that list, not in JSX.
- Update: open the form with a task -> validate -> repository replaces the item and updates `updatedAt` -> refresh -> inline success message.
- Delete: open `DeleteDialog` naming the task and stating it cannot be undone -> on confirm, repository removes it -> refresh -> inline confirmation message. Cancel does nothing.
- Search: case-insensitive substring match on `title` and `course`, trimmed, debounced by the hook.
- Filter: `status` and `course` filters, `course` options derived from the stored tasks, plus "all" defaults. Search, filters, and sort compose.
- Sort: by `deadline` ascending by default; optional descending. Completed tasks are not removed from the list, they only get the `done` urgency label.

## Responsibilities

Components:

- `TopBar` renders the app name, the search input, and the add button. Holds no task state.
- `SummaryStrip` renders urgency counts from `countByUrgency`. Presentational.
- `FilterRow` renders status, course, and sort controls from props with callbacks.
- `TaskList` renders rows, plus loading skeleton rows, the empty state, and the error state with retry.
- `TaskRow` renders title, course, formatted deadline, urgency label, and status for one task.
- `TaskForm` renders labelled inputs, inline validation messages, and a submit button that is a verb.
- `TaskDetail` renders one task and its edit and delete actions.
- `ConfirmDialog` is the only element allowed a shadow, because it is the one overlay. It is shared: the delete confirmation is the danger tone, the import confirmation is the neutral tone.
- `BackupActions` renders the export and import controls of the dashboard card, with the messages and the import confirmation.

Services, `taskService.js`:

- `list()` -> `Promise<Task[]>`, validates shape and returns tasks.
- `create(draft)` / `update(id, patch)` -> validate, normalize, stamp timestamps, then delegate to the repository.
- `remove(id)` -> delegate to the repository.
- `applyQuery(tasks, { query, status, course, sort })` -> pure filter and sort.
- `validateTask(draft)` -> `{ isValid, errors }` keyed by field, messages in Bahasa Indonesia.
- Throws a validation error carrying field messages so the form can show them inline.

Service, `backupService.js`, the only module besides `taskService` that reaches the repository:

- `buildBackup(tasks, now)` / `createBackupFile(now)` -> the envelope `{ version: 1, exportedAt, tasks }` as file name and text, holding only the nine stored fields.
- `parseBackup(text, now)` -> pure and synchronous; `{ tasks, total, skipped }` or a `BackupError` with an Indonesian message.
- `checkImportFile(file)` -> rejects a file over `MAX_IMPORT_BYTES` before it is read.
- `applyImport(tasks)` -> `repository.replaceAll`, so the data is replaced in one write, and returns how many tasks were written.

Repository, `taskRepository.js`:

- Reads and writes only the key `deadlineradar:tasks:v1`.
- Promise-based: `list()`, `getById(id)`, `create(task)`, `update(id, task)`, `remove(id)`, `replaceAll(tasks)` for import.
- Adds a small simulated latency so loading states are real, not theoretical.
- Parses JSON defensively: a missing key yields `[]`, a non-array value is treated as empty, and an array containing malformed entries is normalized field by field and drops unusable entries instead of throwing.
- If `localStorage` access throws, for example in private mode or a full quota, it rejects with a clear error so the UI can show an error state.

## Validation and errors

Validation runs in the service before every write, so no invalid task reaches storage. `TaskForm` calls the same `validateTask` for inline messages, which keeps form messages and stored data consistent.

Field rules: `title` required, trimmed, at most 120 characters; `course` required, trimmed; `deadline` required, a parseable date converted to an ISO date-time string; `priority` and `status` restricted to their allowed values. Cross-field rule: a task cannot be marked `done` without a valid deadline.

Error handling:

- Repository failures reject; the hook sets `error` and stops the loading state.
- The UI shows a plain message with a retry action, for example "Gagal menyimpan. Coba lagi."
- Corrupted storage never crashes the app: the repository normalizes what it can, drops what it cannot, and reports what was dropped.
- Import validates the file shape before `replaceAll`, and reports the number of imported tasks.

## Testing approach

Vitest with React Testing Library and `jsdom` is the planned test stack. It is not installed yet, and adding it needs approval per CONSTRAINTS.md.

```text
unit      utils/urgency.js, utils/date.js, services/taskService.js
           fake timers for "due today" and "this week"
repository taskRepository.js against a stubbed localStorage
component  TaskForm, TaskRow, TaskList, DeleteDialog, SummaryStrip
flow       render App, create a task, assert it appears in the list,
           edit it, delete it with confirmation
```

Priority cases: urgency boundaries, empty list, past deadlines, invalid dates, corrupted localStorage, duplicate titles, search and filter composition, and sort order.

## Approved decisions

Settled choices for this project. Where a decision contradicts an earlier section, this section wins.

1. **Test tooling** is installed in milestone M1b, right after M1, not at the end. Approved dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. No runtime dependency is added except `lucide-react` (see decision 9).
2. **Deadlines** are stored exactly as the `datetime-local` value, for example `2026-10-04T23:59`, a local ISO string. Never convert with `toISOString()`, which shifts the wall-clock time and breaks "due today". The reference time `now` must be injectable in the date and urgency functions.
3. **CSS location**: each component has one colocated plain CSS file, for example `src/components/TaskList.css`. Shared styles live only in `src/styles/tokens.css` and `src/styles/base.css`.
4. **Navigation** uses React view state only. No router and no History API.
5. **Backup**: import replaces all tasks through the repository `replaceAll` method, behind a confirmation. Export uses the envelope `{ version: 1, exportedAt, tasks }`.
6. **The summary strip** counts all stored tasks, not the filtered view.
7. **Shell files**: `index.html` uses `lang="id"` and the title "DeadlineRadar". `README.md` is rewritten and `public/favicon.svg` is replaced with a plain one-colour mark in the final milestone.
8. **Structure**: the `models/` folder, `src/models/task.js`, is part of the structure.
9. **Icon library**: `lucide-react` is approved as the icon library. It may only be reached through `src/components/Icon.jsx`, a small wrapper component, and `src/components/icons.js`, the explicit list of allowed icons. No other icon library is approved, and `lucide-react` must not be imported anywhere else.
10. **Design rules rewritten**: DESIGN.md was rewritten. Cards, colour, and light icons are allowed, and its forbidden list defines what must not be done.
11. **Home screen and navigation**: the home screen is the Dashboard. Navigation is React view state only, one of `dashboard`, `list`, `detail` (with a `from` field), and `form` (with a `from` field), still no router and no History API. Dashboard statistics are derived by pure functions in `src/utils/stats.js` over ALL stored tasks, not over the filtered view like decision 6 says for the list, and they are never stored. Milestone M8 was redefined as the Dashboard and split: M8a is the screen, the navigation, the statistics, and the stat tiles; M8b adds the widgets below them.
12. **Backup** (milestone M9). The file is the envelope `{ version: 1, exportedAt, tasks }`, holding only the nine stored fields and never a derived urgency. Import replaces every task through the repository `replaceAll`, behind a confirmation, so it goes through one write. The file is validated completely before anything is written: it must be JSON, an object, version 1, and it may hold at most 5000 tasks and 2 MB; entries that are invalid, repeat an id, or carry no usable deadline are skipped and counted. The backup UI is a card on the Dashboard, below the widgets and below the empty state so an import works with no data. `ConfirmDialog` is the single shared overlay: the danger tone for delete, the neutral tone for import.