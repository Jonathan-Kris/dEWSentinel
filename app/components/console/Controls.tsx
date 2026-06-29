'use client'

import { useState } from 'react'
import type { Scenario } from '@/lib/engine'

interface ControlsProps {
  scenario: Scenario
  seed: number
  onScenario: (s: Scenario) => void
  onSeed: (n: number) => void
}

/**
 * Scenario toggle + seed input (ENGINE_SPEC §9 "Controls behavior").
 * The seed commits on change/Enter (lets the operator reshuffle the synthetic
 * noise on camera). There is deliberately NO replay button — a deterministic
 * re-render with an unchanged seed is a no-op (CONTEXT Decisions).
 */
export function Controls({ scenario, seed, onScenario, onSeed }: ControlsProps) {
  const [draft, setDraft] = useState(String(seed))

  const commit = () => {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n >= 0) onSeed(n)
    else setDraft(String(seed))
  }

  return (
    <div className="controls">
      <div className="seg" id="scenario-toggle" role="group" aria-label="Scenario">
        <button
          type="button"
          data-scenario="critical"
          className={scenario === 'critical' ? 'active' : ''}
          aria-pressed={scenario === 'critical'}
          onClick={() => onScenario('critical')}
        >
          Critical
        </button>
        <button
          type="button"
          data-scenario="healthy"
          className={scenario === 'healthy' ? 'active' : ''}
          aria-pressed={scenario === 'healthy'}
          onClick={() => onScenario('healthy')}
        >
          Healthy
        </button>
      </div>
      <label className="ctl">
        seed
        <input
          className="mono"
          id="seed-input"
          type="number"
          min={0}
          step={1}
          value={draft}
          aria-label="Seed"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
          }}
        />
      </label>
    </div>
  )
}
