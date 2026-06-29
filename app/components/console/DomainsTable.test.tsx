import { describe, it, expect, vi } from 'vitest'
import { render, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DomainsTable } from './DomainsTable'
import { criticalVM } from '@/test/fixtures'

/* Zone E — Domains table + drill-down navigation (Slice 8).
 *
 * Oracle: demo/render.js `renderDomains` + `scoreColor` + `STATE_COLOR`.
 * The critical ViewModel is the frozen behaviour oracle; we never hardcode the
 * engine's numbers here — we read them off `criticalVM.domains` so the test can
 * never drift from the engine. The focal row (the failing failover domain) is
 * the only interactive row: clicking it opens Screen 2. */

const focalDomain = criticalVM.failover.current.domain

function setup(onSelectDomain: (domain: string) => void = vi.fn()) {
  const utils = render(
    <DomainsTable
      domains={criticalVM.domains}
      focalDomain={focalDomain}
      onSelectDomain={onSelectDomain}
    />,
  )
  return { onSelectDomain, ...utils }
}

const rowFor = (container: HTMLElement, domain: string) =>
  within(container).getByText(domain).closest('.trow') as HTMLElement

describe('DomainsTable', () => {
  it('renders one row per domain with its name and Gmail/Outlook scores', () => {
    const { container } = setup()
    const rows = container.querySelectorAll('.trow')
    expect(rows).toHaveLength(criticalVM.domains.length)
    criticalVM.domains.forEach((d) => {
      const row = rowFor(container, d.domain)
      expect(within(row).getByText(String(d.gmail))).toBeInTheDocument()
      expect(within(row).getByText(String(d.outlook))).toBeInTheDocument()
    })
  })

  it('colours the Gmail score by health — red for the failing focal domain', () => {
    const { container } = setup()
    const focal = criticalVM.domains.find((d) => d.domain === focalDomain)!
    expect(focal.gmail).toBeLessThan(60) // the focal failover domain is failing
    const gmailCell = within(rowFor(container, focalDomain)).getByText(String(focal.gmail))
    expect(gmailCell).toHaveStyle({ color: '#f87171' })
  })

  it('shows a state tag whose label matches each row state', () => {
    const { container } = setup()
    criticalVM.domains.forEach((d) => {
      const tag = rowFor(container, d.domain).querySelector('.state-tag')
      expect(tag).not.toBeNull()
      expect(tag).toHaveTextContent(d.state)
    })
  })

  it('opens the domain detail when the focal row is clicked', async () => {
    const user = userEvent.setup()
    const { container, onSelectDomain } = setup()
    await user.click(rowFor(container, focalDomain))
    expect(onSelectDomain).toHaveBeenCalledWith(focalDomain)
    expect(onSelectDomain).toHaveBeenCalledTimes(1)
  })

  it('does not navigate when a non-focal row is clicked', async () => {
    const user = userEvent.setup()
    const { container, onSelectDomain } = setup()
    const nonFocal = criticalVM.domains.find((d) => d.domain !== focalDomain)!
    await user.click(rowFor(container, nonFocal.domain))
    expect(onSelectDomain).not.toHaveBeenCalled()
  })

  it('activates the focal row from the keyboard (Enter)', async () => {
    const user = userEvent.setup()
    const { container, onSelectDomain } = setup()
    const focalRow = rowFor(container, focalDomain)
    focalRow.focus()
    expect(focalRow).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(onSelectDomain).toHaveBeenCalledWith(focalDomain)
  })
})
