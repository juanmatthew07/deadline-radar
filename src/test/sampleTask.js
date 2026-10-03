// Plain factory for Task fixtures. It imports nothing from the app so a test
// can control the whole stored entry, including fields the model repairs.
// createdAt and updatedAt are full ISO instants, which is what the model keeps.
export function createSampleTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Esai Fisika',
    course: 'Fisika Dasar',
    description: 'Ringkasan gaya dan medan listrik.',
    deadline: '2026-10-04T23:59',
    priority: 'medium',
    status: 'todo',
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
    ...overrides,
  }
}