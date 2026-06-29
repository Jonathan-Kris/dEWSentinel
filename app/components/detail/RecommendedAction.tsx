/* Screen 2 · the "so what". Turns the score into a concrete playbook. In the
 * critical case it's the 3-step failover plan (throttle → fail over to the next
 * warm standby → cooldown) with a live CTA; in the calm/healthy case it flips to
 * a green "all clear" card whose button is disabled — nothing to do. */
import type { Failover, Meta } from '@/lib/engine'

export function RecommendedAction({ failover, meta }: { failover: Failover; meta: Meta }) {
  const calm = meta.scenario === 'healthy'
  const standby = failover.standby[1] ? failover.standby[1].domain : 'standby-gmail-02'
  const steps = calm
    ? [
        'Maintain current sending rotation and warm-up cadence',
        'Keep standby pool warm',
        'No throttle or failover required',
      ]
    : [
        'Throttle Gmail sends on this domain to 20%',
        `Fail traffic over to ${standby}`,
        'Hold in Cooldown until 7 consecutive clean days',
      ]

  return (
    <div className={calm ? 'rec calm' : 'rec'}>
      <div className="rec-head">
        <div className="t">Recommended action</div>
        <div className="m">{calm ? 'all clear · monitoring' : 'failover playbook · 3 steps'}</div>
      </div>
      <div className="rec-steps">
        {steps.map((txt, i) => (
          <div className="rec-step" key={i}>
            <span
              className="mono n"
              style={{ background: calm ? '#1f6f43' : i < 2 ? '#ef4444' : '#3a4050' }}
            >
              {i + 1}
            </span>
            {txt}
          </div>
        ))}
      </div>
      <button type="button" className="rec-btn" disabled={calm}>
        {calm ? 'No action needed' : 'Apply failover playbook'}
      </button>
    </div>
  )
}
