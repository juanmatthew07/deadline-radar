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
    TaskListPage.jsx    Main screen: summary, filters, list, detail, form
    TaskDetailPage.jsx  (optional) single task view
  components/           Reusable, presentational
    TopBar.jsx          App name, search input, add button
    SummaryStrip.jsx    Counts per urgency level
    FilterRow.jsx       Status and course filters, sort control
    TaskList.jsx        List of rows, empty and loading states
    TaskRow.jsx         Title, course, deadline, urgency label, status
    TaskForm.jsx        Create and edit form with inline validation
    UrgencyBadge.jsx    Text label plus muted marker
    DeleteDialog.jsx    Confirmation naming the task
  hooks/
    useTasks.js         Load, create, update, delete, search, filter, sort
    useDebouncedValue.js
  services/
    taskService.js      Business logic: validation, search, filter, sort
  repository/
    taskRepository.js   localStorage read/write, promise-based
  models/
    task.js             Task create, update, normalize, field limits
  utils/
    urgency.js          Pure urgency derivation from deadline + status
    date.js             ISO parsing and formatting, day boundaries
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
- `DeleteDialog` is the only element allowed a shadow, because it is an overlay.

Services, `taskService.js`:

- `list()` -> `Promise<Task[]>`, validates shape and returns tasks.
- `create(draft)` / `update(id, patch)` -> validate, normalize, stamp timestamps, then delegate to the repository.
- `remove(id)` -> delegate to the repository.
- `applyQuery(tasks, { query, status, course, sort })` -> pure filter and sort.
- `validateTask(draft)` -> `{ isValid, errors }` keyed by field, messages in Bahasa Indonesia.
- Throws a validation error carrying field messages so the form can show them inline.

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

1. **Test tooling** is installed in milestone M1b, right after M1, not at the end. Approved dev dependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`. No runtime dependency is ever added.
2. **Deadlines** are stored exactly as the `datetime-local` value, for example `2026-10-04T23:59`, a local ISO string. Never convert with `toISOString()`, which shifts the wall-clock time and breaks "due today". The reference time `now` must be injectable in the date and urgency functions.
3. **CSS location**: each component has one colocated plain CSS file, for example `src/components/TaskList.css`. Shared styles live only in `src/styles/tokens.css` and `src/styles/base.css`.
4. **Navigation** uses React view state only. No router and no History API.
5. **Backup**: import replaces all tasks through the repository `replaceAll` method, behind a confirmation. Export uses the envelope `{ version: 1, exportedAt, tasks }`.
6. **The summary strip** counts all stored tasks, not the filtered view.
7. **Shell files**: `index.html` uses `lang="id"` and the title "DeadlineRadar". `README.md` is rewritten and `public/favicon.svg` is replaced with a plain one-colour mark in the final milestone.
8. **Structure**: the `models/` folder, `src/models/task.js`, is part of the structure.