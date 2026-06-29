/* SCREEN 2 — Domain detail (drill-down). STUB — implemented in Slice 9.
 *
 * CONTRACT: DomainDetail({ detail, esp, failover, meta, onBack }).
 * Renders its own `.console` card (header + raw-vs-smoothed chart + recommended
 * action + signal breakdown). "← Console" calls onBack(). Use the shared
 * LineChart from @/components/charts. See HANDOFF "Screen 2" + ENGINE_SPEC §10.5. */
import type { Detail, Failover, Meta, ViewModel } from '@/lib/engine'

interface DomainDetailProps {
  detail: Detail
  esp: ViewModel['esp']
  failover: Failover
  meta: Meta
  onBack: () => void
}

export function DomainDetail({ detail, esp, failover, meta, onBack }: DomainDetailProps) {
  void detail
  void meta
  return (
    <div className="console" data-testid="screen-detail">
      <div className="detail-head">
        <button type="button" className="crumb" onClick={onBack}>
          ← Console
        </button>
        <div className="mono dname">{failover.current.domain}</div>
        <div className="grow" />
        <div className="right">
          <div className="cap">Overall health score</div>
          <div className="mono val" style={{ color: '#f87171' }}>
            {esp.gmail.score}
            <span style={{ fontSize: 13, color: '#6a7080' }}>/100</span>
          </div>
        </div>
      </div>
      <div className="detail-body">
        <div className="detail-left">
          <div className="zone-sub">[Screen 2 — Slice 9]</div>
        </div>
        <div className="detail-right">
          <div className="sb-title">Signal breakdown</div>
        </div>
      </div>
    </div>
  )
}
