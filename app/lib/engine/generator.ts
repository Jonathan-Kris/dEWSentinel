/* §4 Synthetic generator — emits per-day, per-ESP records for one focal domain.
 * The SHAPE of the timeline is mandatory (§4 table); noise levels are tuned so
 * the §10 acceptance numbers fall out naturally rather than being hardcoded.
 *
 * Determinism note: the RNG draw sequence here is load-bearing. Same seed ⇒
 * identical records ⇒ identical ViewModel ⇒ identical render. */

import type { Esp, Scenario } from './viewmodel'
import { makeRng, poisson } from './rng'
import { lerp } from './constants'

export interface DayRecord {
  day: number
  date: string
  esp: Esp
  sends: number
  complaints: number
  hardBounces: number
  deferrals: number
  replies: number
  postmasterTier: 'high' | 'medium' | 'low' | 'bad'
  seedPlacementPct: number
  warmupPlacementPct: number
}

export interface GeneratedData {
  gmail: DayRecord[]
  outlook: DayRecord[]
}

// Underlying ("true") daily complaint rate that the noisy draws sample from.
function trueComplaintRate(scenario: Scenario, esp: Esp, day: number, days: number): number {
  // Outlook is always stable/green; Gmail-healthy is also stable.
  if (esp === 'outlook' || scenario === 'healthy') {
    return 0.00022 // ~0.022% — comfortably below the 0.10% watch band.
  }
  // Gmail · critical — the four-phase decay story (§4 table). Complaints hold
  // near baseline while LEADING signals move first; the complaint rate only
  // ramps hard in the final ~13 days, so the smoothed line sits ~0.20% "today".
  if (day <= 10) return 0.0004 // Stable
  if (day <= 16) return lerp(0.0004, 0.0006, (day - 10) / 6) // Early drift (inch up)
  return lerp(0.0006, 0.0046, (day - 16) / (days - 1 - 16)) // Acceleration → cliff
}

// Leading reply-rate multiplier (engagement sags FIRST, before complaints).
function replyFactor(scenario: Scenario, esp: Esp, day: number): number {
  if (esp === 'outlook' || scenario === 'healthy') return 1.0
  if (day <= 8) return 1.0
  return lerp(1.0, 0.6, (day - 8) / 11) // ~ −40% by ~day 19, then flat
}

// Leading deferral (4xx) rate — creeps up early, plateaus by ~day 19.
function deferralRate(scenario: Scenario, esp: Esp, day: number): number {
  if (esp === 'outlook' || scenario === 'healthy') return 0.008
  if (day <= 8) return 0.009
  return lerp(0.009, 0.042, (day - 8) / 11) // ~4% by ~day 19, then flat
}

// Leading seed-list inbox placement (drops during acceleration).
function seedPlacement(scenario: Scenario, esp: Esp, day: number): number {
  if (esp === 'outlook' || scenario === 'healthy') return 97
  if (day <= 17) return 97
  return lerp(97, 70, (day - 17) / 12) // ~71% by today
}

// LAGGING warmup placement — "what the old dashboard sees". STAYS GREEN across
// the whole visible window in BOTH scenarios (ENGINE_SPEC §5.5): its decline is
// implied only AFTER "today". This is what keeps the green strip reassuring
// while the health line falls into danger.
function warmupPlacement(_scenario: Scenario, _esp: Esp, _day: number): number {
  return 97
}

// LAGGING postmaster tier — also holds "high" across the visible window; it only
// degrades after "today", off-chart.
function postmasterTier(_scenario: Scenario, _esp: Esp, _day: number): 'high' {
  return 'high'
}

export function generate(scenario: Scenario, seed: number, days: number): GeneratedData {
  const rng = makeRng(seed)
  const data: GeneratedData = { gmail: [], outlook: [] }
  const base = new Date(Date.UTC(2026, 5, 1)) // fixed epoch → deterministic dates
  ;(['gmail', 'outlook'] as const).forEach((esp) => {
    // de-correlate the two ESP streams a little
    for (let i = 0; i < (esp === 'outlook' ? 13 : 7); i++) rng()
    for (let day = 0; day < days; day++) {
      const sends = Math.round(300 + (rng() - 0.5) * 150) // ~225–375/day
      const cr = trueComplaintRate(scenario, esp, day, days)
      const complaints = poisson(rng, cr * sends)
      const hardBounces = poisson(rng, 0.006 * sends)
      const deferrals = Math.round(deferralRate(scenario, esp, day) * sends + (rng() - 0.5) * 4)
      const replyBase = 0.05 * sends * replyFactor(scenario, esp, day)
      const replies = Math.max(0, Math.round(replyBase + (rng() - 0.5) * 6))
      const date = new Date(base.getTime() + day * 86400000).toISOString()
      data[esp].push({
        day,
        date,
        esp,
        sends,
        complaints,
        hardBounces,
        deferrals: Math.max(0, deferrals),
        replies,
        postmasterTier: postmasterTier(scenario, esp, day),
        seedPlacementPct: Math.round(seedPlacement(scenario, esp, day) + (rng() - 0.5) * 3),
        warmupPlacementPct: Math.round(warmupPlacement(scenario, esp, day) + (rng() - 0.5) * 2),
      })
    }
  })
  return data
}
