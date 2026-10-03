// Plain factory for Task fixtures. It imports nothing from the app on purpose,
// because the Task model does not exist yet.
export function createSampleTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Esai Fisika',
    course: 'Fisika Dasar',
    description: 'Ringkasan gaya dan medan listrik.',
    deadline: '2026-10-04T23:59',
    priority: 'medium',
    status: 'todo',
    createdAt: '2026-10-01T08:00:00',
    updatedAt: '2026-10-01T08:00:00',
    ...overrides,
  }
}