/* Screen 2 · the statistical engine made visible. Plots the JAGGED raw daily
 * complaint rate against the SMOOTHED estimate + credible-interval band, so a
 * reviewer can see how dEWSentinel sees through the noise to fire early. The
 * y-axis is complaint-rate % (proportions ×100) and carries its OWN thresholds
 * (0.10% amber watch, 0.30% red cliff) — distinct from the hero's health lines. */
import { LineChart, type Point } from '@/components/charts/LineChart'
import type { Detail, Meta } from '@/lib/engine'

export function RawVsSmoothedChart({ detail, meta }: { detail: Detail; meta: Meta }) {
  const { days, today } = meta
  // detail series are PROPORTIONS — multiply by 100 for the % axis.
  const toPct = (arr: number[]): Point[] => arr.map((v, i) => [i, v * 100])
  const daysEarly = today - detail.crossWatchDay

  return (
    <div className="panel hero-grad" style={{ padding: '18px 20px' }}>
      <div className="zone-head">
        <div>
          <div className="zone-title" style={{ fontSize: '14.5px' }}>
            Raw vs smoothed complaint rate
          </div>
          <div className="zone-sub">How the engine sees through the noise to fire early.</div>
        </div>
        <div className="zone-meta">Gmail · 30 days</div>
      </div>

      <LineChart
        width={700}
        height={290}
        xDomain={[0, days - 1]}
        yDomain={[0, 0.4]}
        pad={{ l: 86, r: 28, t: 20, b: 50 }}
        yTitle="Complaint rate"
        bands={[{ fromY: 0.3, toY: 0.4, color: 'rgba(239,68,68,.07)' }]}
        hlines={[
          { y: 0.3, color: '#ef4444', dash: '6 4', width: 1.3, opacity: 0.7, label: '0.30% cliff' },
          { y: 0.1, color: '#fbbf24', dash: '6 4', width: 1.3, opacity: 0.75, label: '0.10% watch line' },
        ]}
        vlines={[{ x: detail.crossWatchDay, color: '#818cf8', dash: '3 3', opacity: 0.5 }]}
        yTicks={[
          { value: 0.4, label: '0.40%' },
          { value: 0.3, label: '0.30%' },
          { value: 0.2, label: '0.20%' },
          { value: 0.1, label: '0.10%' },
          { value: 0, label: '0.00%' },
        ]}
        xTicks={[
          { value: 0, label: '30d ago' },
          { value: Math.floor((days - 1) / 2), label: '15d ago', anchor: 'middle' },
          { value: today, label: 'today', anchor: 'end' },
        ]}
        ciBand={{
          upper: toPct(detail.ciUpperSeries),
          lower: toPct(detail.ciLowerSeries),
          color: '#818cf8',
          opacity: 0.13,
        }}
        series={[
          { points: toPct(detail.rawSeries), color: '#ef4444', width: 1.4, opacity: 0.55 },
          { points: toPct(detail.smoothedSeries), color: '#818cf8', width: 3 },
        ]}
        markers={[
          {
            x: detail.crossWatchDay,
            y: detail.smoothedSeries[detail.crossWatchDay] * 100,
            color: '#818cf8',
            r: 6,
          },
        ]}
        ariaLabel="Raw vs smoothed complaint rate"
      />

      <div className="callout">
        <div className="inner">
          ▲ alert fired here — {daysEarly} days before the cliff &amp; trustworthy
        </div>
      </div>

      <div className="chart-legend">
        <div className="item">
          <span className="sw" style={{ background: 'var(--red)', opacity: 0.6 }} />
          Raw daily complaint rate <span style={{ color: '#5a6070' }}>· noisy</span>
        </div>
        <div className="item">
          <span className="sw" style={{ background: 'var(--accent)' }} />
          Smoothed estimate <span style={{ color: '#5a6070' }}>· + confidence band</span>
        </div>
      </div>
    </div>
  )
}
