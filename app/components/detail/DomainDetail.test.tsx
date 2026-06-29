import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DomainDetail } from './DomainDetail'
import { criticalVM, healthyVM } from '@/test/fixtures'

function renderCritical(onBack = vi.fn()) {
  return render(
    <DomainDetail
      detail={criticalVM.detail}
      esp={criticalVM.esp}
      failover={criticalVM.failover}
      meta={criticalVM.meta}
      onBack={onBack}
    />,
  )
}

describe('DomainDetail — Screen 2 (domain drill-down)', () => {
  it('header shows the domain under investigation and its overall health score', () => {
    renderCritical()
    expect(screen.getByText('acme-outreach-03.com')).toBeInTheDocument()
    expect(screen.getByText('Overall health score')).toBeInTheDocument()
    // single 0–100 health number, low = bad (27/100), rendered in mono
    const val = document.querySelector('.detail-head .right .val')!
    expect(val).toHaveTextContent('27')
    expect(val).toHaveTextContent('/100')
    expect(val).toHaveClass('mono')
    // a state pill echoing the failover stage
    expect(screen.getByText('Failover')).toBeInTheDocument()
  })

  it('"← Console" returns to the console via onBack', () => {
    const onBack = vi.fn()
    renderCritical(onBack)
    fireEvent.click(screen.getByRole('button', { name: '← Console' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('plots the raw-vs-smoothed chart with both series and its own complaint-rate reference lines', () => {
    const { container } = renderCritical()
    // raw daily rate (jagged, red) AND the smoothed estimate (accent)
    expect(container.querySelector('polyline[stroke="#ef4444"]')).toBeTruthy()
    expect(container.querySelector('polyline[stroke="#818cf8"]')).toBeTruthy()
    // the chart carries ITS OWN complaint-rate thresholds (not the hero's health lines)
    expect(container.textContent).toContain('0.10% watch line')
    expect(container.textContent).toContain('0.30% cliff')
    // alert-fired callout: 7 days before the cliff (today 29 − crossWatchDay 22)
    expect(screen.getByText(/alert fired here/)).toHaveTextContent('7 days before the cliff')
  })

  it('breaks the score down into every weighted signal, flagging the leading ones', () => {
    const { container } = renderCritical()
    const signals = criticalVM.detail.signals
    // one row per signal (7 of them)
    expect(container.querySelectorAll('.sig')).toHaveLength(signals.length)
    // every signal name, value and weight is shown
    expect(screen.getByText('Smoothed complaint rate')).toBeInTheDocument()
    expect(screen.getByText('0.23%')).toBeInTheDocument()
    expect(screen.getByText('w 28%')).toBeInTheDocument()
    expect(screen.getByText('Complaint-rate slope')).toBeInTheDocument()
    expect(screen.getByText('+0.018%/d')).toBeInTheDocument()
    // leading signals — dEWSentinel's edge — carry a LEADING tag
    const leadingCount = signals.filter((s) => s.kind === 'leading').length
    expect(leadingCount).toBe(4)
    expect(screen.getAllByText('LEADING')).toHaveLength(leadingCount)
  })

  it('critical → recommended-action card lays out the 3-step failover playbook with an actionable button', () => {
    const { container } = renderCritical()
    const rec = container.querySelector('.rec')!
    expect(rec).not.toHaveClass('calm')
    expect(screen.getByText('Recommended action')).toBeInTheDocument()
    expect(screen.getByText('failover playbook · 3 steps')).toBeInTheDocument()
    // the three concrete steps (failover to standby[1] = standby-gmail-02.com)
    expect(container.querySelectorAll('.rec-step')).toHaveLength(3)
    expect(screen.getByText(/Throttle Gmail sends on this domain to 20%/)).toBeInTheDocument()
    expect(screen.getByText(/Fail traffic over to standby-gmail-02\.com/)).toBeInTheDocument()
    expect(screen.getByText(/Hold in Cooldown until 7 consecutive clean days/)).toBeInTheDocument()
    // an enabled CTA
    const btn = screen.getByRole('button', { name: 'Apply failover playbook' })
    expect(btn).toBeEnabled()
  })

  it('healthy → calm rec card with no action to take', () => {
    const { container } = render(
      <DomainDetail
        detail={healthyVM.detail}
        esp={healthyVM.esp}
        failover={healthyVM.failover}
        meta={healthyVM.meta}
        onBack={vi.fn()}
      />,
    )
    const rec = container.querySelector('.rec')!
    expect(rec).toHaveClass('calm')
    expect(screen.getByText('all clear · monitoring')).toBeInTheDocument()
    expect(screen.getByText(/Maintain current sending rotation/)).toBeInTheDocument()
    const btn = screen.getByRole('button', { name: 'No action needed' })
    expect(btn).toBeDisabled()
  })
})
