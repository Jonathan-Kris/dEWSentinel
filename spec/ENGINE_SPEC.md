# dEWSentinel — Engine Module Technical Specification
**Audience:** an AI coding agent (e.g. Claude Code) implementing the demo.
**Goal:** a single, deployable, client-side POC that computes (not fakes) the dEWSentinel risk signals from synthetic data and renders them into the dEWSentinel Console UI.

---

## 0. Context (read first)

dEWSentinel is a deliverability **early-warning console** for a cold-email infrastructure company. A customer's sender reputation decays silently over 2–3 months until mail is filtered as spam; today's dashboards stay "green" because they rely on **lagging** metrics. dEWSentinel's job: surface the decay **early** from **leading** signals, per inbox provider (Gmail / Outlook), and show an automatic failover plan.

This POC uses **synthetic data only** — there is no backend. The engine proves the *logic and the visual story*, not a live pipeline. A visible label must state this (see §11).

---

## 0.1 The hero chart model (the most important design decision — read first)

Two earlier iterations were rejected. **(a)** Overlaying two lines on one Y axis (a "health" line plus a flat "dashboard" line) — rejected because the two series have **different units** and **opposite directions**. **(b)** An inverted **risk** axis (a line *rising* into danger) — rejected because it put a *risk* number (up = bad) right next to the per-ESP **health** gauges (up = good), so the hero and the cards showed two different, inverted 0–100 numbers for the same domain and read as a contradiction. The final, agreed model — **all implementations (this POC and the React/Next.js build) MUST follow it**:

- **The hero is a single HEALTH line that FALLS into danger.** The Y axis is a **0–100 Health score**, `100 = healthy` at the **top**, `0 = danger` at the **bottom** — the **same scale as the per-ESP gauges**, so the hero and the cards always agree (the hero's "today" endpoint equals the Gmail card's score). The Sentinel line **declines** from healthy into a red zone. `down = danger`.
- **Three stacked health zones**, top → bottom: **HEALTHY** (green) above the watch line, **WATCH** (amber) between the two reference lines, **DANGER** (red) below the cliff line.
- **Two horizontal reference lines on the hero**, expressed on the 0–100 health axis:
  - **amber "watch" line at health = 80** (= "leaving healthy"; this is where Sentinel is said to *warn*),
  - **red "cliff" line at health = 40** (= "critical").
- **The lagging "today's dashboard" metric is shown SEPARATELY** as a flat reassuring strip ("Sequencer health 96/100 ✓ all green"), **NOT** as a second line fighting the same axis. It stays green across the **entire visible window** — its dip is implied only *after* "today" (see §5.5). This green-while-we-scream contrast IS the product story.
- **The drama is the gap.** Sentinel's health crosses **below** the watch line `warningGainedDays` before the lagging tools react. A shaded **vertical band** labeled **"≈ N days of warning gained"** spans `crossWatchDay → dashDropDay`. An **open indigo ring** marks where Sentinel warned (sitting on the watch line); a **filled grey dot** marks "today" (where lagging reply-rate monitoring would *only now* notice).
- **A short forward projection** (`projDays`, default 5) extends the health line past "today" as a **dashed** continuation declining toward the floor. The x axis therefore runs `30d ago … today … +5d`.
- **Rate charts** (the ESP card rate bars and the Screen-2 raw-vs-smoothed chart) carry their own two reference lines, expressed in **complaint-rate %**: **0.10% = amber watch**, **0.30% = red cliff**. Do not confuse these with the hero's health-axis reference lines.

> Terminology: the hero, the **ESP gauges, the domains table, and the Screen-2 header** all present the **same** 0–100 **health** score (higher = better; a low red gauge/line = bad). There is **one** score concept across the whole console — never show a risk number next to a health number. ("Risk" remains the *product* framing — what we detect — but every numeric gauge and the hero line are health.)

---

## 1. Critical architecture decision

The provided file `Sentinel_Console_-_Hi-fi_dc.html` is a **Claude Design canvas export**: `<x-dc>` wrapper, `support.js` runtime, absolutely-positioned `<div>`s, static inline-SVG charts with hardcoded point coordinates, and **no `id` attributes**.

**Do NOT inject the engine into that file.** Instead:

> **Rebuild a fresh, standalone `index.html`** that visually reproduces the Hi-Fi mockup (use it as the design reference for layout, colors, type, spacing, and the two-panel chart), but is plain HTML/CSS/JS with `id` hooks the engine renders into. No `support.js`, no `<x-dc>`, no build step.

