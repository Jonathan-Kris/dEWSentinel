import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useEngine } from './useEngine'
import type { Scenario } from '@/lib/engine'

describe('useEngine — the UI ⇄ engine seam', () => {
  it('returns the live ViewModel for the given scenario and seed', () => {
    const { result } = renderHook(() => useEngine('critical', 42))
    expect(result.current.meta.scenario).toBe('critical')
    expect(result.current.meta.seed).toBe(42)
    expect(result.current.esp.gmail.tier).toBe('critical')
  })

  it('is referentially stable when inputs do not change', () => {
    const { result, rerender } = renderHook(({ s, n }) => useEngine(s, n), {
      initialProps: { s: 'critical' as Scenario, n: 42 },
    })
    const first = result.current
    rerender({ s: 'critical' as Scenario, n: 42 })
    expect(result.current).toBe(first)
  })

  it('re-computes when the scenario flips', () => {
    const { result, rerender } = renderHook(({ s, n }) => useEngine(s, n), {
      initialProps: { s: 'critical' as Scenario, n: 42 },
    })
    const before = result.current
    rerender({ s: 'healthy' as Scenario, n: 42 })
    expect(result.current).not.toBe(before)
    expect(result.current.meta.scenario).toBe('healthy')
    expect(result.current.failover.current.stage).toBe('Healthy')
  })

  it('re-computes when the seed changes', () => {
    const { result, rerender } = renderHook(({ s, n }) => useEngine(s, n), {
      initialProps: { s: 'critical' as Scenario, n: 42 },
    })
    const before = result.current
    rerender({ s: 'critical' as Scenario, n: 7 })
    expect(result.current).not.toBe(before)
    expect(result.current.meta.seed).toBe(7)
  })
})
