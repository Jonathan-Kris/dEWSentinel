import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { Hero } from './Hero'
import { criticalVM, healthyVM } from '@/test/fixtures'

describe('Hero — Zone A lead-time health chart', () => {
  it('frames the view as a 0–100 Health score and shows the lagging dashboard still all-green', () => {
    const { getByTestId, container } = render(
      <Hero leadTime={criticalVM.leadTime} meta={criticalVM.meta} />,
    )
    // the y-axis is the single Health score, not a "risk" number
    expect(container.textContent).toContain('Health score')
    // the lagging "today's dashboard" strip is calmly green while Sentinel screams
    const strip = getByTestId('dash-strip')
    expect(within(strip).getByText('96')).toBeInTheDocument()
    expect(strip.textContent).toContain('/100')
    expect(strip.textContent).toContain('✓ all green')
  })

  it('headlines the lead Sentinel buys: "≈ 10 days of warning gained"', () => {
    const { getByTestId } = render(
      <Hero leadTime={criticalVM.leadTime} meta={criticalVM.meta} />,
    )
    const badge = getByTestId('warn-badge')
    expect(badge.textContent).toContain('≈ 10 days of warning gained')
  })

  it('draws the amber "watch" and red "cliff" reference lines on the health axis', () => {
    const { container } = render(
      <Hero leadTime={criticalVM.leadTime} meta={criticalVM.meta} />,
    )
    expect(container.textContent).toContain('watch')
    expect(container.textContent).toContain('cliff')
    // the boundaries are coloured per the health palette
    expect(container.querySelector('line[stroke="#fbbf24"]')).toBeInTheDocument()
    expect(container.querySelector('line[stroke="#f87171"]')).toBeInTheDocument()
  })

  it('plots the observed health as a solid line and the projection as a dashed continuation', () => {
    const { container } = render(
      <Hero leadTime={criticalVM.leadTime} meta={criticalVM.meta} />,
    )
    const polylines = Array.from(container.querySelectorAll('polyline'))
    // the dashed projected tail
    const dashed = polylines.filter((p) => p.getAttribute('stroke-dasharray') === '2 4')
    expect(dashed).toHaveLength(1)
    // the solid accent observed line (no dash, full-width stroke)
    const solid = polylines.filter(
      (p) =>
        p.getAttribute('stroke') === '#818cf8' &&
        !p.getAttribute('stroke-dasharray') &&
        p.getAttribute('stroke-width') === '3',
    )
    expect(solid).toHaveLength(1)
    // the dashed projection begins where the solid line ends (joined at "today")
    const observedPts = solid[0].getAttribute('points')!.trim().split(' ')
    const projPts = dashed[0].getAttribute('points')!.trim().split(' ')
    expect(projPts[0]).toBe(observedPts[observedPts.length - 1])
  })

  it('marks where Sentinel first warned and where lagging tools finally noticed', () => {
    const { container } = render(
      <Hero leadTime={criticalVM.leadTime} meta={criticalVM.meta} />,
    )
    // open indigo ring on the watch crossing, 10 days before today
    expect(container.textContent).toContain('▲ Sentinel warned · 10d ago')
    // the grey "today" dot where reply rates finally drop
    expect(container.textContent).toContain('▲ reply rates now dropping')
    // an open ring (transparent fill) for the Sentinel-warned marker
    expect(container.querySelector('circle[fill="#0c0e14"][stroke="#818cf8"]')).toBeInTheDocument()
    // a solid grey dot for today
    expect(container.querySelector('circle[fill="#8a90a0"]')).toBeInTheDocument()
  })

  it('stays quiet in the calm case: no warning band, no "Sentinel warned" markers, all-clear badge', () => {
    const { getByTestId, container } = render(
      <Hero leadTime={healthyVM.leadTime} meta={healthyVM.meta} />,
    )
    expect(getByTestId('warn-badge').textContent).toBe('✓ all clear · no early warning needed')
    expect(container.textContent).not.toContain('Sentinel warned')
    expect(container.textContent).not.toContain('reply rates now dropping')
    // no indigo warning-gap band drawn
    expect(container.querySelector('rect[fill="rgba(129,140,248,.14)"]')).not.toBeInTheDocument()
    // still keeps a plain grey "today" dot
    expect(container.querySelector('circle[fill="#8a90a0"]')).toBeInTheDocument()
  })
})
