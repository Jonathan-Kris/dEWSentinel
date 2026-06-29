import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from './page'

/* Foundation tracer + Slice 3 (shell/top bar/controls) acceptance. Drives the
 * whole page through the useEngine seam. Zone internals are filled in by the
 * parallel slice agents — here we assert the shell, controls, and honesty label. */

describe('Console shell', () => {
  it('always shows the simulated-data honesty label (§11)', () => {
    render(<Home />)
    expect(screen.getByText(/Simulated data\./i)).toBeInTheDocument()
  })

  it('shows the wordmark and account selector from meta', () => {
    render(<Home />)
    expect(screen.getByText('dEWSentinel', { selector: '.brand' })).toBeInTheDocument()
    expect(screen.getByText('Acme Agency')).toBeInTheDocument()
    expect(screen.getByText(/84 domains/)).toBeInTheDocument()
  })

  it('defaults to the critical scenario with a red "2 domains critical" status pill', () => {
    render(<Home />)
    expect(screen.getByText('2 domains critical')).toBeInTheDocument()
    const pill = document.getElementById('status-pill')!
    expect(pill.className).toContain('red')
  })

  it('flips every zone when the scenario toggles to healthy', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByRole('button', { name: 'Healthy' }))
    expect(screen.getByText('all domains healthy')).toBeInTheDocument()
    const pill = document.getElementById('status-pill')!
    expect(pill.className).toContain('green')
  })

  it('re-runs the engine when the seed changes via Enter', async () => {
    const user = userEvent.setup()
    render(<Home />)
    const seed = document.getElementById('seed-input') as HTMLInputElement
    expect(seed.value).toBe('42')
    await user.clear(seed)
    await user.type(seed, '7{Enter}')
    expect(seed.value).toBe('7')
    // still a coherent console after re-run
    expect(screen.getByText(/Simulated data\./i)).toBeInTheDocument()
  })
})
