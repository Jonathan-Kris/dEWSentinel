/* Frozen behaviour oracle for UI slices: the live critical ViewModel at the
 * default seed. Deterministic, so a live runEngine() call is equivalent to a
 * static snapshot and can never drift from the engine. Import this in component
 * tests and Storybook-style isolation renders. */
import { runEngine } from '@/lib/engine'

export const criticalVM = runEngine({ scenario: 'critical', seed: 42 })
