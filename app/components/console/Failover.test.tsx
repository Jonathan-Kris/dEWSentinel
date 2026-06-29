import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Failover } from './Failover'
import { criticalVM, healthyVM } from '@/test/fixtures'

describe('Failover playbook (Zone D)', () => {
  it('lays out the five escalation stages in order', () => {
    const { container } = render(<Failover failover={criticalVM.failover} />)
    const pills = Array.from(container.querySelectorAll('.fo-stage'))
    expect(pills).toHaveLength(5)
    const stagesInOrder = ['Healthy', 'Watch', 'Throttle', 'Failover', 'Cooldown']
    stagesInOrder.forEach((stage, i) => {
      expect(pills[i].textContent).toContain(stage)
    })
  })

  it('highlights the live Failover stage and marks it as current', () => {
    const { container } = render(<Failover failover={criticalVM.failover} />)
    const active = container.querySelector('.fo-stage.active-failover')!
    expect(active).toBeTruthy()
    expect(active.textContent).toContain('Failover')
    expect(active.textContent).toContain('current')
  })

  it('shows one green dot for each hot-standby domain in the pool', () => {
    const { container } = render(<Failover failover={criticalVM.failover} />)
    const dots = container.querySelectorAll('.standby .dots span')
    expect(dots).toHaveLength(3)
    expect(container.querySelector('.standby')!.textContent).toContain('hot-standby')
  })

  it('names the focal domain in the panel header', () => {
    const { container } = render(<Failover failover={criticalVM.failover} />)
    const header = container.querySelector('.zone-title')!
    expect(header.textContent).toContain('Failover playbook')
    expect(header.textContent).toContain(criticalVM.failover.current.domain)
  })

  it('moves the highlight to Healthy when the domain is calm', () => {
    const { container } = render(<Failover failover={healthyVM.failover} />)
    const active = container.querySelector('.fo-stage.active-healthy')!
    expect(active).toBeTruthy()
    expect(active.textContent).toContain('Healthy')
    expect(container.querySelector('.fo-stage.active-failover')).toBeNull()
  })
})
