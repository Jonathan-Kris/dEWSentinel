# dEWSentinel — React / Next.js console

*We see the dip before your reply rates do.*

A client-side, **deterministic** port of the vanilla POC (`../demo`) to **Next.js 16 + TypeScript**. It **computes** (not fakes) per-ESP deliverability **health** from synthetic, seeded data and renders it into the Console (Screen 1) and Domain detail (Screen 2).

> **Simulated data.** The engine and visuals are real; the data is synthetic. Shown as a persistent label in the UI footer.

## Architecture — one deep module, one seam, shallow views

```
app/
  app/            layout (self-hosted fonts + tokens) · page (Console, holds scenario/seed/selectedDomain)
  lib/engine/     runEngine(opts) → ViewModel   ← the ONLY engine export the UI uses
                  rng · smoothing · slope · scoring · generator · stateMachine (all hidden)
                  viewmodel.ts                  ← the seam contract (ENGINE_SPEC §8)
  components/
    useEngine.ts  the UI ⇄ engine seam (memoised)
    charts/       LineChart · GaugeRing · Sparkline   (data-driven SVG, rebuilt from ViewModel arrays)
    console/      TopBar · Controls · Hero · EspCards · Failover · DomainsTable · AlertFeed
    detail/       DomainDetail · RawVsSmoothedChart · SignalBreakdown · RecommendedAction
    SimLabel.tsx  the §11 honesty label
  styles/         tokens.css · app.css (Hi-Fi port) · fonts.css (base64 IBM Plex, zero network)
  test/           setup · fixtures (criticalVM / healthyVM)
```

- The **engine** is a faithful TS port of `demo/engine.js`, hidden behind `runEngine`. It is tested **only** through the ViewModel — never internals.
- The **UI** has zero business logic: each zone reads its ViewModel slice and renders.
- **Determinism is a hard requirement:** same `seed` ⇒ identical ViewModel ⇒ identical render. No `Date.now()`/`Math.random()` outside the seeded RNG; no network; no storage.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest + React Testing Library (78 tests)
npm run typecheck  # tsc --noEmit
npm run build      # next build (static)
```

## Deploy (Vercel)

The Vercel project's **Root Directory** is set to `app`; Next.js is auto-detected. Every push/PR gets an automatic **Preview Deployment**; `main` deploys to production.

## Acceptance (ENGINE_SPEC §10)

`app/app/acceptance.test.tsx` walks the §10 criteria end-to-end: all five zones render, Gmail < 40 / Outlook ≥ 80, the hero health line falls through the zones with the ≈10-day warning band, the Healthy⇄Critical toggle flips both gauges, drill-down navigation works, the render is deterministic, and the simulated-data label always shows.
