# CONTEXT — dEWSentinel shared language

> Decoder for the project's domain vocabulary, so code, tests, and conversation all
> use the same words for the same things. **This is not the spec.** The authoritative
> behaviour lives in [`spec/ENGINE_SPEC.md`](./spec/ENGINE_SPEC.md) (engine + ViewModel)
> and [`spec/HANDOFF_SPEC.md`](./spec/HANDOFF_SPEC.md) (UI). When this file and a spec
> disagree, the spec wins — then fix this file.

## What it is, in one breath

dEWSentinel is a **deliverability early-warning console** for a cold-email
infrastructure company. A sending domain's reputation decays silently for weeks; the
old dashboard stays green because it watches **lagging** metrics. dEWSentinel watches
**leading** signals, scores health **per inbox provider**, projects the trend to the
complaint **cliff**, and drives an automatic **failover** playbook. Tagline: *"We see
the dip before your reply rates do."*

The POC computes everything from **synthetic** data (no backend); the engine and
visuals are real, the data is simulated.

## The rule that governs everything: ONE score, ONE direction

There is a **single 0–100 health score** across the entire console — the hero line, the
per-ESP gauges, the domains table, and the Screen-2 header are all the **same number**.

```
100 = healthy (top / green)   ·   0 = danger (bottom / red)   ·   DOWN = danger
```

- The hero's **"today" endpoint equals the Gmail card's score** — hero and cards always
  agree, by construction.
- **There is no "risk" number anywhere in the UI.** "Risk" is the *product framing*
  (what we detect); every gauge and the hero line are **health**. Never render a risk
  value next to a health value.
- This reversed an earlier design (see Decisions): the hero used to be a *risk* axis
  rising into danger — **that is now rejected.** If you see `riskSeries` / `watchRisk` /
  `up = danger` anywhere, it is stale.

## Ubiquitous language

### Core domain

| Term | Meaning |
|---|---|
| **ESP / inbox provider** | The *receiving* mailbox provider — **Gmail (Google)** or **Outlook (Microsoft)**. Reputations decay **independently**, so nearly everything is scored and shown split by provider. (Note: "ESP" here = the inbox side, not the sending platform.) |
| **Sending domain / focal domain** | The customer domain being monitored (e.g. `acme-outreach-03.com`). |
| **Complaint rate** | spam complaints ÷ sends. The regulated metric. Tiny and noisy at cold-email volume (~3 complaints / 1,000 sends crosses the line). |
| **Watch line** | Health **80** on the hero (= "leaving healthy", where Sentinel *warns*). On rate charts the matching line is the **0.10%** complaint rate. |
| **Cliff** | Health **40** on the hero (= "critical"). On rate charts the matching line is the **0.30%** complaint rate — the hard limit you must never reach. |
| **Leading signal** | Moves *before* the complaint rate does: complaint-rate **slope**, **reply trend** drop, **deferrals** (4xx soft failures), **seed-list placement** drop. This is Sentinel's edge. |
| **Lagging signal** | Confirms only *after* damage is done: smoothed complaint **level**, **Postmaster tier**, **warmup placement**, **hard bounces**. |
| **Today's dashboard / dashboard proxy / sequencer health** | The "old tool" — a deliberately **lagging-only** score that stays a flat green ≈94–97 the whole visible window (shown as **96/100 ✓ all green**). Rendered as a separate flat strip, **never** a line on the hero. The green-while-Sentinel-screams contrast *is* the product story. |
| **Lead time / warning gained** | Days of advance warning = how long before the lagging tools react that Sentinel's health crossed below the watch line (`warningGainedDays`). |
| **Standby pool** | Three pre-warmed backup domains kept hot (warmed per ESP); failover re-routes an at-risk provider's traffic to one of them. |

### Engine / statistics

