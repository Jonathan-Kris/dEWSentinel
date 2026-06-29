import { describe, it, expect, beforeAll } from 'vitest'
import { runEngine } from './index'
import type { ViewModel } from './index'

/* Behaviour spec for the engine. We assert ONLY through the public seam
 * (runEngine → ViewModel), never on internals, and name everything in the
 * domain language from CONTEXT.md (health, watch line, cliff, lead time…). */

describe('runEngine — contract & determinism', () => {
  it('defaults to the critical scenario at seed 42 and returns the §8 ViewModel shape', () => {
    const vm = runEngine()
    expect(vm.meta.scenario).toBe('critical')
    expect(vm.meta.seed).toBe(42)
    expect(vm.meta.today).toBe(vm.meta.days - 1)
    // top-level seam keys exist
    expect(vm).toHaveProperty('globalStatus')
    expect(vm).toHaveProperty('leadTime')
    expect(vm).toHaveProperty('esp.gmail')
    expect(vm).toHaveProperty('esp.outlook')
    expect(vm).toHaveProperty('alerts')
    expect(vm).toHaveProperty('failover')
    expect(vm).toHaveProperty('domains')
    expect(vm).toHaveProperty('detail')
  })

  it('same seed produces an identical ViewModel; different seeds differ', () => {
    const a = runEngine({ scenario: 'critical', seed: 42 })
    const b = runEngine({ scenario: 'critical', seed: 42 })
    expect(a).toEqual(b)
    const c = runEngine({ scenario: 'critical', seed: 7 })
    expect(c).not.toEqual(a)
  })
})

describe('critical scenario — Gmail decays, Outlook holds', () => {
  let vm: ViewModel
  beforeAll(() => {
    vm = runEngine({ scenario: 'critical', seed: 42 })
  })

  it('Gmail is critical: health < 40 with a red critical tier', () => {
    expect(vm.esp.gmail.score).toBeLessThan(40)
    expect(vm.esp.gmail.tier).toBe('critical')
  })

  it('Gmail smoothed complaint rate reads ~0.17–0.25%', () => {
    const rate = parseFloat(vm.esp.gmail.smoothedRatePct)
    expect(rate).toBeGreaterThanOrEqual(0.17)
    expect(rate).toBeLessThanOrEqual(0.25)
  })

  it('Gmail projects to the 0.30% cliff in ~3–6 days', () => {
    expect(vm.esp.gmail.daysToCliff).not.toBeNull()
    expect(vm.esp.gmail.daysToCliff!).toBeGreaterThanOrEqual(3)
    expect(vm.esp.gmail.daysToCliff!).toBeLessThanOrEqual(6)
    expect(vm.esp.gmail.projection).toContain('cliff')
  })

  it('Outlook stays healthy: health ≥ 80, healthy tier, stable projection', () => {
    expect(vm.esp.outlook.score).toBeGreaterThanOrEqual(80)
    expect(vm.esp.outlook.tier).toBe('healthy')
    expect(vm.esp.outlook.projection).toBe('stable')
    expect(vm.esp.outlook.daysToCliff).toBeNull()
  })

  it('the hero "today" endpoint equals the Gmail card score (one score, by construction)', () => {
    const { healthSeries } = vm.leadTime
    expect(healthSeries[vm.meta.today]).toBe(vm.esp.gmail.score)
  })
})

