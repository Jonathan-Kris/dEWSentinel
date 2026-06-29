# dEWSentinel — Deliverability Early-Warning Console (POC)

*We see the dip before your reply rates do.*

A single-page, client-side proof-of-concept that **computes** (not fakes) per-ESP deliverability risk
signals from synthetic data and renders them into the dEWSentinel console UI.

**▶ Live demo:** https://6a42018e7340f4326a1d8150--dewsentinel-poc-demo.netlify.app
**📄 One-page insight memo:** [INSIGHT_MEMO.md](./INSIGHT_MEMO.md) — the thesis, the problem, and why it's defensible.

> **Simulated data.** The *engine and visuals are real*; the data is synthetic. In production, leading
> signals come from sending.ac's own MTA accounting-webhook telemetry (bounces, deferrals, 4xx/5xx
> provider codes), confirmed by Google Postmaster + Microsoft SNDS. This is shown as a persistent label
> in the UI footer.

---

## What it shows

A Gmail sending domain decays silently over 30 days while the "old dashboard" (a lagging warmup/placement
proxy) stays green — until the cliff. dEWSentinel surfaces the decay **early** from leading signals,
**per inbox provider** (Gmail vs Outlook), projects the trend to the 0.30% complaint cliff, and drives an
automatic `Healthy → Watch → Throttle → Failover → Cooldown` failover playbook with a hot-standby pool.

- **Lead-time view** — flat-green lagging dashboard vs the declining dEWSentinel health line, with a shaded
  *"≈ N days of warning gained"* band (computed from when the score crosses Watch vs when the dashboard finally dips).
- **Per-ESP cards** — ring gauge, smoothed complaint rate + 90% CI, position on the 0.10%→0.30% band, and a
  projection (*"crosses 0.30% cliff in ~N days"*).
- **Domain detail** — raw (jagged, spiking past the cliff) vs Beta-Binomial smoothed rate + confidence band,
  the alert marker where smoothing crosses 0.10%, and the weighted signal breakdown.

A **Critical ⇄ Healthy** toggle and a **seed** input (with Replay) let you reshuffle the synthetic noise on
camera and prove the render is deterministic. A **🧭 Guide** toggle (top bar) outlines every clickable /
selectable control with numbered step badges and a walkthrough panel, so a reviewer can see exactly how to
drive the demo.

---

## Run it

It's a static site with **no build step, no dependencies, no network calls**.

```bash
# just open the file
open index.html              # macOS
# or serve the folder
python3 -m http.server 8000  # then visit http://localhost:8000
```

Deployable folder = `index.html` + `engine.js` + `render.js` + `fonts.css` (IBM Plex self-hosted as base64,
so there are zero font/CDN requests at runtime).

---

## Architecture (clean boundary)

The Hi-Fi design export (`product_design/`) was used **only** as a visual reference — this is a fresh
rebuild, not an injection into the Claude Design `<x-dc>`/`support.js` runtime.

| File | Responsibility |
|---|---|
| **`engine.js`** | **Pure logic, zero DOM.** Seeded RNG → synthetic generator → Beta-Binomial smoothing → least-squares slope/projection → per-ESP weighted scoring → lagging "dashboard" proxy → failover state machine → alerts. Exposes one function: `runEngine({scenario, seed, days, today}) → ViewModel`. |
| **`render.js`** | **DOM only, zero logic.** Reads the `ViewModel` and writes into the `#id` hooks; includes the JS-generated SVG line-chart + sparkline helpers. |
| **`index.html`** | Static visual clone with all id hooks + a tiny bootstrap that wires the controls (read state → `runEngine` → `render`). |

The two modules meet **only** at the `ViewModel` contract — every displayed number (Gmail score, days-to-cliff,
warning-gained, chart points) is derived by the engine; nothing is hardcoded. The scenario *shape* is fixed,
but the numbers fall out of tuned **generator parameters** (smoothing prior `b0`, window `W`, leading-signal
ramps), not literals.

---

## Acceptance criteria (§10) — verified

All 16 self-check assertions pass for the default load (`scenario: "critical"`, `seed: 42`), confirmed both
at the engine level (Node) and in headless Chrome against the live deployment:

| Criterion | Result |
|---|---|
| Opens as static file, **no console errors, zero network requests** | ✅ (verified headless on `file://` and live HTTPS) |
| Deterministic by seed (same seed ⇒ identical render) | ✅ |
| Lead-time: flat green dashboard, declining indigo line, warning band **N ≥ 7** | ✅ N = **8 days** |
| Gmail: red, score < 40, rate ~0.17–0.25%, "~3–6 days to cliff" | ✅ score **19**, **0.23%**, **~4 days** |
| Outlook: green, score ≥ 80, stable | ✅ score **96**, stable |
| Detail: jagged raw spiking past 0.30%, smooth + CI band, 0.10% crossing marker, guide lines | ✅ |
| Toggle → Healthy: both gauges green, no red alerts, failover Healthy, no cliff projection | ✅ |
| Numbers in IBM Plex Mono; dark theme, accent `#818cf8` | ✅ |
| Persistent "simulated data" label | ✅ |

---

## Roadmap

- **v0 (this):** engine + console on synthetic, deterministic data.
- **v1:** ingest live MTA accounting-webhook telemetry + Google Postmaster/Microsoft SNDS for one ESP; real alerting.
- **v2:** automated failover execution + standby-pool orchestration.

---

## Deployment note

The site is deployed on Netlify. The current account has production publishing (`--prod` to the apex domain)
gated, so the link above is a **permanent Netlify deploy permalink** (fully functional). To promote it to the
clean apex URL `https://dewsentinel-poc-demo.netlify.app` once the account is verified:

```bash
netlify deploy --prod --dir=dist
```

To re-deploy from scratch via **Netlify Drop** (no CLI, ~2 min):
1. Go to https://app.netlify.com/drop
2. Drag the project folder (or the `dist/` folder containing `index.html`, `engine.js`, `render.js`, `fonts.css`).
3. Netlify returns a live URL instantly.
