/* ZONE C — Alert feed (right rail). STUB — implemented in Slice 6.
 *
 * CONTRACT: AlertFeed({ alerts }) renders the `.rail` column (it IS the right
 * rail). See HANDOFF "Zone C" + ENGINE_SPEC §5.7. */
import type { Alert } from '@/lib/engine'

export function AlertFeed({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="rail" data-testid="zone-alerts">
      <div className="rail-head">
        <div className="rail-title">Alert feed</div>
        <div className="mono" style={{ fontSize: 10.5, color: '#5a6070' }}>
          newest first
        </div>
      </div>
      <div className="rail-hr" />
      <div id="alert-feed">
        <div className="zone-sub">[Slice 6] {alerts.length} alerts</div>
      </div>
    </div>
  )
}