| Term | Meaning |
|---|---|
| **Smoothed complaint rate** | Beta-Binomial posterior **mean** over a trailing window + healthy-baseline prior. Stable enough to act on; ignores single-complaint spikes. Normal approximation to the Beta (not an exact incomplete-beta inverse — see Decisions). |
| **Credible band (`ciLower` / `ciUpper`)** | ~90% interval around the smoothed mean. **Alerts fire on `ciUpper`** (the band's upper edge), so warnings come early, not after the spike. |
| **Prior (`a0`, `b0`)** | Encodes the healthy baseline; **`b0` is the smoothing knob** (larger ⇒ smoother/slower). Defaults `a0=0.6`, `b0=1200`. |
| **Window (`W`)** | Trailing days fed into the smoother (default 7). |
| **Slope (`slopePerDay`)** | Least-squares slope on the **smoothed** series (never raw), default window 10 days. |
| **`daysToThreshold`** | Projected days until the smoothed rate reaches the 0.30% cliff. **Directional ("act now"), not exact.** |
| **Health score** | Per-ESP **0–100, higher = better**; weighted blend of seven sub-scores (§5.4). The one and only score lens — gauges, table, Screen-2 header, and the hero line. |
| **Tier** | `healthy` (≥80) · `watch` (60–79) · `warn` (40–59) · `critical` (<40). |
| **Health zones (hero)** | Top→bottom: **HEALTHY** (>80, green) · **WATCH** (40–80, amber) · **DANGER** (<40, red). The line **falls** from HEALTHY into DANGER. |
| **Failover stage** | The per-domain state machine: `Healthy → Watch → Throttle → Failover → Cooldown`. Cooldown holds until **7 consecutive clean days**. |
| **Alert** | `{severity: "red"/"amber"/"green", ts, headline, action }` , built from per-ESP state at `today`. |
| **`crossWatchDay`** | First day health drops **below** the watch line (health < 80) — "Sentinel warned." The hero marker sits on the amber line. |
| **`dashDropDay`** | First day the lagging proxy would fall below 80. In-demo the proxy never dips, so it **pins to `today`**. |
| **`warningGainedDays`** | `dashDropDay − crossWatchDay` (≈10 at the default seed). **Computed, never hardcoded.** |
| **Scenario** | `"critical"` (default — Gmail decays, Outlook fine) or `"healthy"` (all green). |
| **Seed** | Integer feeding the seeded RNG. **Same seed ⇒ identical output** (determinism is a hard requirement, not a nicety). |
| **`today`** | Index of "now" in the series (default `days − 1`); the projection extends `PROJ_DAYS` (5) past it as a dashed tail declining toward the floor. |
| **`runEngine({scenario, seed, days, today})`** | The orchestrator: generates data → smooths → projects → scores → derives states/alerts → returns one **ViewModel**. |
| **ViewModel** | The single contract where engine and render meet (§8). Every displayed number is derived here; nothing in render is hardcoded. |

### ViewModel field names (current — health model)

The hero block (`leadTime`) and its constants use **health**, not risk:

| Field / constant | Meaning |
|---|---|
| `healthSeries: number[]` | Hero line, observed days `0..today`; 0–100, **down = danger** (= Gmail health). |
| `healthProjSeries: number[]` | Projected health for `projDays` after today (dashed continuation, declining). |
| `dashboardSeries` / `dashboardScore` | Flat lagging-proxy series (≈94–97) + its `today` value (the strip's big number). |
| `watchHealth = 80` | Amber watch line on the health axis (HEALTHY→WATCH boundary). |
| `dangerHealth = 40` | Red cliff line on the health axis (WATCH→DANGER boundary). |
| `crossWatchDay` / `dashDropDay` / `warningGainedDays` | Lead-time annotation (see glossary). |

## Invariants (true everywhere — good sources of test names)

- **One health score, one direction.** Hero, gauges, table, and Screen-2 header all show
  the same 0–100 health (higher = better, down = danger). The hero's `today` endpoint
  **equals** the Gmail card's score. Never introduce a separate risk number.
- **Clean boundary:** the engine has **zero DOM**; the render/UI layer has **zero
  logic**; they meet **only** at the ViewModel. Test the engine through `runEngine`'s
  ViewModel, not internals.
- **Determinism:** same `seed` ⇒ identical ViewModel ⇒ identical render.
- **Slope is computed on the smoothed series, never raw.**
- **Alerts fire on `ciUpper`, not the mean.**
- **Only leading signals move during the critical run.** Lagging inputs
  (`warmupPlacementPct`, `postmasterTier`) stay green across the whole visible window in
  *both* scenarios — that's why the dashboard strip stays flat while health falls.
- **No persistence, no network.** Client-side only; no `localStorage`/`sessionStorage`.
- **Calm case is degenerate, not an error:** when `warningGainedDays === 0` (healthy),
  the warning band, "Sentinel warned" ring, and decay labels are **omitted**, not drawn
  at zero width; the badge reads "✓ all clear · no early warning needed."

## Decisions already made (respect, don't relitigate)

- **The hero is a single HEALTH line that FALLS into danger** (down = danger), on the
  **same 0–100 scale as the per-ESP gauges**. Two alternatives were rejected:
  **(a)** overlaying two lines on one Y axis (different units, opposite directions);
  **(b)** an inverted **risk** axis (a line *rising* into danger) — rejected because a
  risk number (up = bad) sitting next to the health gauges (up = good) showed two
  inverted numbers for the same domain and read as a contradiction.
- **Normal approximation to the Beta posterior** is the intended smoother — do *not*
  implement an exact incomplete-beta inverse.
- **Fresh rebuild**, not injection into the Claude Design canvas export
  (`<x-dc>`/`support.js`); that file is a visual reference only.
- **No "replay" control** — a deterministic re-render with an unchanged seed is a no-op,
  so a replay button would look dead.

## Writing tests in this language

Name tests after **observable behaviour in domain terms**, not implementation. The
ViewModel is the public interface — assert through it.

Good:
- `critical scenario: Gmail health drops below the watch line before the dashboard would`
- `hero "today" endpoint equals the Gmail card score`
- `smoothed rate ignores a single-complaint spike`
- `Gmail enters Failover when ciUpper reaches the 0.30% cliff`
- `daysToThreshold returns Infinity when the slope is flat or falling`
- `healthy scenario keeps both ESPs above the watch line (health never drops below 80)`
- `same seed produces an identical ViewModel`

Avoid: tests that name private functions, assert on intermediate arrays the ViewModel
doesn't expose, hardcode magic numbers the engine derives, or reference a "risk" score.
