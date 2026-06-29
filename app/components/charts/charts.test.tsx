import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LineChart } from './LineChart'
import { GaugeRing } from './GaugeRing'
import { Sparkline } from './Sparkline'

describe('LineChart — data→geometry mapping', () => {
  const pad = { l: 80, r: 40, t: 14, b: 50 }
  const width = 740
  const height = 256

  it('maps the domain corners to the plot rectangle and draws a series polyline', () => {
    const { container } = render(
      <LineChart
        xDomain={[0, 10]}
        yDomain={[0, 100]}
        width={width}
        height={height}
        pad={pad}
        series={[{ points: [[0, 0], [10, 100]], color: '#818cf8' }]}
      />,
    )
    const poly = container.querySelector('polyline')!
    expect(poly).toBeTruthy()
    const pts = poly.getAttribute('points')!.split(' ').map((p) => p.split(',').map(Number))
    // (x=0,y=0) → (padL, top of plot is padT; y=0 is the BOTTOM → padT+plotH)
    const plotH = height - pad.t - pad.b
    expect(pts[0][0]).toBeCloseTo(pad.l, 5)
    expect(pts[0][1]).toBeCloseTo(pad.t + plotH, 5)
    // (x=10,y=100) → (padL+plotW, padT)
    const plotW = width - pad.l - pad.r
    expect(pts[1][0]).toBeCloseTo(pad.l + plotW, 5)
    expect(pts[1][1]).toBeCloseTo(pad.t, 5)
  })

  it('renders y-range zone bands, reference lines, and markers from data', () => {
    const { container } = render(
      <LineChart
        xDomain={[0, 5]}
        yDomain={[0, 100]}
        bands={[{ fromY: 80, toY: 100, color: 'rgba(34,197,94,.08)' }]}
        hlines={[{ y: 80, color: '#fbbf24', dash: '6 4', label: 'watch' }]}
        markers={[{ x: 2, y: 80, color: '#818cf8', label: 'Sentinel warned' }]}
      />,
    )
    expect(container.querySelector('rect')).toBeTruthy()
    expect(container.querySelector('line[stroke="#fbbf24"]')).toBeTruthy()
    expect(container.querySelector('circle')).toBeTruthy()
    expect(container.textContent).toContain('watch')
    expect(container.textContent).toContain('Sentinel warned')
  })

  it('renders an open ring (transparent fill) when a marker has no fill, and a solid dot when it does', () => {
    const { container } = render(
      <LineChart
        xDomain={[0, 5]}
        yDomain={[0, 100]}
        markers={[
          { x: 1, y: 50, color: '#818cf8' },
          { x: 2, y: 40, color: '#8a90a0', fill: '#8a90a0', strokeWidth: 0 },
        ]}
      />,
    )
    const circles = Array.from(container.querySelectorAll('circle'))
    expect(circles[0].getAttribute('fill')).toBe('#0c0e14') // open ring
    expect(circles[1].getAttribute('fill')).toBe('#8a90a0') // solid dot
  })
})

describe('GaugeRing', () => {
  it('sets the value arc length proportional to the score', () => {
    const { container } = render(<GaugeRing score={50} color="#ef4444" ringId="g" />)
    const arc = container.querySelector('#g')!
    const circ = 2 * Math.PI * 37
    const [dash] = arc.getAttribute('stroke-dasharray')!.split(' ').map(Number)
    expect(dash).toBeCloseTo(circ * 0.5, 1)
    expect(arc.getAttribute('stroke')).toBe('#ef4444')
    expect(container.textContent).toContain('50')
  })
})

describe('Sparkline', () => {
  it('plots one point per value, scaled into the box', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} color="#22c55e" />)
    const poly = container.querySelector('polyline')!
    const pts = poly.getAttribute('points')!.trim().split(' ')
    expect(pts).toHaveLength(4)
  })
})
