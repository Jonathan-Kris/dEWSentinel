import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// React Testing Library: unmount and clear the DOM between tests.
afterEach(() => {
  cleanup()
})
