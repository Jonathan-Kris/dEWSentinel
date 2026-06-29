/* ZONE C — Alert feed (right rail). Slice 6.
 *
 * CONTRACT: AlertFeed({ alerts }) renders the `.rail` column (it IS the right
 * rail). See HANDOFF "Zone C" + ENGINE_SPEC §5.7. Newest first; one `.alert`
 * row per alert, severity dot + mono timestamp + headline, and an action button
 * when the alert carries one (`.abtn.red` for red severity, else `.abtn.ghost`).
 * Everything is computed from the engine ViewModel — nothing is hardcoded. */
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
        {alerts.length === 0 ? (
          <div style={{ color: '#5a6070', fontSize: 12, padding: '14px 0' }}>No alerts.</div>
        ) : (
          alerts.map((a, i) => (
            <div className={'alert ' + a.severity} key={i}>
              <span className="adot" />
              <div className="abody">
                <div className="mono ats">{a.ts}</div>
                <div className="atext">{a.headline}</div>
                {a.action && (
                  <button className={'abtn ' + (a.severity === 'red' ? 'red' : 'ghost')}>
                    {a.action}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
