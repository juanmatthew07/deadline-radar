import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// globals is false, so cleanup is registered explicitly.
afterEach(() => cleanup())

// jsdom has no object URL support, so export tests need these stubs.
URL.createObjectURL = vi.fn(() => 'blob:deadline-radar')
URL.revokeObjectURL = vi.fn()