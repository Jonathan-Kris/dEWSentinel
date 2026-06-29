'use client'

import type { GlobalStatus, Meta, Scenario } from '@/lib/engine'
import { Controls } from './Controls'

interface TopBarProps {
  meta: Meta
  globalStatus: GlobalStatus
  scenario: Scenario
  seed: number
  onScenario: (s: Scenario) => void
  onSeed: (n: number) => void
}

/** Top bar: wordmark, account selector, controls, global status pill, last-synced. */
export function TopBar({ meta, globalStatus, scenario, seed, onScenario, onSeed }: TopBarProps) {
  return (
    <div className="topbar">
      <div className="brand">
        <span className="logo">
          <span />
        </span>{' '}
        dEWSentinel
      </div>
      <div className="vsep" />
      <div className="acct">
        <span>
          <span className="mono" id="account-name" style={{ color: '#f2f3f7' }}>
            {meta.account}
          </span>{' '}
          <span style={{ color: '#6a7080' }}>— {meta.domainCount} domains</span>
        </span>
        <span style={{ color: '#6a7080' }}>▾</span>
      </div>
      <div className="grow" />
      <Controls scenario={scenario} seed={seed} onScenario={onScenario} onSeed={onSeed} />
      <div className="vsep" />
      <div className={`pill ${globalStatus.level}`} id="status-pill">
        <span className="dot" />
        <span className="txt">{globalStatus.text}</span>
      </div>
      <div className="mono" id="last-synced" style={{ fontSize: 12, color: '#6a7080' }}>
        last synced {meta.lastSyncedMin} min ago
      </div>
    </div>
  )
}
