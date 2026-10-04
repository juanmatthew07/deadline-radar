# CONSTRAINTS.md

Hard rules for DeadlineRadar. If a task seems to need one of these broken, stop and ask first.

## Stack

1. Do not change the technology stack unless necessary. It is Vite 8 + React 19 + plain JavaScript JSX + plain CSS. Do not migrate to TypeScript, Next.js, or another framework as a side effect of a feature.
2. Do not add dependencies without a clear, stated reason and explicit approval. The only approved runtime dependency is the icon library `lucide-react`, and it may only be used through `src/components/Icon.jsx` and `src/components/icons.js`. No other icon library, no UI component library, no CSS framework, no state library, no font package, no date libraries, no router. A new dependency requires a note explaining what it replaces and why plain code is not enough.

## Boundaries

3. Do not add a backend, a database, an API server, or login and auth. The app is frontend-only and single-user.
4. `localStorage` may only be touched inside `repository/taskRepository.js`. No component, hook, page, service, or utility may read or write storage.
5. Do not bypass the service layer. UI and hooks call services; services call the repository. Never put storage logic, or persistence rules, inside a UI component.
6. Do not duplicate an existing component. Extend or reuse the one in `components/`. Do not add a second button, input, badge, or dialog variant for a slightly different look.

## Data

7. Do not store derived data. Urgency (`overdue`, `due_today`, `this_week`, `later`, `done`) is always computed from `deadline` and `status` at render time by `utils/urgency.js`. Never persist it.
8. Store dates as ISO 8601 strings and use exactly one versioned storage key: `"deadlineradar:tasks:v1"`. Do not invent a second key, and do not store `Date` objects, timestamps in milliseconds, or locale date strings.
9. Do not change public service or repository function signatures without explicit approval. The signatures in ARCHITECTURE.md are the contract other layers already depend on.

## Security and privacy

10. Do not expose secrets. No API keys, tokens, or credentials in source, `.env` files, or `localStorage`. This app needs none.
11. Import and export must treat the JSON file as untrusted input: parse it, validate the shape, and reject it with a clear message rather than trusting its contents.

## Process

12. Do not make unrelated refactors, renames, reformatting, or dependency bumps. Touch only what the current task requires.
13. Preserve the existing architecture and folder conventions from ARCHITECTURE.md. New files go in the layer they belong to, not in `src/` root.
14. Do not violate DESIGN.md. The forbidden list there is absolute: no emoji, no gradients, no glassmorphism, no blur or glow, no coloured shadows, no purple-to-blue schemes, no more than one accent hue, no icons inside coloured circles or squares, no marketing hero sections, no taglines or "Selamat datang" banners, no exclamation marks in user-facing copy, and no placeholder text. No icon library other than `lucide-react` through `src/components/Icon.jsx` and `src/components/icons.js`. Shadows may only use the tokens `--shadow-card`, `--shadow-card-hover`, and `--shadow-overlay`.
15. All user-facing text is Bahasa Indonesia. Code, comments, and documentation stay in English. Validation messages and urgency labels are user-facing, so they are Indonesian.

## Quality gate

16. `npm run lint` and `npm run build` must pass. No new ESLint warnings from `react-hooks` or `react-refresh`.
17. Every feature needs tests. Vitest and React Testing Library are planned but not installed yet, so ask before adding them.
18. Write code for a single user on their own laptop. No multi-user concerns, no concurrency handling, no optimistic locking.