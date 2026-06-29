'use client'

import { useMemo } from 'react'
import { runEngine, type Scenario, type ViewModel } from '@/lib/engine'

/**
 * The single UI seam to the engine. Every zone reads its slice of the returned
 * ViewModel; no component touches engine internals. Referentially stable for a
 * given (scenario, seed) — same inputs ⇒ same object ⇒ identical render.
 */
export function useEngine(scenario: Scenario, seed: number): ViewModel {
  return useMemo(() => runEngine({ scenario, seed }), [scenario, seed])
}
