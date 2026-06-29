/* ZONE D — Failover playbook + standby pool (Slice 7).
 *
 * CONTRACT: Failover({ failover }) reads vm.failover.
 * Renders the 5-stage escalation state machine (Healthy → Watch → Throttle →
 * Failover → Cooldown) with the live stage highlighted (the Failover-current
 * pill pulses), plus the hot-standby pool widget.
 * See HANDOFF "Zone D" + ENGINE_SPEC §5.6. */
import { Fragment } from 'react'
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
      <div className="fo-stages">
        {failover.stages.map((stage, i) => {
          const isCurrent = stage === failover.current.stage
          return (
            <Fragment key={stage}>
              {i > 0 && <div className="fo-arrow">→</div>}
              <div className={isCurrent ? `fo-stage active-${stage.toLowerCase()}` : 'fo-stage'}>
                {isCurrent ? `● ${stage}` : stage}
                {isCurrent && stage === 'Failover' && (
                  <span style={{ opacity: 0.8, fontWeight: 400 }}> · current</span>
                )}
              </div>
            </Fragment>
          )
        })}
      </div>
      <div className="standby">
        <div className="lbl">Standby pool</div>
        <div className="dots">
          {failover.standby.map((s) => (
            <span
              key={s.domain}
              title={`${s.domain} — Gmail ${s.gmailHealth} / Outlook ${s.outlookHealth}`}
            />
          ))}
        </div>
        <div className="mono info">
          3 hot-standby domains ready <span>(Gmail-warmed)</span>
        </div>
      </div>
    </div>
  )
}
