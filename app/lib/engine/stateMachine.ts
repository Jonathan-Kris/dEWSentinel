/* §5.6 Failover state machine. Derives a per-ESP stage from score + projection.
 *
 *   Failover : score < 40  OR daysToThreshold ≤ 3  OR ciUpper ≥ 0.30% cliff
 *   Throttle : score < 60  OR daysToThreshold ≤ 7
 *   Watch    : score < 80  OR ciUpper ≥ 0.10% watch
 *   Healthy  : otherwise (score ≥ 80) */

import type { ScorePoint } from './scoring'
import type { Stage } from './viewmodel'
import { CLIFF, WATCH } from './constants'

export function failoverState(scoreObj: ScorePoint): Stage {
  const s = scoreObj.score
  const ciU = scoreObj.ciUpper
  const dtt = scoreObj.daysToThreshold
  if (s < 40 || dtt <= 3 || ciU >= CLIFF) return 'Failover'
  if (s < 60 || dtt <= 7) return 'Throttle'
  if (s < 80 || ciU >= WATCH) return 'Watch'
  return 'Healthy'
}
