import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { EspCards } from './EspCards'
import { criticalVM, healthyVM } from '@/test/fixtures'

/* Zone B — Per-ESP health cards. The cards translate each EspCard view-model
 * into the ONE 0–100 health story: a tier-colored gauge, the smoothed complaint
 * rate against the 0.10/0.30 watch/cliff scale, and a projection chip. Behaviour
 * is pinned to the deterministic critical (seed 42) and healthy fixtures. */

describe('Zone B — per-ESP health cards (critical seed 42)', () => {
  it('shows the Gmail card in danger: score 27, "Critical" tag, smoothed rate 0.23%', () => {
    const { getByTestId } = render(<EspCards esp={criticalVM.esp} />)
    const gmail = within(getByTestId('esp-gmail'))
    expect(gmail.getByText('Gmail · Google')).toBeInTheDocument()
    expect(gmail.getByText('27')).toBeInTheDocument()
    expect(gmail.getByText('Critical')).toBeInTheDocument()
    expect(gmail.getByText('0.23%')).toBeInTheDocument()
  })

  it('fills the Gmail rate bar to the rateBarPos (~66%) with a critical red gradient', () => {
    const { getByTestId } = render(<EspCards esp={criticalVM.esp} />)
    const fill = getByTestId('esp-gmail').querySelector('.ratebar .fill') as HTMLElement
    expect(fill.style.width).toBe('66%')
    expect(fill.style.background).toContain('gradient')
    expect(fill.style.background).toContain('rgb(239, 68, 68)') // #ef4444 — critical red
  })

  it('reads the Gmail projection chip as the days-to-cliff warning', () => {
    const { getByTestId } = render(<EspCards esp={criticalVM.esp} />)
    const gmail = within(getByTestId('esp-gmail'))
    expect(gmail.getByText('→ crosses 0.30% cliff in ~4 days')).toBeInTheDocument()
  })

  it('shows the Outlook card as calm: score 96, "Healthy" tag, "stable" projection', () => {
    const { getByTestId } = render(<EspCards esp={criticalVM.esp} />)
    const outlook = within(getByTestId('esp-outlook'))
    expect(outlook.getByText('Outlook · Microsoft')).toBeInTheDocument()
    expect(outlook.getByText('96')).toBeInTheDocument()
    expect(outlook.getByText('Healthy')).toBeInTheDocument()
    expect(outlook.getByText('stable')).toBeInTheDocument()
  })

  it('colors each gauge arc by tier — red Gmail (danger), green Outlook (healthy)', () => {
    const { container } = render(<EspCards esp={criticalVM.esp} />)
    expect(container.querySelector('#gmail-ring')!.getAttribute('stroke')).toBe('#ef4444')
    expect(container.querySelector('#outlook-ring')!.getAttribute('stroke')).toBe('#22c55e')
  })
})

describe('Zone B — per-ESP health cards (healthy fixture)', () => {
  it('renders both cards green, healthy, and stable', () => {
    const { getByTestId } = render(<EspCards esp={healthyVM.esp} />)
    const gmail = within(getByTestId('esp-gmail'))
    const outlook = within(getByTestId('esp-outlook'))

    expect(gmail.getByText('Healthy')).toBeInTheDocument()
    expect(gmail.getByText('stable')).toBeInTheDocument()
    expect(outlook.getByText('Healthy')).toBeInTheDocument()
    expect(outlook.getByText('stable')).toBeInTheDocument()

    expect(getByTestId('esp-gmail').querySelector('#gmail-ring')!.getAttribute('stroke')).toBe('#22c55e')
    expect(getByTestId('esp-outlook').querySelector('#outlook-ring')!.getAttribute('stroke')).toBe('#22c55e')
  })
})
