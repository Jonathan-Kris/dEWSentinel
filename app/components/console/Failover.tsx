/* ZONE D — Failover playbook + standby pool. STUB — implemented in Slice 7.
 *
 * CONTRACT: Failover({ failover }) reads vm.failover.
 * See HANDOFF "Zone D" + ENGINE_SPEC §5.6. */
import type { Failover as FailoverVM } from '@/lib/engine'

export function Failover({ failover }: { failover: FailoverVM }) {
  return (
    <div className="panel fo" data-testid="zone-failover">
      <div className="zone-head" style={{ marginBottom: 16 }}>
        <div className="zone-title" style={{ fontSize: 13.5 }}>
          Failover playbook{' '}
          <span className="mono" style={{ color: '#8a90a0', fontWeight: 400, fontSize: 12.5 }}>
            · {failover.current.domain}
          </span>
        </div>
        <div style={{ fontSize: 11, color: '#6a7080' }}>backup plan in motion</div>
      </div>
      <div className="zone-sub mono">[Slice 7] current stage: {failover.current.stage}</div>
    </div>
  )
}
