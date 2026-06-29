import { describe, it, expect } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './page'

/* Slice 10 — end-to-end acceptance. Walks the ENGINE_SPEC §10 criteria through
 * the real Console (<Home/>), driven entirely by the useEngine seam. Every zone
 * is wired; the Healthy⇄Critical toggle flips both gauges; drill-down navigates;
 * the render is deterministic; the honesty label always shows. */

describe('Console — critical scenario (default load)', () => {
  it('renders all five console zones', () => {
    render(<Home />)
    expect(screen.getByTestId('zone-hero')).toBeInTheDocument()
    expect(screen.getByTestId('zone-esp')).toBeInTheDocument()
    expect(screen.getByTestId('zone-failover')).toBeInTheDocument()
    expect(screen.getByTestId('zone-domains')).toBeInTheDocument()
    expect(screen.getByTestId('zone-alerts')).toBeInTheDocument()
  })

  it('hero shows the lagging dashboard pinned green (96) and ≈10 days of warning gained', () => {
    render(<Home />)
    const hero = screen.getByTestId('zone-hero')
    expect(within(hero).getByTestId('dash-strip')).toHaveTextContent('96')
    expect(within(hero).getByTestId('warn-badge')).toHaveTextContent(/10 days of warning gained/)
  })

  it('Gmail card is critical (27) while Outlook holds healthy (96) — one score, both agree with the hero', () => {
    render(<Home />)
    const esp = screen.getByTestId('zone-esp')
    expect(esp).toHaveTextContent('27')
    expect(esp).toHaveTextContent('Critical')
    expect(esp).toHaveTextContent('96')
    expect(esp).toHaveTextContent('Healthy')
  })

  it('failover playbook is at the pulsing Failover stage', () => {
    render(<Home />)
    const fo = screen.getByTestId('zone-failover')
    expect(fo.querySelector('.active-failover')).toBeTruthy()
    expect(fo).toHaveTextContent('current')
  })

  it('alert feed fires the red projected-cliff alert with a failover action', () => {
    render(<Home />)
    const alerts = screen.getByTestId('zone-alerts')
    expect(within(alerts).getByRole('button', { name: 'Throttle + fail over' })).toBeInTheDocument()
  })
})

describe('Drill-down navigation', () => {
  it('opens Screen 2 from the focal domain row and returns via "← Console"', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: /Open acme-outreach-03\.com/i }))
    const detail = screen.getByTestId('screen-detail')
    expect(within(detail).getByText('Overall health score')).toBeInTheDocument()
    expect(detail).toHaveTextContent('27')
    await user.click(screen.getByRole('button', { name: '← Console' }))
    expect(screen.getByTestId('zone-hero')).toBeInTheDocument()
  })
})

describe('Healthy⇄Critical toggle flips every zone', () => {
  it('flips both gauges to healthy/green, clears the red alert, and rests failover at Healthy', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Healthy' }))

    const esp = screen.getByTestId('zone-esp')
    expect(esp).not.toHaveTextContent('Critical')
    // both ESP gauges green (healthy seed-42: gmail 92, outlook 93)
    expect(esp).toHaveTextContent('92')
    expect(esp).toHaveTextContent('93')

    expect(screen.queryByRole('button', { name: 'Throttle + fail over' })).not.toBeInTheDocument()
    expect(screen.getByTestId('zone-failover').querySelector('.active-healthy')).toBeTruthy()
    expect(screen.getByTestId('warn-badge')).toHaveTextContent(/all clear/i)
  })
})

describe('Invariants', () => {
  it('is deterministic — two fresh renders at the default seed produce identical DOM', () => {
    const { container: a } = render(<Home />)
    const html = a.innerHTML
    cleanup()
    const { container: b } = render(<Home />)
    expect(b.innerHTML).toBe(html)
  })

  it('always shows the simulated-data honesty label, on both screens', async () => {
    const user = userEvent.setup()
    render(<Home />)
    expect(screen.getByText(/Simulated data\./i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Open acme-outreach-03\.com/i }))
    expect(screen.getByText(/Simulated data\./i)).toBeInTheDocument()
  })
})
