# AGENTS.md

DeadlineRadar is a frontend-only CRUD app for university students to track assignments and deadlines. All user-facing text is Bahasa Indonesia; code, comments, and these docs are English.

## Commands

Real scripts from `package.json` (there is no `test` script and no test runner installed yet):

- `npm run dev` - start the Vite dev server
- `npm run build` - production build (`vite build`)
- `npm run lint` - ESLint flat config over `**/*.{js,jsx}` (`eslint .`)
- `npm run preview` - serve the production build locally

Run `npm run lint` and `npm run build` before you consider a change finished.

## Workflow

Plan -> Code -> Test -> Review -> Debug. Each agent ends its reply by naming the agent that goes next.

- **Plan** - inspect, then produce ordered steps and the file list. No code changes.
- **Code** - implement one feature per task, following ARCHITECTURE.md, CONSTRAINTS.md, DESIGN.md.
- **Test** - add or update tests for the feature just implemented.
- **Review** - review correctness, edge cases, and design compliance. No edits.
- **Debug** - investigate and fix a reported problem, smallest safe fix.

## Implementation rules

1. Inspect the existing project before changing code; read the files you are about to touch.
2. Reuse existing components and patterns instead of writing new ones.
3. Keep changes focused: one feature per task, no drive-by edits.
4. Avoid unnecessary dependencies. Adding one needs a clear reason and approval.
5. Keep naming and folder structure consistent with the existing layers.
6. Validate inputs before writing, and show inline messages next to the field.
7. Handle errors properly: every async path needs a loading, empty, success, and error state.
8. Do not introduce unrelated changes, including formatting-only churn.

## Working rules for limited models

- Read a file before editing it. Never edit blind.
- Never guess a file path or an API signature. Verify both.
- List the files you will change before changing them.
- Finish one small step before starting the next, and report progress plainly.
- When something is unclear, say so and ask. Do not invent requirements.

## Definition of Done

- The feature works end to end: list, detail, create, edit, delete, search, filter, sort.
- Input validation is present and shown inline.
- Loading, empty, success, and error states are handled.
- Delete asks for confirmation naming the task, and states it cannot be undone.
- `npm run build` and `npm run lint` pass.
- Tests are added or updated for the feature.
- DESIGN.md is respected, including copy rules.
- No unrelated files were changed.