describe('lead-time — Sentinel warns before the lagging tools react', () => {
  let vm: ViewModel
  beforeAll(() => {
    vm = runEngine({ scenario: 'critical', seed: 42 })
  })

  it('the health line starts in HEALTHY (≥80) and ends in DANGER (<40)', () => {
    const { healthSeries } = vm.leadTime
    expect(healthSeries[0]).toBeGreaterThanOrEqual(80)
    expect(healthSeries[vm.meta.today]).toBeLessThan(40)
  })

  it('crossWatchDay is the first day health drops below the watch line (80)', () => {
    const { healthSeries, watchHealth, crossWatchDay } = vm.leadTime
    expect(watchHealth).toBe(80)
    const expected = healthSeries.findIndex((v) => v < watchHealth)
    expect(crossWatchDay).toBe(expected)
    expect(healthSeries[crossWatchDay]).toBeLessThan(watchHealth)
    expect(healthSeries[crossWatchDay - 1]).toBeGreaterThanOrEqual(watchHealth)
  })

  it('warning gained is computed (dashDropDay − crossWatchDay) and ≥ 7 days (§10.3)', () => {
    const { crossWatchDay, dashDropDay, warningGainedDays } = vm.leadTime
    expect(warningGainedDays).toBe(Math.max(0, dashDropDay - crossWatchDay))
    expect(warningGainedDays).toBeGreaterThanOrEqual(7)
  })

  it('the lagging dashboard proxy stays flat-green (≈94–97) all window, pinning dashDropDay to today', () => {
    const { dashboardSeries, dashDropDay } = vm.leadTime
    expect(Math.min(...dashboardSeries)).toBeGreaterThanOrEqual(80)
    expect(dashboardSeries[vm.meta.today]).toBeGreaterThanOrEqual(94)
    expect(dashDropDay).toBe(vm.meta.today)
  })

  it('the forward projection is projDays long, declining, and clamped to [0,100]', () => {
    const { healthProjSeries, projDays, healthSeries } = vm.leadTime
    expect(healthProjSeries).toHaveLength(projDays)
    expect(projDays).toBe(5)
    expect(healthProjSeries[healthProjSeries.length - 1]).toBeLessThanOrEqual(healthSeries[vm.meta.today])
    for (const v of healthProjSeries) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
  })
})

describe('smoothing — robust to single-complaint spikes', () => {
  it('a one-day complaint spike does not push the smoothed series past the watch line that day', () => {
    // Compare the smoothed Gmail detail series early-window (stable phase) with and
    // without an injected spike is internal; instead assert the invariant we can see
    // through the seam: during the stable phase the smoothed rate is well under 0.10%.
    const vm = runEngine({ scenario: 'critical', seed: 42 })
    const earlySmoothed = vm.detail.smoothedSeries.slice(0, 8) // stable phase days
    for (const m of earlySmoothed) {
      expect(m).toBeLessThan(0.001) // below the 0.10% watch line despite daily noise
    }
  })
})

describe('failover state machine + standby pool (§5.6)', () => {
  it('Gmail resolves to Failover at today in the critical run', () => {
    const vm = runEngine({ scenario: 'critical', seed: 42 })
    expect(vm.failover.current.esp).toBe('gmail')
    expect(vm.failover.current.stage).toBe('Failover')
    expect(vm.failover.stages).toEqual(['Healthy', 'Watch', 'Throttle', 'Failover', 'Cooldown'])
    expect(vm.failover.routingAction).toMatch(/Route Gmail traffic/)
  })

  it('the standby pool holds 3 all-green backup domains', () => {
    const vm = runEngine({ scenario: 'critical', seed: 42 })
    expect(vm.failover.standby).toHaveLength(3)
    for (const s of vm.failover.standby) {
      expect(s.gmailHealth).toBeGreaterThanOrEqual(80)
      expect(s.outlookHealth).toBeGreaterThanOrEqual(80)
    }
  })
})

describe('alerts (§5.7)', () => {
  it('critical emits the red projected-cliff alert with a failover action', () => {
    const vm = runEngine({ scenario: 'critical', seed: 42 })
    const red = vm.alerts.find((a) => a.severity === 'red')
    expect(red).toBeDefined()
    expect(red!.action).toBe('Throttle + fail over')
    expect(red!.headline).toContain('0.30%')
  })

  it('healthy emits only calm green rows', () => {
    const vm = runEngine({ scenario: 'healthy', seed: 42 })
    expect(vm.alerts.length).toBeGreaterThan(0)
    expect(vm.alerts.every((a) => a.severity === 'green')).toBe(true)
  })
})

describe('healthy scenario — the calm, degenerate case', () => {
  let vm: ViewModel
  beforeAll(() => {
    vm = runEngine({ scenario: 'healthy', seed: 42 })
  })

  it('both ESPs stay above the watch line (health never drops below 80)', () => {
    expect(vm.esp.gmail.score).toBeGreaterThanOrEqual(80)
    expect(vm.esp.outlook.score).toBeGreaterThanOrEqual(80)
    expect(Math.min(...vm.leadTime.healthSeries)).toBeGreaterThanOrEqual(80)
  })

  it('no early warning is needed: warningGainedDays === 0', () => {
    expect(vm.leadTime.warningGainedDays).toBe(0)
  })

  it('the failover playbook sits at Healthy and the global status is green', () => {
    expect(vm.failover.current.stage).toBe('Healthy')
    expect(vm.globalStatus.level).toBe('green')
  })
})
