/* ZONE B — Per-ESP health cards (Slice 5). Two equal cards (Gmail, Outlook) in a
 * 1fr 1fr grid, each reading one EspCard from the view-model. All the per-card
 * rendering lives in EspCard.tsx; this is just the layout wrapper. */
import type { ViewModel } from '@/lib/engine'
import { EspCard } from './EspCard'

export function EspCards({ esp }: { esp: ViewModel['esp'] }) {
  return (
    <div className="esp-grid" data-testid="zone-esp">
      <EspCard id="gmail" name="Gmail · Google" dotColor="var(--gmail)" card={esp.gmail} />
      <EspCard id="outlook" name="Outlook · Microsoft" dotColor="var(--outlook)" card={esp.outlook} />
    </div>
  )
}
