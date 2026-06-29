import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertFeed } from './AlertFeed'
import { criticalVM, healthyVM } from '@/test/fixtures'

/* Zone C — Alert feed (right rail), Slice 6. The component IS the `.rail`
 * column: it renders the "Alert feed" head + one row per alert (newest first).
 * Asserted against the frozen ViewModel oracle (criticalVM / healthyVM) so the
 * feed can never drift from the engine (ENGINE_SPEC §5.7, HANDOFF "Zone C"). */

describe('Zone C — Alert feed', () => {
  it('renders one row per alert with its timestamp (4 for the critical scenario)', () => {
    const { container } = render(<AlertFeed alerts={criticalVM.alerts} />)
    expect(container.querySelectorAll('.alert')).toHaveLength(4)
    expect(screen.getByText('11:42 · 6 min ago')).toBeInTheDocument()
    expect(screen.getByText('10:08 · 1 hr ago')).toBeInTheDocument()
    expect(screen.getByText('08:30 · 3 hrs ago')).toBeInTheDocument()
    expect(screen.getByText('yesterday')).toBeInTheDocument()
  })

  it('gives the red (failover) alert a "Throttle + fail over" button', () => {
    render(<AlertFeed alerts={criticalVM.alerts} />)
    const btn = screen.getByRole('button', { name: 'Throttle + fail over' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('abtn', 'red')
  })

  it('gives the amber (engagement-decay) alert a ghost "Review list & content" button', () => {
    render(<AlertFeed alerts={criticalVM.alerts} />)
    const btn = screen.getByRole('button', { name: 'Review list & content' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveClass('abtn', 'ghost')
    expect(btn).not.toHaveClass('red')
  })

  it('renders no action button for informational green alerts', () => {
    render(<AlertFeed alerts={criticalVM.alerts} />)
    // critical has exactly the red + amber actions, so only 2 buttons total
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('carries the matching severity class on each row and its dot', () => {
    const { container } = render(<AlertFeed alerts={criticalVM.alerts} />)
    expect(container.querySelectorAll('.alert.red .adot')).toHaveLength(1)
    expect(container.querySelectorAll('.alert.amber .adot')).toHaveLength(1)
    expect(container.querySelectorAll('.alert.green .adot')).toHaveLength(2)
  })

  it('renders the healthy scenario as two green rows with no action buttons', () => {
    const { container } = render(<AlertFeed alerts={healthyVM.alerts} />)
    const rows = container.querySelectorAll('.alert')
    expect(rows).toHaveLength(2)
    rows.forEach((row) => expect(row).toHaveClass('green'))
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
