/* ZONE A — Hero lead-time view (the money shot).
 *
 * A faithful React port of demo/render.js `renderLeadTime` (ENGINE_SPEC §9
 * "Hero health chart wiring", §0.1, §5.8). ONE 0–100 HEALTH line that FALLS
 * into danger (down = danger); there is no "risk" number anywhere. All geometry
 * is rebuilt from the ViewModel — nothing is hardcoded from the mockup.
 *
 * CONTRACT (do not change the signature; page.tsx depends on it):
 *   Hero({ leadTime, meta })  reads only vm.leadTime + vm.meta. */
import type { LeadTime, Meta } from '@/lib/engine'
import { LineChart } from '@/components/charts/LineChart'
import type { Band, ZoneLabel, VLine, Marker } from '@/components/charts/LineChart'
import { Sparkline } from '@/components/charts/Sparkline'

export function Hero({ leadTime, meta }: { leadTime: LeadTime; meta: Meta }) {
  const lt = leadTime
  const today = meta.today
  const dashAllGreen = lt.dashboardScore >= 80
  // the warning story only exists once Sentinel has crossed WATCH before today
  const showWarning = lt.warningGainedDays > 0 && lt.crossWatchDay < today

  // a single 0–100 HEALTH line that FALLS into danger (down = danger)
  const observedPts: [number, number][] = lt.healthSeries.map((v, i) => [i, v])
  // projected segment starts at today's point so the dashed line joins the solid one
  const projPts: [number, number][] = [
    [today, lt.healthSeries[today]],
    ...lt.healthProjSeries.map((v, k): [number, number] => [today + 1 + k, v]),
  ]
  const warnedAgo = Math.max(0, today - lt.crossWatchDay)

  const bands: Band[] = [
    // health zones — HEALTHY on top, DANGER at the bottom (down = bad)
    { fromY: lt.watchHealth, toY: 100, color: 'rgba(34,197,94,.08)' },
    { fromY: lt.dangerHealth, toY: lt.watchHealth, color: 'rgba(245,158,11,.09)' },
    { fromY: 0, toY: lt.dangerHealth, color: 'rgba(239,68,68,.11)' },
  ]
  const zoneLabels: ZoneLabel[] = [
    { x: 0, y: lt.watchHealth + (100 - lt.watchHealth) / 2, label: 'HEALTHY', color: '#4ade80' },
    { x: 0, y: lt.dangerHealth + (lt.watchHealth - lt.dangerHealth) / 2, label: 'WATCH', color: '#fbbf24' },
    { x: 0, y: lt.dangerHealth / 2, label: 'DANGER', color: '#f87171' },
  ]
  const vlines: VLine[] = [{ x: today, color: '#6a7080', dash: '3 3', opacity: 0.65 }]
  const markers: Marker[] = []

  if (showWarning) {
    // warning-gained band: Sentinel crossed WATCH → lagging tools react
    bands.push({ fromX: lt.crossWatchDay, toX: lt.dashDropDay, color: 'rgba(129,140,248,.14)' })
    zoneLabels.push({
      x: (lt.crossWatchDay + lt.dashDropDay) / 2,
      y: 97,
      anchor: 'middle',
      size: 10,
      color: '#a5b4fc',
      label: '≈ ' + lt.warningGainedDays + ' days of warning gained',
    })
    vlines.push({ x: lt.crossWatchDay, color: '#818cf8', dash: '3 3', opacity: 0.55 })
    // Sentinel warned — open indigo ring sitting on the watch line
    markers.push({
      x: lt.crossWatchDay,
      y: lt.healthSeries[lt.crossWatchDay],
      color: '#818cf8',
      r: 6,
      label: '▲ Sentinel warned · ' + warnedAgo + 'd ago',
      labelColor: '#a5b4fc',
    })
    // today — filled grey dot where lagging tools finally notice
    markers.push({
      x: today,
      y: lt.healthSeries[today],
      color: '#8a90a0',
      fill: '#8a90a0',
      r: 5,
      strokeWidth: 0,
      label: '▲ reply rates now dropping',
      labelColor: '#8a90a0',
    })
  } else {
    // calm state: just mark today, no warning annotations
    markers.push({ x: today, y: lt.healthSeries[today], color: '#8a90a0', fill: '#8a90a0', r: 5, strokeWidth: 0 })
  }

  return (
    <div className="panel hero-grad hero" data-testid="zone-hero">
      <div className="zone-head">
        <div>
          <div className="zone-title">
            Lead-time view <small>· Gmail · acme-outreach-03.com</small>
          </div>
          <div className="zone-sub">We see the dip before your reply rates do.</div>
        </div>
        <div className="zone-meta">last 30 days</div>
      </div>

      {/* lagging "today's dashboard" strip — flat & reassuring, separate axis */}
      <div className="dash-strip" data-testid="dash-strip">
        <div className="lbl">Today&apos;s dashboard</div>
        <Sparkline
          values={lt.dashboardSeries}
          color="#34d399"
          width={110}
          height={16}
          style={{ flexShrink: 0, opacity: 0.65 }}
        />
        <div className="desc">Sequencer health score — flat all month, sees nothing wrong</div>
        <div className="mono score">
          <span>{lt.dashboardScore}</span>
          <small>/100</small>
        </div>
        <div
          className="tag"
          style={
            dashAllGreen
              ? { color: '#4ade80', background: 'rgba(34,197,94,.13)' }
              : { color: '#fca5a5', background: 'rgba(239,68,68,.13)' }
          }
        >
          {dashAllGreen ? '✓ all green' : '⚠ finally dipping'}
        </div>
      </div>

      <LineChart
        xDomain={[0, today + lt.projDays]}
        yDomain={[0, 100]}
        pad={{ l: 76, r: 30, t: 16, b: 52 }}
        bands={bands}
        zoneLabels={zoneLabels}
        hlines={[
          { y: lt.dangerHealth, color: '#f87171', dash: '6 4', width: 1.2, opacity: 0.6, label: 'cliff' },
          { y: lt.watchHealth, color: '#fbbf24', dash: '6 4', width: 1.2, opacity: 0.6, label: 'watch' },
        ]}
        vlines={vlines}
        yTicks={[
          { value: 100, label: '100' },
          { value: 50, label: '50' },
          { value: 0, label: '0' },
        ]}
        yTitle="Health score"
        xTicks={[
          { value: 0, label: '30d ago' },
          { value: today, label: 'today', anchor: 'middle' },
          { value: today + lt.projDays, label: '+' + lt.projDays + 'd', anchor: 'end' },
        ]}
        series={[
          { points: observedPts, color: '#818cf8', width: 3, glow: true },
          { points: projPts, color: '#818cf8', width: 2, dash: '2 4', opacity: 0.55 },
        ]}
        markers={markers}
        ariaLabel="Sentinel health score over the last 30 days, projected 5 days forward"
      />

      <div className="legend-row">
        <div className="legend">
          <span className="swatch" style={{ background: 'var(--accent)' }} />
          <span>
            Sentinel health score <span style={{ color: '#5a6070' }}>· 0–100 smoothed · down = danger</span>
          </span>
        </div>
        <div className="warn-badge" data-testid="warn-badge">
          {showWarning
            ? `◀ ≈ ${lt.warningGainedDays} days of warning gained ▶`
            : '✓ all clear · no early warning needed'}
        </div>
      </div>
    </div>
  )
}
