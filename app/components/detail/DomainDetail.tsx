/* SCREEN 2 — Domain detail (drill-down).
 *
 * CONTRACT: DomainDetail({ detail, esp, failover, meta, onBack }).
 * Renders its own `.console` card (header + raw-vs-smoothed chart + recommended
 * action + signal breakdown). "← Console" calls onBack(). Uses the shared
 * LineChart from @/components/charts. See HANDOFF "Screen 2" + ENGINE_SPEC §10.5. */
'use client'

import type { Detail, Failover, Meta, Tier, ViewModel } from '@/lib/engine'
import { RawVsSmoothedChart } from './RawVsSmoothedChart'
import { SignalBreakdown } from './SignalBreakdown'
import { RecommendedAction } from './RecommendedAction'

interface DomainDetailProps {
  detail: Detail
  esp: ViewModel['esp']
  failover: Failover
  meta: Meta
  onBack: () => void
}

/** Single 0–100 health score → colour. Low = red (danger), high = green. */
function scoreColor(score: number): string {
  return score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
}

/** Per-ESP tier → status-pill colour class. */
const TIER_CLS: Record<Tier, 'green' | 'amber' | 'red'> = {
  healthy: 'green',
  watch: 'amber',
  warn: 'amber',
  critical: 'red',
}

export function DomainDetail({ detail, esp, failover, meta, onBack }: DomainDetailProps) {
  const gmail = esp.gmail
  return (
    <div className="console" data-testid="screen-detail">
      <div className="detail-head">
        <button type="button" className="crumb" onClick={onBack}>
          ← Console
        </button>
        <div className="mono dname">{failover.current.domain}</div>
        <div className={`pill ${TIER_CLS[gmail.tier]}`} style={{ padding: '4px 11px', fontSize: '11.5px' }}>
          <span className="dot" />
          <span className="txt">{failover.current.stage}</span>
        </div>
        <div className="grow" />
        <div className="right">
          <div className="cap">Overall health score</div>
          <div className="mono val" style={{ color: scoreColor(gmail.score) }}>
            {gmail.score}
            <span style={{ fontSize: 13, color: '#6a7080' }}>/100</span>
          </div>
        </div>
      </div>
      <div className="detail-body">
        <div className="detail-left">
          <RawVsSmoothedChart detail={detail} meta={meta} />
          <RecommendedAction failover={failover} meta={meta} />
        </div>
        <div className="detail-right">
          <SignalBreakdown signals={detail.signals} />
        </div>
      </div>
    </div>
  )
}
