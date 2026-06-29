/* ============================================================================
 * dEWSentinel — engine (deep module).
 * The ONLY thing this module exposes to the UI is runEngine(opts) → ViewModel
 * (plus the ViewModel types). Everything else — rng, smoothing, slope, scoring,
 * generator, state machine — is an implementation detail and stays hidden.
 *
 * Everything rendered in the UI is COMPUTED here from synthetic, seeded data;
 * nothing is hardcoded to satisfy the acceptance checks (ENGINE_SPEC §10) — the
 * generator parameters are tuned instead.
 * ========================================================================== */

import { makeRng } from './rng'
import { leastSquaresSlope } from './slope'
import { generate } from './generator'
import { dashboardAt, scoreAt, smoothedSeries, type ScorePoint } from './scoring'
import { failoverState } from './stateMachine'
import type { SmoothedPoint } from './smoothing'
import {
  CLIFF,
  DANGER_HEALTH,
  PROJ_DAYS,
  RING_COLOR,
  SLOPE_WINDOW,
  WATCH,
  WATCH_HEALTH,
  clamp,
  pct,
  tierOf,
} from './constants'
import type {
  Alert,
  DomainRow,
  EngineOptions,
  EspCard,
  GlobalStatus,
  Signal,
  Stage,
  StandbyDomain,
  ViewModel,
} from './viewmodel'

export type {
  Alert,
  Detail,
  DomainRow,
  EngineOptions,
  Esp,
  EspCard,
  Failover,
  GlobalStatus,
  LeadTime,
  Level,
  Meta,
  Scenario,
  Signal,
  SignalKind,
  Stage,
  StandbyDomain,
  Tier,
  ViewModel,
} from './viewmodel'

const FOCAL_DOMAIN = 'acme-outreach-03.com'

function buildCard(scoreObj: ScorePoint, sm: SmoothedPoint[]): EspCard {
  const tier = tierOf(scoreObj.score)
  const dtt = scoreObj.daysToThreshold
  const showCliff = isFinite(dtt) && dtt > 0 && dtt <= 45 && scoreObj.slope > 0
  const spark = sm.slice(Math.max(0, sm.length - 14)).map((s) => s.mean)
  return {
    score: scoreObj.score,
    tier,
    ringColor: RING_COLOR[tier],
    smoothedRatePct: pct(scoreObj.mean),
    ciUpperPct: pct(scoreObj.ciUpper),
    rateBarPos: clamp((scoreObj.mean - WATCH) / (CLIFF - WATCH), 0, 1),
    projection: showCliff
      ? '→ crosses 0.30% cliff in ~' + Math.max(1, Math.round(dtt)) + ' days'
      : 'stable',
    daysToCliff: showCliff ? Math.round(dtt) : null,
    spark,
  }
}

