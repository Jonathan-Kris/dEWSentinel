/* ============================================================================
 * dEWSentinel — ViewModel contract (ENGINE_SPEC §8).
 * THE SEAM. The single meeting point between the engine (pure logic) and the
 * UI (pure render). Every displayed number is derived into this object; nothing
 * in the UI is hardcoded. The current model is HEALTH (0–100, down = danger) —
 * there is no "risk" number anywhere (CONTEXT.md).
 * ========================================================================== */

export type Scenario = 'critical' | 'healthy'
export type Esp = 'gmail' | 'outlook'

/** Per-ESP health tier (ENGINE_SPEC §5.4). */
export type Tier = 'healthy' | 'watch' | 'warn' | 'critical'

/** Severity level for global status + alerts. */
export type Level = 'red' | 'amber' | 'green'

/** Failover state-machine stage (ENGINE_SPEC §5.6). */
export type Stage = 'Healthy' | 'Watch' | 'Throttle' | 'Failover' | 'Cooldown'

/** A leading signal moves before complaints; a lagging one confirms after. */
export type SignalKind = 'leading' | 'lagging'

export interface Meta {
  account: string
  domainCount: number
  lastSyncedMin: number
  scenario: Scenario
  seed: number
  days: number
  /** Index of "now" in every series (default days − 1). */
  today: number
}

export interface GlobalStatus {
  level: Level
  text: string
}

/**
 * The hero block. A single 0–100 HEALTH line that FALLS into danger, shown on
 * the same scale as the per-ESP gauges (ENGINE_SPEC §0.1, §5.8).
 */
export interface LeadTime {
  /** Hero indigo line, observed days 0..today; 0–100, DOWN = danger (= gmail health). */
  healthSeries: number[]
  /** Projected health for the projDays after today (dashed continuation). */
  healthProjSeries: number[]
  /** Forward-projection length (default 5). */
  projDays: number
  /** Lagging proxy per day (flat ≈94–97 green) — drives the strip sparkline, NOT a hero line. */
  dashboardSeries: number[]
  /** dashboardSeries[today] — the strip's big number. */
  dashboardScore: number
  /** Amber watch line on the health axis (80) = HEALTHY→WATCH boundary. */
  watchHealth: number
  /** Red cliff line on the health axis (40) = WATCH→DANGER boundary. */
  dangerHealth: number
  /** Sentinel warned (first day health < watchHealth). */
  crossWatchDay: number
  /** Lagging tools react (pinned to today when the proxy never dips in-window). */
  dashDropDay: number
  /** Computed (= dashDropDay − crossWatchDay), never hardcoded. */
  warningGainedDays: number
}

export interface EspCard {
  score: number
  tier: Tier
  ringColor: string
  /** Smoothed complaint rate, e.g. "0.21%". */
  smoothedRatePct: string
  /** 90% credible-interval upper edge, e.g. "0.27%". */
  ciUpperPct: string
  /** Position between 0.10% and 0.30% for the inline bar (0..1). */
  rateBarPos: number
  /** "→ crosses 0.30% cliff in ~5 days" | "stable". */
  projection: string
  /** Rounded daysToThreshold when a cliff is projected, else null. */
  daysToCliff: number | null
  /** Last 14 smoothed means. */
  spark: number[]
}

export interface Alert {
  severity: Level
  ts: string
  headline: string
  action: string | null
}

export interface StandbyDomain {
  domain: string
  gmailHealth: number
  outlookHealth: number
}

export interface Failover {
  stages: Stage[]
  current: { domain: string; esp: Esp; stage: Stage }
  standby: StandbyDomain[]
  routingAction: string | null
}

export interface DomainRow {
  domain: string
  gmail: number
  outlook: number
  state: Stage
  gmailSplit: number
  outlookSplit: number
  lastEvent: string
}

export interface Signal {
  name: string
  value: string
  weight: number
  kind: SignalKind
  /** 0–100 sub-score (100 = healthy) feeding the blended score. */
  subscore: number
}

export interface Detail {
  /** Raw daily complaint % as proportions (jagged). */
  rawSeries: number[]
  /** Smoothed mean as proportions. */
  smoothedSeries: number[]
  ciUpperSeries: number[]
  ciLowerSeries: number[]
  /** Marker: first day the smoothed series crosses the 0.10% watch line. */
  crossWatchDay: number
  signals: Signal[]
  recommendedAction: string
}

export interface ViewModel {
  meta: Meta
  globalStatus: GlobalStatus
  leadTime: LeadTime
  esp: { gmail: EspCard; outlook: EspCard }
  alerts: Alert[]
  failover: Failover
  domains: DomainRow[]
  detail: Detail
}

export interface EngineOptions {
  scenario?: Scenario
  seed?: number
  days?: number
  today?: number
}
