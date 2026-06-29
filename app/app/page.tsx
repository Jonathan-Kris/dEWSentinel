'use client'

import { useState } from 'react'
import type { Scenario } from '@/lib/engine'
import { useEngine } from '@/components/useEngine'
import { TopBar } from '@/components/console/TopBar'
import { Hero } from '@/components/console/Hero'
import { EspCards } from '@/components/console/EspCards'
import { Failover } from '@/components/console/Failover'
import { DomainsTable } from '@/components/console/DomainsTable'
import { AlertFeed } from '@/components/console/AlertFeed'
import { DomainDetail } from '@/components/detail/DomainDetail'
import { SimLabel } from '@/components/SimLabel'

/**
 * The Console (Screen 1). Holds the only client state — scenario, seed, and the
 * selected domain (null = Console, set = drill-down to Screen 2). Everything
 * flows from the single ViewModel seam (useEngine); each zone reads its slice.
 */
export default function Home() {
  const [scenario, setScenario] = useState<Scenario>('critical')
  const [seed, setSeed] = useState(42)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

  const vm = useEngine(scenario, seed)

  return (
    <>
      {selectedDomain !== null ? (
        <DomainDetail
          detail={vm.detail}
          esp={vm.esp}
          failover={vm.failover}
          meta={vm.meta}
          onBack={() => setSelectedDomain(null)}
        />
      ) : (
        <div className="console">
          <TopBar
            meta={vm.meta}
            globalStatus={vm.globalStatus}
            scenario={scenario}
            seed={seed}
            onScenario={setScenario}
            onSeed={setSeed}
          />
          <div className="body">
            <div className="maincol">
              <Hero leadTime={vm.leadTime} meta={vm.meta} />
              <EspCards esp={vm.esp} />
              <Failover failover={vm.failover} />
              <DomainsTable
                domains={vm.domains}
                focalDomain={vm.failover.current.domain}
                onSelectDomain={setSelectedDomain}
              />
            </div>
            <AlertFeed alerts={vm.alerts} />
          </div>
        </div>
      )}

      <SimLabel />
    </>
  )
}