Match these design tokens, lifted from the export:

| Token | Value |
|---|---|
| App background | `#1a1c22` |
| Panel / card background | `#0c0e14` |
| Card border | `#20242f` / inner dividers `#1b1f29` |
| Primary text | `#e7e9f0`; muted `#6a7080` / `#7a8090` |
| Accent (Sentinel intelligence / indigo health line) | `#818cf8` |
| Watch (amber reference line: health 80 on the hero, 0.10% on rate charts) | `#f59e0b` |
| Cliff / critical (red reference line: health 40 on the hero, 0.30% on rate charts) | `#ef4444` |
| Healthy (green — dashboard strip, HEALTHY zone, healthy gauges) | `#22c55e` |
| Sans font | `IBM Plex Sans` |
| Mono font (ALL numbers, rates, codes, domains, timestamps) | `IBM Plex Mono`, `font-feature-settings:'tnum' 1` |
| Critical pulse / blink | reuse `@keyframes sPulse` / `sBlink` from the export |

---

## 2. Tech constraints

- **Vanilla JS, no dependencies, no bundler.** Inline `<script>` or a couple of `.js` files referenced relatively.
- **Single deployable folder**: `index.html` + `engine.js` + `render.js` (+ `README.md`). Inlining all JS into `index.html` is acceptable.
- **Client-side only.** No network calls, no `localStorage`/`sessionStorage`, no persistence.
- **Deterministic**: same seed ⇒ identical output (seeded RNG).
- Charts are **inline SVG generated by JS** from data (so they're dynamic), not static markup.

---

## 3. File / module layout

```
/dEWSentinel-poc
  index.html      # rebuilt UI shell with id hooks (visual clone of Hi-Fi)
  engine.js       # pure logic: generator, smoother, slope, scoring, state machine, runEngine()
  render.js       # reads a ViewModel, writes into the DOM id hooks; SVG chart helper
  README.md       # links to the one-page memo; "simulated data" note; v0→v1→v2 roadmap
```

`engine.js` must contain **no DOM code**. `render.js` must contain **no business logic**. The boundary between them is the `ViewModel` (§8).

---

## 4. Data model (synthetic)

The generator emits **per-day, per-ESP** records for one focal domain over `DAYS` days (default 30), where ESP ∈ `{ "gmail", "outlook" }`.

```js
// one record
{
  day: 0..DAYS-1,
  date: ISOString,
  esp: "gmail" | "outlook",
  sends: int,            // ~250–400/day
  complaints: int,       // small integers — this is why smoothing matters
  hardBounces: int,
  deferrals: int,        // 4xx soft failures / throttling — LEADING signal
  replies: int,          // engagement — LEADING signal
  postmasterTier: "high"|"medium"|"low"|"bad",  // LAGGING (provider-side)
  seedPlacementPct: 0..100,                       // inbox-placement test
  warmupPlacementPct: 0..100                      // "what the old dashboard sees" proxy (lagging)
}
```

### Scenario timeline (the story the generator must tell)

Two scenarios via one switch: `"critical"` (default) and `"healthy"`.

**`critical` — Gmail decays, Outlook stays fine:**

| Phase (Gmail) | Days | What moves |
|---|---|---|
| Stable | 0–~10 | complaints ~0.03%, replies normal, deferrals low, **leading + lagging both green**; health ≈ 95–100 (HEALTHY) |
| Early drift (LEADING) | ~10–~18 | reply rate sags first; deferrals creep up; complaints inch up; **lagging dashboard still green**; health drifts down but stays above the watch line |
| Acceleration | ~18–~27 | smoothed complaint rate climbs through 0.10% then toward 0.30%; **seed-list placement (LEADING) starts dropping**; health drops **below** the watch line (Sentinel **warns**) and falls through WATCH into DANGER |
| Cliff / today | ~27–29 | smoothed rate ≈/over 0.30%; health ≈ 20–30 (deep in DANGER), `daysToThreshold` ≈ 3–6 |

> **The lagging "today's dashboard" inputs stay green for the whole visible window.** `warmupPlacementPct` and `postmasterTier` (both LAGGING) hold at their healthy values (≈97% / `high`) across days 0–`today` in **both** scenarios; their decline is implied only *after* "today" (off-chart, hinted by the dashed projection). Only **LEADING** signals move the health score during the critical run — complaint level + slope, reply-rate drop, deferral creep, and seed-list placement. This is what keeps the green strip flatly reassuring while the health line falls into danger (§0.1, §5.5).

**Outlook (both scenarios) and Gmail (`healthy` scenario):** stays stable/green throughout (health ≈ 95–100, never drops below the watch line).

> Tune generator parameters until the §10 acceptance criteria are met — the exact noise levels are yours to set, but the *shape* above is mandatory.

---

## 5. Engine functions

### 5.1 Seeded RNG (reference implementation)

```js
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

### 5.2 Beta-Binomial smoothed complaint rate (reference implementation)

Smooths the noisy daily rate using a trailing window plus a healthy-baseline prior, and returns a credible band. Uses a **normal approximation** to the Beta posterior — exact and dependency-free is unnecessary because `α+β` is in the thousands.

```js
// windowSends / windowComplaints: arrays for the trailing W days (default W=7)
// prior: { a0, b0 } encoding the baseline. Default a0=0.6, b0=1200 (~0.05% baseline, moderate strength)
function betaBinomialSmooth(windowSends, windowComplaints, prior = { a0: 0.6, b0: 1200 }) {
  const S = windowSends.reduce((x, y) => x + y, 0);
  const C = windowComplaints.reduce((x, y) => x + y, 0);
  const a = prior.a0 + C;
  const b = prior.b0 + Math.max(0, S - C);
  const mean = a / (a + b);
  const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
  const sd = Math.sqrt(variance);
  const z = 1.645; // ~90% credible interval
  return {
    mean,                                   // smoothed rate (proportion, e.g. 0.0017 = 0.17%)
    ciLower: Math.max(0, mean - z * sd),
    ciUpper: mean + z * sd
  };
}
```

Compute this for **each day** (trailing window ending that day) to get a smoothed series per ESP. Prior strength (`b0`) is the smoothing knob: larger ⇒ smoother/slower. Tune so the smoothed line ignores single-complaint spikes but crosses 0.10% several days before the dashboard reacts.

### 5.3 Slope projection (reference implementation)

Least-squares slope on the **smoothed** mean series (never raw), over a trailing window, extrapolated to the 0.30% cliff.

```js
function leastSquaresSlope(ys) {            // ys = smoothed means, evenly spaced (1/day)
  const n = ys.length, xs = ys.map((_, i) => i);
  const mx = (n - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return num / den;                         // rise per day (proportion/day)
}

function daysToThreshold(currentMean, slopePerDay, cliff = 0.003) {
  if (slopePerDay <= 0) return Infinity;
  return (cliff - currentMean) / slopePerDay;
}
```

Window default 10 days. Return `{ slopePerDay, daysToThreshold }`. Treat `daysToThreshold` as directional ("act now"), not exact.

### 5.4 Per-ESP health score (0–100)

Each sub-score is 0–100 (100 = healthy); combine by weight. Reference normalizers (clamp to [0,100]):

| Signal | Sub-score (100→0 maps to) | Weight |
|---|---|---|
| Smoothed complaint **ciUpper** | 0.05% → 0.30% | 0.28 |
| Slope → `daysToThreshold` | ≥30d (or slope≤0) → 3d | 0.22 |
| Deferral rate | 0% → 8% | 0.16 |
| Reply trend (drop vs baseline) | 0% drop → 40% drop | 0.12 |
| Postmaster tier | high=100, medium=55, low=20, bad=0 | 0.10 |
| Hard-bounce rate | 0% → 5% | 0.06 |
| Seed placement | 100% → 40% | 0.06 |

```js
score = Math.round(Σ weight_i * subscore_i);   // 0..100
tier  = score>=80 ? "healthy" : score>=60 ? "watch" : score>=40 ? "warn" : "critical";
```

### 5.5 "Today's dashboard" proxy score (the flat green strip)

Deliberately built from **lagging signals only**, so it stays high the whole time:

```js
dashboardScore = Math.round(0.6 * normalize(warmupPlacementPct, 100, 60)
                          + 0.4 * postmasterSubScore);
```

Because its lagging inputs hold green across the visible window (§4 note), this score is a **flat ≈ 94–97 the entire run** in both scenarios — it never dips on-screen. It is **not** a line on the hero chart; it renders as a **separate flat strip** ("TODAY'S DASHBOARD · Sequencer health score — flat all month, sees nothing wrong · 96/100 ✓ all green"), with a flat sparkline. The strip number is `dashboardScore` at `today`. The render layer still tracks `dashDropDay` (first day the proxy would fall < 80) for the lead-time math; when it never dips in-window it is pinned to `today` (§5.8). This green-while-Sentinel-screams contrast IS the product story (§0.1).

### 5.6 Failover state machine + standby pool

Per ESP, derive a state from score + projection:

```
Healthy   : score >= 80
Watch     : 60–79  OR ciUpper crosses 0.10%
Throttle  : 40–59  OR daysToThreshold <= 7
Failover  : score < 40  OR daysToThreshold <= 3  OR ciUpper >= 0.30%
Cooldown  : entered after Failover; remains until 7 consecutive clean days (synthetic flag) → Healthy
```

Standby pool: a static list of 3 pre-warmed backup domains, each with per-ESP health (all green). On `Failover`, the engine emits a routing action: e.g. `"Route Gmail traffic → standby-02 (Gmail health 96)"`.

### 5.7 Alert builder

Scan the per-ESP state/projection at the `today` index and emit alert objects `{ severity: "red"|"amber"|"green", ts, headline, action }`. In `critical`, reproduce the three spec alerts (Gmail projected-cliff red w/ "Throttle + fail over"; reply-decay amber; a green "cleared" example). In `healthy`, emit only calm/green rows.

### 5.8 Orchestrator

```js
function runEngine({ scenario = "critical", seed = 42, days = 30, today = days - 1 }) → ViewModel
```

Generates data, computes all series and scores, derives states/alerts, and builds the hero **health series + lead-time** annotation, returning a single `ViewModel`.

The hero lead-time block (constants: `WATCH_HEALTH = 80`, `DANGER_HEALTH = 40`, `PROJ_DAYS = 5`):

```js
const healthSeries = gmailScores.map(s => s.score);          // observed, days 0..days-1; 100 = healthy, down = danger
// forward projection from the recent health slope, clamped to [0,100]
const projLo = Math.max(0, today - (SLOPE_WINDOW - 1));
const healthSlope = leastSquaresSlope(healthSeries.slice(projLo, today + 1));   // negative (declining)
const healthProjSeries = [];
for (let k = 1; k <= PROJ_DAYS; k++)
  healthProjSeries.push(clamp(Math.round(healthSeries[today] + healthSlope * k), 0, 100));

let crossWatchDay = healthSeries.findIndex(v => v < WATCH_HEALTH);   // Sentinel "warns"
let dashDropDay   = dashboardSeries.findIndex(v => v < 80);          // lagging tools react
if (crossWatchDay < 0) crossWatchDay = today;
if (dashDropDay  < 0) dashDropDay  = today;   // proxy never dips in-window → pin to today
const warningGainedDays = Math.max(0, dashDropDay - crossWatchDay);
```

- `crossWatchDay` = the first day the **health** line drops **below** the watch line (first day health < 80). The marker sits **on** the amber line.
- `dashDropDay` = first day the lagging proxy would fall below 80. In the demo the proxy stays green all window (§5.5), so this **pins to `today`**, making the band span `crossWatchDay → today` and `warningGainedDays = today − crossWatchDay` (≈ 10 at the default seed). The §10.3 acceptance (`N ≥ 7`) holds.
- The render layer draws `healthSeries` **solid** for days `0..today` and `healthProjSeries` **dashed** for `today+1..today+PROJ_DAYS`, joined at the `today` point.
- **Degenerate (calm) case:** when `warningGainedDays === 0` (healthy scenario — health never drops below the watch line), render **omits** the band, the band caption, the "Sentinel warned" ring and its label, and the "reply rates now dropping" label; only a plain grey "today" dot remains and the badge reads "✓ all clear · no early warning needed." (Prevents the two markers/labels from colliding at the same x.)

---

## 6. (reserved)

## 7. (reserved)

## 8. ViewModel contract (engine ⇄ render boundary)

```js
ViewModel = {
  meta: { account: "Acme Agency", domainCount: 84, lastSyncedMin: 4, scenario, seed },
  globalStatus: { level: "red"|"amber"|"green", text: "2 domains critical" },

  leadTime: {
    healthSeries:    number[],      // hero indigo line, observed days 0..today; 0–100, DOWN = danger (= gmail health)
    healthProjSeries:number[],      // projected health for the projDays after today (dashed continuation)
    projDays:        number,        // forward-projection length (default 5)
    dashboardSeries: number[],      // lagging proxy per day (flat ≈94–97 green) — drives the strip sparkline, NOT a hero line
    dashboardScore:  number,        // dashboardSeries[today] — the strip's big number
    watchHealth:     number,        // amber watch line on the health axis (80) = HEALTHY→WATCH boundary
    dangerHealth:    number,        // red cliff line on the health axis (40)  = WATCH→DANGER boundary
    warningGainedDays: number,      // computed (= dashDropDay - crossWatchDay), not hardcoded
    crossWatchDay: number,          // Sentinel warned (health first < watchHealth)
    dashDropDay: number             // lagging tools react (pinned to today when the proxy never dips in-window)
  },

  esp: {
    gmail:   EspCard,
    outlook: EspCard
  },

  alerts: Alert[],

  failover: {
    stages: ["Healthy","Watch","Throttle","Failover","Cooldown"],
    current: { domain: "acme-outreach-03.com", esp: "gmail", stage: "Failover" },
    standby: [{ domain, gmailHealth, outlookHealth }]
  },

  domains: DomainRow[],             // table

  detail: {                         // Screen 2 (focal domain, gmail)
    rawSeries: number[],            // raw daily complaint % (jagged)
    smoothedSeries: number[],       // smoothed mean %
    ciUpperSeries: number[], ciLowerSeries: number[],
    crossWatchDay: number,          // marker
    signals: [{ name, value, weight, kind: "leading"|"lagging", subscore }],
    recommendedAction: string
  }
}

EspCard = {
  score: 0..100, tier, ringColor,
  smoothedRatePct: "0.21%", ciUpperPct: "0.27%",
  rateBarPos: 0..1,                 // position between 0.10% and 0.30% for the inline bar
  projection: "→ 0.30% cliff in ~5 days" | "stable",
  spark: number[]                   // last 14 smoothed means
}
```

---

## 9. UI binding (render.js)

`render(viewModel)` writes into these required `id` hooks in the rebuilt `index.html` (add them while cloning the Hi-Fi):

- Top bar: `#status-pill`, `#last-synced`, `#account-name`
- Hero lead-time: chart SVG `#leadtime-chart`; flat strip `#dash-strip-score`, `#dash-strip-tag`, `#dash-strip-spark`; warning badge `#warn-badge`
- Gmail card: `#gmail-score`, `#gmail-ring`, `#gmail-rate`, `#gmail-ci`, `#gmail-rate-bar`, `#gmail-projection`, `#gmail-spark`
- Outlook card: same with `#outlook-…`
- Alerts: `#alert-feed` (render rows)
- Failover: `#failover-stages` (5 pills; highlight `current`), `#failover-current`, `#standby-pool`
- Domains table: `#domains-tbody`
- Detail: `#raw-smoothed-chart`, `#signal-breakdown`, `#recommended-action`
- Controls: `#scenario-toggle` (healthy/critical), `#seed-input`, `#sim-label`

### SVG chart helper (in render.js)

```js
renderLineChart(svgEl, {
  xDomain:[x0, x1], yDomain:[ymin, ymax], pad:{l,r,t,b},
  series:[{ points:[[x,y]...], color, width, glow?, opacity?, dash? }],  // dash → projected segment
  bands:[{ fromY, toY, color, opacity? }] | { fromX, toX, color },       // y-range zones / CI band, or x-range warning band
  zoneLabels:[{ x?, y, label, color, anchor?, size? }],                  // SAFE/WATCH/DANGER + the band caption
  hlines:[{ y, color, dash, width?, opacity?, label? }],                 // reference lines (health axis: watch=80/cliff=40; rate axis: 0.10%/0.30%)
  vlines:[{ x, color, dash, opacity? }],                                 // crossWatchDay / today guides
  ciBand:{ upper:[[x,y]...], lower:[[x,y]...], color, opacity },         // Screen-2 confidence band
  yTicks:[{ y, label }], xTicks:[{ x, label, anchor? }], yTitle:"Health score",
  markers:[{ x, y, color, r?, fill?, strokeWidth?, label?, labelColor?, labelAnchor?, labelDy? }]
  // marker fill omitted → open ring (Sentinel warned); fill set → solid dot (grey "today")
})
```
Map data→pixels linearly: `px = padL + (x-x0)/(x1-x0)*plotW`, `py = padT + (1-(y-y0)/(y1-y0))*plotH`. Build `<path>`/`<polyline>` strings; set them via `setAttribute`. No chart library.

**Hero health chart wiring** (the money shot — keep all of this in the React build):
- `xDomain:[0, today + projDays]`, `yDomain:[0, 100]`, `yTitle:"Health score"`, x ticks `30d ago / today / +5d`.
- Three zone `bands` by **y-range**: HEALTHY `[watchHealth,100]` green, WATCH `[dangerHealth,watchHealth]` amber, DANGER `[0,dangerHealth]` red — plus the warning `band` by **x-range** `[crossWatchDay, dashDropDay]` (only when `warningGainedDays>0`).
- `hlines` at `watchHealth` (amber, label "watch") and `dangerHealth` (red, label "cliff").
- Two `series`: `healthSeries` solid w/ glow, then the projected `[ [today,health[today]], …healthProjSeries ]` dashed at lower opacity.
- `markers`: open indigo ring at `(crossWatchDay, health[crossWatchDay])` labelled "▲ Sentinel warned · {today−crossWatchDay}d ago"; solid grey dot at `(today, health[today])` labelled "▲ reply rates now dropping". Both labels suppressed in the calm case (§5.8).
- Legend (static in markup): "Sentinel health score · 0–100 smoothed · **down = danger**". Badge `#warn-badge`: "◀ ≈ {warningGainedDays} days of warning gained ▶".

### Controls behavior
- `#scenario-toggle` flips `critical`⇄`healthy`, re-runs `runEngine`, re-renders.
- `#seed-input` re-runs `runEngine` on `change`/Enter with the new seed (lets him reshuffle noise on camera; the same seed always reproduces an identical render, proving determinism). No separate "replay" control — a deterministic re-render with an unchanged seed has no visible effect, so it was removed to avoid a dead-looking button.

---

## 10. Definition of done (self-verifiable acceptance criteria)

1. Opens as a static file (double-click / Netlify) with **no console errors and zero network requests**.
2. Default load = `critical`, fixed seed. Same seed ⇒ pixel-identical render.
3. **Hero health chart** (§0.1): Y axis is a 0–100 **Health score**, `down = danger`, on the **same scale as the ESP gauges** (the line's `today` endpoint equals the Gmail card score). The indigo line **falls** from HEALTHY, crosses **below** the amber watch line (health 80) at the open "Sentinel warned" ring, drops through WATCH into DANGER, ends ≈ 20–30 at `today` (grey dot), then a **dashed +5d projection** continues toward the floor. The lagging "today's dashboard" metric is a **separate flat strip** at ≈ 94–97 (✓ all green), never a second line on the hero. A shaded "≈N days of warning gained" band spans `crossWatchDay`→`dashDropDay`, with **N computed ≥ 7**. Reference lines: amber "watch" (health 80) and red "cliff" (health 40).
4. **Gmail card**: red tier, score < 40, smoothed rate shown ~0.17–0.25%, projection reads "~3–6 days to 0.30% cliff". **Outlook card**: green, score ≥ 80, "stable".
5. **Detail raw-vs-smoothed**: raw line visibly jagged with spikes past 0.30%; smoothed line smooth with a CI band; a marker sits where smoothed crosses 0.10%; 0.10% (amber) and 0.30% (red) guide lines present.
6. **Toggle → healthy**: both gauges green, no red alerts, failover panel at `Healthy`, no cliff projection.
7. Numbers render in IBM Plex Mono; overall look matches the Hi-Fi (dark, accent `#818cf8`).
8. A persistent label states the data is simulated (§11).

---

## 11. Honesty label (required)

Visible footer/badge, always shown:
> `Simulated data. In production, leading signals come from sending.ac's own MTA accounting-webhook telemetry (bounces, deferrals, 4xx/5xx provider codes); confirmation from Google Postmaster + Microsoft SNDS.`

---

## 12. Non-goals (do NOT build today)

- No backend, real APIs, auth, billing, persistence, or multi-account admin.
- Do **not** implement an exact incomplete-Beta inverse — the normal approximation in §5.2 is the intended method.
- Do **not** wire live Postmaster/SNDS/MTA data — synthetic only.
- Do **not** edit the original Claude Design canvas file — rebuild clean per §1.
- Keep Screen 2 (domain detail) to the three elements in `ViewModel.detail`; deeper drill-downs are v1.

---

## 13. Suggested build order (for the agent)

1. Scaffold `index.html` as a static visual clone of the Hi-Fi with all §9 `id` hooks (no logic yet).
2. Implement `engine.js` (§5) + `runEngine` → log a `ViewModel` to console; tune generator to pass §10.4–10.5 numerically.
3. Implement `render.js` (§9) incl. the SVG helper; bind the two cards + lead-time chart first (the money shot).
4. Add alerts, failover panel, domains table, then Screen 2 detail.
5. Wire controls; verify all §10 criteria; add the §11 label; write `README.md`.
6. Deploy to Netlify Drop / Vercel; put the live URL in the README.
