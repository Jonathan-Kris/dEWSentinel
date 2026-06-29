/* ZONE E — Domains table + navigation. STUB — implemented in Slice 8.
 *
 * CONTRACT: DomainsTable({ domains, focalDomain, onSelectDomain }).
 * Clicking the focal (interactive) row calls onSelectDomain(domain) → opens
 * Screen 2. See HANDOFF "Zone E". */
import type { DomainRow } from '@/lib/engine'

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
        {domains.map((d) => (
          <button
            key={d.domain}
            type="button"
            className={`trow${d.domain === focalDomain ? ' navrow' : ''}`}
            style={{ all: 'unset', cursor: d.domain === focalDomain ? 'pointer' : 'default' }}
            onClick={() => d.domain === focalDomain && onSelectDomain(d.domain)}
          >
            <span className="mono">{d.domain}</span> [Slice 8]
          </button>
        ))}
      </div>
    </div>
  )
}
