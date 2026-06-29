/* §5.4 Per-ESP health score + §5.5 lagging "today's dashboard" proxy.
 * Operates on generated records and the per-day smoothed series. */

import type { DayRecord } from './generator'
import type { SmoothedPoint } from './smoothing'
import { betaBinomialSmooth } from './smoothing'
import { leastSquaresSlope, daysToThreshold } from './slope'
import { CLIFF, SLOPE_WINDOW, TIER_SCORE, WINDOW, clamp, normalize } from './constants'

export interface SubScores {
  complaint: number
  slope: number
  deferral: number
  reply: number
  tier: number
  hardBounce: number
  seed: number
}

export interface ScorePoint {
  score: number
  sub: SubScores
  weights: SubScores
  mean: number
  ciUpper: number
  ciLower: number
  slope: number
  daysToThreshold: number
  deferralRate: number
  hardBounceRate: number
  replyDrop: number
  tier: string
  seedPlacementPct: number
}

/** Smoothed complaint series (one betaBinomial per day, trailing window). */
export function smoothedSeries(records: DayRecord[]): SmoothedPoint[] {
  return records.map((_, d) => {
    const lo = Math.max(0, d - (WINDOW - 1))
    const ws = records.slice(lo, d + 1).map((r) => r.sends)
    const wc = records.slice(lo, d + 1).map((r) => r.complaints)
    return betaBinomialSmooth(ws, wc)
  })
}

/** Trailing-window rate of a per-record field (e.g. deferrals/sends). */
function trailingRate(records: DayRecord[], d: number, field: 'deferrals' | 'hardBounces'): number {
  const lo = Math.max(0, d - (WINDOW - 1))
  let num = 0
  let den = 0
  for (let i = lo; i <= d; i++) {
    num += records[i][field]
    den += records[i].sends
  }
  return den ? num / den : 0
}

/** Reply-rate drop vs the first-week baseline, evaluated at day d (trailing). */
function replyDrop(records: DayRecord[], d: number): number {
  const baseN = Math.min(WINDOW, records.length)
  let bnum = 0
  let bden = 0
  for (let i = 0; i < baseN; i++) {
    bnum += records[i].replies
    bden += records[i].sends
  }
  const baseRate = bden ? bnum / bden : 0
  const lo = Math.max(0, d - (WINDOW - 1))
  let cnum = 0
  let cden = 0
  for (let i = lo; i <= d; i++) {
    cnum += records[i].replies
    cden += records[i].sends
  }
  const curRate = cden ? cnum / cden : 0
  if (baseRate <= 0) return 0
  return clamp((baseRate - curRate) / baseRate, 0, 1) // fraction dropped
}

/** §5.4 per-ESP health score at day d, with full sub-score breakdown. */
export function scoreAt(records: DayRecord[], smoothed: SmoothedPoint[], d: number): ScorePoint {
  const sm = smoothed[d]
  // slope on the SMOOTHED means over the trailing slope-window
  const lo = Math.max(0, d - (SLOPE_WINDOW - 1))
  const means = smoothed.slice(lo, d + 1).map((s) => s.mean)
  const slope = means.length >= 2 ? leastSquaresSlope(means) : 0
  const dtt = daysToThreshold(sm.mean, slope, CLIFF)

  const defRate = trailingRate(records, d, 'deferrals')
  const hbRate = trailingRate(records, d, 'hardBounces')
  const rDrop = replyDrop(records, d)
  const tier = records[d].postmasterTier
  const seed = records[d].seedPlacementPct

  const sub: SubScores = {
    complaint: normalize(sm.ciUpper, 0.0005, 0.003), // 0.05% → 0.30%
    slope: normalize(isFinite(dtt) ? clamp(dtt, 3, 30) : 30, 30, 3),
    deferral: normalize(defRate, 0.0, 0.08), // 0% → 8%
    reply: normalize(rDrop, 0.0, 0.4), // 0 → 40% drop
    tier: TIER_SCORE[tier],
    hardBounce: normalize(hbRate, 0.0, 0.05), // 0% → 5%
    seed: normalize(seed, 100, 40), // 100% → 40%
  }
  const W: SubScores = {
    complaint: 0.28,
    slope: 0.22,
    deferral: 0.16,
    reply: 0.12,
    tier: 0.1,
    hardBounce: 0.06,
    seed: 0.06,
  }
  const score = Math.round(
    W.complaint * sub.complaint +
      W.slope * sub.slope +
      W.deferral * sub.deferral +
      W.reply * sub.reply +
      W.tier * sub.tier +
      W.hardBounce * sub.hardBounce +
      W.seed * sub.seed,
  )
  return {
    score,
    sub,
    weights: W,
    mean: sm.mean,
    ciUpper: sm.ciUpper,
    ciLower: sm.ciLower,
    slope,
    daysToThreshold: dtt,
    deferralRate: defRate,
    hardBounceRate: hbRate,
    replyDrop: rDrop,
    tier,
    seedPlacementPct: seed,
  }
}

/** §5.5 lagging-only "today's dashboard" proxy score at day d. */
export function dashboardAt(records: DayRecord[], d: number): number {
  const warmup = records[d].warmupPlacementPct
  const postSub = TIER_SCORE[records[d].postmasterTier]
  return Math.round(0.6 * normalize(warmup, 100, 60) + 0.4 * postSub)
}
