/* ZONE B — a single per-ESP health card. Translates one EspCard view-model into
 * the ONE 0–100 health story: tier-colored gauge ring, the smoothed complaint
 * rate plotted against the 0.10% watch / 0.30% cliff scale, and a projection
 * chip + 14-day sparkline. Pure presentation — every value comes from the VM
 * (the engine is the oracle, mockup/render.js#renderEspCard the layout source). */
import type { EspCard as EspCardVM, Esp, Tier } from '@/lib/engine'
import { GaugeRing } from '@/components/charts/GaugeRing'
import { Sparkline } from '@/components/charts/Sparkline'

/** tier → state pill (mockup/render.js TIER_TAG). */
const TIER_TAG: Record<Tier, { label: string; cls: 'red' | 'amber' | 'green' }> = {
  healthy: { label: 'Healthy', cls: 'green' },
  watch: { label: 'Watch', cls: 'amber' },
  warn: { label: 'Warning', cls: 'amber' },
  critical: { label: 'Critical', cls: 'red' },
}

const TAG_STYLE: Record<'red' | 'amber' | 'green', { color: string; background: string }> = {
  red: { color: '#fca5a5', background: 'rgba(239,68,68,.13)' },
  amber: { color: '#fbbf24', background: 'rgba(245,158,11,.13)' },
  green: { color: '#4ade80', background: 'rgba(34,197,94,.13)' },
}

/** Rate-bar fill: solid green when healthy, escalating gradients otherwise. */
function rateBarFill(tier: Tier): string {
  if (tier === 'healthy') return '#22c55e'
  if (tier === 'critical') return 'linear-gradient(90deg,#fb923c,#ef4444)'
  return 'linear-gradient(90deg,#fbbf24,#fb923c)'
}

interface EspCardProps {
  id: Esp
  name: string
  dotColor: string
  card: EspCardVM
}

export function EspCard({ id, name, dotColor, card }: EspCardProps) {
  const tag = TIER_TAG[card.tier]
  const tagStyle = TAG_STYLE[tag.cls]
  const isCliff = card.daysToCliff != null
  const dangerColor = isCliff ? '#ef4444' : '#22c55e'

  return (
    <div className="panel esp" data-testid={`esp-${id}`}>
      <div className="esp-head">
        <div className="esp-name">
          <span className="chip" style={{ background: dotColor }} />
          {name}
        </div>
        <div className="esp-tag" style={{ color: tagStyle.color, background: tagStyle.background }}>
          {tag.label}
        </div>
      </div>

      <div className="esp-body">
        <GaugeRing score={card.score} color={card.ringColor} size={86} ringId={`${id}-ring`} />
        <div className="esp-metric">
          <div className="cap">
            Smoothed complaint rate{' '}
            <span className="mono" style={{ color: '#6a7080' }}>
              · 90% CI ≤ {card.ciUpperPct}
            </span>
          </div>
          <div className="mono rate">{card.smoothedRatePct}</div>
          <div className="ratebar">
            <div
              className="fill"
              style={{ width: `${(card.rateBarPos * 100).toFixed(0)}%`, background: rateBarFill(card.tier) }}
            />
            <div className="tick-watch" style={{ left: '0%' }} />
            <div className="tick-cliff" />
          </div>
          <div className="mono ratebar-cap">
            <span>0.10 watch</span>
            <span>0.30 cliff</span>
          </div>
        </div>
      </div>

      <div className="esp-foot">
        <div
          className="proj"
          style={{
            color: isCliff ? '#fca5a5' : '#4ade80',
            background: isCliff ? 'rgba(239,68,68,.13)' : 'rgba(34,197,94,.13)',
          }}
        >
          <span className="dot" style={{ background: dangerColor }} />
          <span className="t">{card.projection}</span>
        </div>
        <Sparkline values={card.spark} color={dangerColor} width={96} height={30} />
      </div>
    </div>
  )
}
