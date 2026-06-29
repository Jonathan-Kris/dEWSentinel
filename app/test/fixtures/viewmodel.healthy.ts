/* The calm/degenerate variant: the healthy ViewModel at the default seed.
 * Use it to test the calm-case rendering (no warning band, green everywhere). */
import { runEngine } from '@/lib/engine'

export const healthyVM = runEngine({ scenario: 'healthy', seed: 42 })
