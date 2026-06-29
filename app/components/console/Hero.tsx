/* ZONE A — Hero lead-time view (the money shot). STUB — implemented in Slice 4.
 *
 * CONTRACT (do not change the signature; page.tsx depends on it):
 *   Hero({ leadTime, meta })  reads only vm.leadTime + vm.meta.
 * See HANDOFF "Zone A" + ENGINE_SPEC §0.1, §9 "Hero health chart wiring". */
import type { LeadTime, Meta } from '@/lib/engine'

export function Hero({ leadTime, meta }: { leadTime: LeadTime; meta: Meta }) {
  void meta
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
      <div className="zone-sub">[Hero chart — Slice 4] warning gained ≈ {leadTime.warningGainedDays} days</div>
    </div>
  )
}
