/* ZONE E — Domains table + navigation.
 *
 * CONTRACT: DomainsTable({ domains, focalDomain, onSelectDomain }).
 * Clicking the focal (interactive) row calls onSelectDomain(domain) → opens
 * Screen 2. See HANDOFF "Zone E". Faithful port of mockup/render.js `renderDomains`
 * (+ `scoreColor` / `STATE_COLOR`): same DOM shape, same colours, all data read
 * from the ViewModel. */
import type { KeyboardEvent } from 'react'
import type { DomainRow, Stage } from '@/lib/engine'

/** Health score → colour (mockup/render.js `scoreColor`): down = danger. */
function scoreColor(s: number): string {
  return s >= 80 ? '#4ade80' : s >= 60 ? '#fbbf24' : '#f87171'
}

/** Failover-stage → state-tag colours (mockup/render.js `STATE_COLOR`). */
const STATE_COLOR: Record<Stage, { fill: string; text: string }> = {
  Healthy: { fill: 'rgba(34,197,94,.13)', text: '#4ade80' },
  Watch: { fill: 'rgba(245,158,11,.13)', text: '#fbbf24' },
  Throttle: { fill: 'rgba(245,158,11,.16)', text: '#fbbf24' },
  Failover: { fill: 'rgba(239,68,68,.13)', text: '#fca5a5' },
  Cooldown: { fill: 'rgba(129,140,248,.13)', text: '#a5b4fc' },
}

interface DomainsTableProps {
  domains: DomainRow[]
  focalDomain: string
  onSelectDomain: (domain: string) => void
}

export function DomainsTable({ domains, focalDomain, onSelectDomain }: DomainsTableProps) {
  return (
    <div className="panel table" style={{ padding: 0, overflow: 'hidden' }} data-testid="zone-domains">
      <div className="table-head">
        <div className="zone-title" style={{ fontSize: 13.5 }}>
          Domains <span style={{ color: '#6a7080', fontWeight: 400 }}>· 84</span>
        </div>
        <div style={{ fontSize: 11, color: '#6a7080' }}>sorted by risk ▾</div>
      </div>
      <div className="thead mono">
        <div>Domain</div>
        <div>ESP split</div>
        <div>Gmail</div>
        <div>Outlook</div>
        <div>State</div>
        <div>Last event</div>
      </div>
      <div id="domains-tbody">
        {domains.map((d) => {
          const isFocal = d.domain === focalDomain
          return (
          <div
            key={d.domain}
            className={`trow${isFocal ? ' navrow' : ''}`}
            {...(isFocal
              ? {
                  role: 'button',
                  tabIndex: 0,
                  title: 'Open domain detail',
                  'aria-label': `Open ${d.domain} detail`,
                  onClick: () => onSelectDomain(d.domain),
                  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onSelectDomain(d.domain)
                    }
                  },
                }
              : {})}
          >
            <div className="mono" style={{ color: '#e7e9f0' }}>
              {d.domain}
              {isFocal && <span className="chev">›</span>}
            </div>
            <div className="split">
              <div style={{ flex: d.gmailSplit, background: '#ea4335' }} />
              <div style={{ flex: d.outlookSplit, background: '#0078d4' }} />
              <div style={{ flex: 1, background: '#3a4050' }} />
            </div>
            <div className="mono" style={{ fontWeight: 600, color: scoreColor(d.gmail) }}>{d.gmail}</div>
            <div className="mono" style={{ color: scoreColor(d.outlook) }}>{d.outlook}</div>
            <div>
              <span
                className="state-tag"
                style={{ background: STATE_COLOR[d.state].fill, color: STATE_COLOR[d.state].text }}
              >
                {d.state}
              </span>
            </div>
            <div className="mono" style={{ color: '#8a90a0', fontSize: 11 }}>{d.lastEvent}</div>
          </div>
          )
        })}
      </div>
    </div>
  )
}
