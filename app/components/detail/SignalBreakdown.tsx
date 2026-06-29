/* Screen 2 · right rail. The weighted inputs that blend into the single health
 * score. Each bar shows how much RISK a signal contributes (fill = 100 −
 * subscore), and leading signals (which move before complaints) are tagged and
 * coloured accent — dEWSentinel's edge — vs grey for lagging confirmers. */
import type { Signal } from '@/lib/engine'

/** Sub-score → value colour: ≥70 calm, ≥40 amber watch, else red. */
function subColor(subscore: number): string {
  return subscore >= 70 ? '#d8dbe3' : subscore >= 40 ? '#fbbf24' : '#f87171'
}

export function SignalBreakdown({ signals }: { signals: Signal[] }) {
  return (
    <>
      <div className="sb-title">Signal breakdown</div>
      <div className="sb-sub">weighted inputs feeding the score</div>
      <div className="sb-legend">
        <div className="item">
          <span className="sw" style={{ background: 'var(--accent)' }} />
          leading <span style={{ color: '#5a6070' }}>· dEWSentinel&apos;s edge</span>
        </div>
        <div className="item">
          <span className="sw" style={{ background: '#5a6070' }} />
          lagging
        </div>
      </div>
      <div className="sb-list">
        {signals.map((s, i) => {
          const leading = s.kind === 'leading'
          // bar shows how MUCH risk this signal contributes
          const fillPct = Math.round(100 - s.subscore)
          return (
            <div className="sig" key={i}>
              <div className="top">
                <div className="nm">
                  {s.name}
                  {leading && <span className="ld">LEADING</span>}
                </div>
                <div className="mono vv" style={{ color: subColor(s.subscore) }}>
                  {s.value}
                </div>
              </div>
              <div className="barwrap">
                <div className="bar">
                  <div
                    className="f"
                    style={{ width: `${fillPct}%`, background: leading ? '#818cf8' : '#5a6070' }}
                  />
                </div>
                <div className="mono w">w {Math.round(s.weight * 100)}%</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
