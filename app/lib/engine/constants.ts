/* Shared engine constants + small numeric helpers. Internal to lib/engine. */

import type { Tier } from './viewmodel'

export const TIER_SCORE: Record<string, number> = { high: 100, medium: 55, low: 20, bad: 0 }

export const CLIFF = 0.003 // 0.30% complaint rate — the hard limit
export const WATCH = 0.001 // 0.10% complaint rate — "leaving healthy"
export const WINDOW = 9 // smoothing window W (tuned up from §5.2 default of 7)
export const SLOPE_WINDOW = 10 // trailing window for least-squares slope

export const WATCH_HEALTH = 80 // amber watch line on the hero health axis
export const DANGER_HEALTH = 40 // red cliff line on the hero health axis
export const PROJ_DAYS = 5 // days projected past "today" toward the floor

export const RING_COLOR: Record<Tier, string> = {
  healthy: '#22c55e',
  watch: '#f59e0b',
  warn: '#f59e0b',
  critical: '#ef4444',
}

export const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

/** Linear normalizer: value==at100 → 100, value==at0 → 0, clamped to [0,100]. */
export function normalize(value: number, at100: number, at0: number): number {
  if (at100 === at0) return 100
  return clamp(((value - at0) / (at100 - at0)) * 100, 0, 100)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1)
}

/** Format a proportion as a percent string, e.g. 0.0021 → "0.21%". */
export const pct = (p: number, dp?: number): string =>
  (p * 100).toFixed(dp == null ? 2 : dp) + '%'

export function tierOf(score: number): Tier {
  return score >= 80 ? 'healthy' : score >= 60 ? 'watch' : score >= 40 ? 'warn' : 'critical'
}