export function runEngine(opts: EngineOptions = {}): ViewModel {
  const scenario = opts.scenario || 'critical'
  const seed = opts.seed == null ? 42 : opts.seed >>> 0
  const days = opts.days || 30
  const today = opts.today == null ? days - 1 : opts.today

  const data = generate(scenario, seed, days)
  const smG = smoothedSeries(data.gmail)
  const smO = smoothedSeries(data.outlook)

  // per-day score series (health) for both ESPs
  const gmailScores = data.gmail.map((_, d) => scoreAt(data.gmail, smG, d))
  const outlookScores = data.outlook.map((_, d) => scoreAt(data.outlook, smO, d))
  const dashSeries = data.gmail.map((_, d) => dashboardAt(data.gmail, d))

  const gToday = gmailScores[today]
  const oToday = outlookScores[today]

  /* ---- lead-time (§5.8): the hero is a 0–100 HEALTH score that FALLS into
          danger (down = bad), on the SAME scale as the per-ESP gauges so the
          hero and the cards never disagree. Sentinel "warns" when health first
          drops below WATCH. The lagging dashboard proxy stays green across the
          visible window — it would only react AFTER today — so the gap between
          the two is the warning we gained. ---- */
  const healthSeries = gmailScores.map((s) => s.score)
  const projLo = Math.max(0, today - (SLOPE_WINDOW - 1))
  const healthSlope = leastSquaresSlope(healthSeries.slice(projLo, today + 1))
  const healthProjSeries: number[] = []
  for (let k = 1; k <= PROJ_DAYS; k++) {
    healthProjSeries.push(clamp(Math.round(healthSeries[today] + healthSlope * k), 0, 100))
  }

  let crossWatchDay = healthSeries.findIndex((v) => v < WATCH_HEALTH)
  let dashDropDay = dashSeries.findIndex((v) => v < 80)
  if (crossWatchDay < 0) crossWatchDay = today
  if (dashDropDay < 0) dashDropDay = today // proxy never dips in-window → pin to today
  const warningGainedDays = Math.max(0, dashDropDay - crossWatchDay)

  /* ---- ESP cards ---- */
  const esp = { gmail: buildCard(gToday, smG), outlook: buildCard(oToday, smO) }

  /* ---- failover ---- */
  const gState = failoverState(gToday)
  const oState = failoverState(oToday)
  const standby: StandbyDomain[] = [
    { domain: 'standby-gmail-01.com', gmailHealth: 96 + Math.round(makeRng(seed + 1)() * 3), outlookHealth: 95 },
    { domain: 'standby-gmail-02.com', gmailHealth: 94 + Math.round(makeRng(seed + 2)() * 4), outlookHealth: 97 },
    { domain: 'standby-gmail-03.com', gmailHealth: 95 + Math.round(makeRng(seed + 3)() * 3), outlookHealth: 96 },
  ]
  const failover = {
    stages: ['Healthy', 'Watch', 'Throttle', 'Failover', 'Cooldown'] as Stage[],
    current: { domain: FOCAL_DOMAIN, esp: 'gmail' as const, stage: gState },
    standby,
    routingAction:
      gState === 'Failover'
        ? 'Route Gmail traffic → ' + standby[1].domain + ' (Gmail health ' + standby[1].gmailHealth + ')'
        : null,
  }

  /* ---- alerts (§5.7) ---- */
  const alerts: Alert[] = []
  if (scenario === 'critical') {
    if (gState === 'Failover' || esp.gmail.daysToCliff != null) {
      alerts.push({
        severity: 'red',
        ts: '11:42 · 6 min ago',
        headline:
          'Gmail complaint rate on ' +
          FOCAL_DOMAIN +
          ' climbing — projected to cross 0.30% in ~' +
          (esp.gmail.daysToCliff || 5) +
          ' days.',
        action: 'Throttle + fail over',
      })
    }
    if (gToday.replyDrop >= 0.15) {
      alerts.push({
        severity: 'amber',
        ts: '10:08 · 1 hr ago',
        headline:
          'Reply rate on domain-07 down ' +
          Math.round(gToday.replyDrop * 100) +
          '% over 7 days while complaints flat — early engagement decay.',
        action: 'Review list & content',
      })
    }
    alerts.push({
      severity: 'green',
      ts: '08:30 · 3 hrs ago',
      headline: 'domain-11 cleared — 7 consecutive clean days. Returned to active rotation.',
      action: null,
    })
    alerts.push({
      severity: 'green',
      ts: 'yesterday',
      headline: 'standby-gmail-02 finished warm-up — added to hot-standby pool.',
      action: null,
    })
  } else {
    alerts.push({
      severity: 'green',
      ts: '09:12 · 20 min ago',
      headline: 'All monitored domains within healthy complaint thresholds.',
      action: null,
    })
    alerts.push({
      severity: 'green',
      ts: 'today',
      headline: FOCAL_DOMAIN + ' steady — Gmail & Outlook placement nominal.',
      action: null,
    })
  }

  /* ---- global status ---- */
  const anyCritical = gState === 'Failover' || oState === 'Failover'
  const globalStatus: GlobalStatus = anyCritical
    ? { level: 'red', text: '2 domains critical' }
    : { level: 'green', text: 'all domains healthy' }

  /* ---- domains table ---- */
  const domains: DomainRow[] = [
    {
      domain: FOCAL_DOMAIN,
      gmail: gToday.score,
      outlook: oToday.score,
      state: gState,
      gmailSplit: 6,
      outlookSplit: 3,
      lastEvent: scenario === 'critical' ? 'throttled · 6m ago' : 'nominal · 5m ago',
    },
  ]
  if (scenario === 'critical') {
    domains.push({
      domain: 'domain-07.com',
      gmail: 61,
      outlook: 88,
      state: 'Watch',
      gmailSplit: 5,
      outlookSplit: 4,
      lastEvent: 'reply −31% · 1h ago',
    })
    domains.push({
      domain: 'domain-11.com',
      gmail: 91,
      outlook: 94,
      state: 'Healthy',
      gmailSplit: 7,
      outlookSplit: 2,
      lastEvent: 'cleared · 2h ago',
    })
  } else {
    domains.push({
      domain: 'domain-07.com',
      gmail: 90,
      outlook: 92,
      state: 'Healthy',
      gmailSplit: 5,
      outlookSplit: 4,
      lastEvent: 'cleared · 2h ago',
    })
    domains.push({
      domain: 'domain-11.com',
      gmail: 93,
      outlook: 95,
      state: 'Healthy',
      gmailSplit: 7,
      outlookSplit: 2,
      lastEvent: 'nominal · 3h ago',
    })
  }

  /* ---- detail (Screen 2, focal gmail) ---- */
  const rawSeries = data.gmail.map((r) => (r.sends ? r.complaints / r.sends : 0))
  const smoothed = smG.map((s) => s.mean)
  const ciUpperSeries = smG.map((s) => s.ciUpper)
  const ciLowerSeries = smG.map((s) => s.ciLower)
  let detailCross = smoothed.findIndex((m) => m >= WATCH)
  if (detailCross < 0) detailCross = today

  const signals: Signal[] = [
    {
      name: 'Smoothed complaint rate',
      kind: 'lagging',
      weight: gToday.weights.complaint,
      subscore: gToday.sub.complaint,
      value: pct(gToday.mean),
    },
    {
      name: 'Complaint-rate slope',
      kind: 'leading',
      weight: gToday.weights.slope,
      subscore: gToday.sub.slope,
      value: (gToday.slope >= 0 ? '+' : '') + (gToday.slope * 100).toFixed(3) + '%/d',
    },
    {
      name: 'Reply trend (7d)',
      kind: 'leading',
      weight: gToday.weights.reply,
      subscore: gToday.sub.reply,
      value: '−' + Math.round(gToday.replyDrop * 100) + '%',
    },
    {
      name: 'Soft-bounce / deferral rate',
      kind: 'leading',
      weight: gToday.weights.deferral,
      subscore: gToday.sub.deferral,
      value: (gToday.deferralRate * 100).toFixed(1) + '%',
    },
    {
      name: 'Postmaster reputation tier',
      kind: 'lagging',
      weight: gToday.weights.tier,
      subscore: gToday.sub.tier,
      value: gToday.tier.charAt(0).toUpperCase() + gToday.tier.slice(1),
    },
    {
      name: 'Hard bounces',
      kind: 'lagging',
      weight: gToday.weights.hardBounce,
      subscore: gToday.sub.hardBounce,
      value: (gToday.hardBounceRate * 100).toFixed(1) + '%',
    },
    {
      name: 'Seed-list placement',
      kind: 'leading',
      weight: gToday.weights.seed,
      subscore: gToday.sub.seed,
      value: gToday.seedPlacementPct + '% inbox',
    },
  ]

  const recommendedAction =
    scenario === 'critical'
      ? 'Throttle Gmail sends to 20%, fail over to ' +
        standby[1].domain +
        ', hold in Cooldown until 7 consecutive clean days.'
      : 'No action required — maintain current rotation and warm-up cadence.'

  const detail = {
    rawSeries,
    smoothedSeries: smoothed,
    ciUpperSeries,
    ciLowerSeries,
    crossWatchDay: detailCross,
    signals,
    recommendedAction,
  }

  return {
    meta: { account: 'Acme Agency', domainCount: 84, lastSyncedMin: 4, scenario, seed, days, today },
    globalStatus,
    leadTime: {
      healthSeries,
      healthProjSeries,
      projDays: PROJ_DAYS,
      dashboardSeries: dashSeries,
      dashboardScore: dashSeries[today],
      watchHealth: WATCH_HEALTH,
      dangerHealth: DANGER_HEALTH,
      crossWatchDay,
      dashDropDay,
      warningGainedDays,
    },
    esp,
    alerts,
    failover,
    domains,
    detail,
  }
}
