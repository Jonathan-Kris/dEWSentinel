/* ZONE B — Per-ESP health cards. STUB — implemented in Slice 5.
 *
 * CONTRACT: EspCards({ esp }) reads vm.esp.gmail + vm.esp.outlook.
 * The agent may split into an internal EspCard.tsx. Use the shared GaugeRing +
 * Sparkline from @/components/charts. See HANDOFF "Zone B" + ENGINE_SPEC §10.4. */
import type { ViewModel } from '@/lib/engine'

export function EspCards({ esp }: { esp: ViewModel['esp'] }) {
  return (
    <div className="esp-grid" data-testid="zone-esp">
      <div className="panel esp">
        <div className="esp-name">
          <span className="chip" style={{ background: 'var(--gmail)' }} />
          Gmail · Google
        </div>
        <div className="zone-sub mono">[Slice 5] {esp.gmail.score}/100 · {esp.gmail.tier}</div>
      </div>
      <div className="panel esp">
        <div className="esp-name">
          <span className="chip" style={{ background: 'var(--outlook)' }} />
          Outlook · Microsoft
        </div>
        <div className="zone-sub mono">[Slice 5] {esp.outlook.score}/100 · {esp.outlook.tier}</div>
      </div>
    </div>
  )
}
