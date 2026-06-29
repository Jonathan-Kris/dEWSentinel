# Handoff: Sentinel — Deliverability Early-Warning Console

## Overview

Sentinel is an observability dashboard for a cold-email **infrastructure** company. Customers run outbound campaigns; over 2–3 months sender reputation silently decays until mail gets filtered as spam — and by the time reply rates drop, the damage is done. Today's tools show a misleading "all green" dashboard because they rely on **lagging** metrics. Sentinel's job is to detect decay **early** using leading indicators, warn before the cliff, and auto-trigger a backup plan.

The product positioning is **"We see the dip before your reply rates do."** Gmail (Google) and Outlook (Microsoft) reputation decay **independently**, so nearly everything is shown split by provider.

This handoff covers two screens:

1. **The Console** (primary dashboard) — Layout A, dark theme.
2. **Domain detail** (drill-down) — opened from a domain row.

The UI must tell a 3-beat story top-to-bottom: **(1)** here's what today's dashboard can't see → **(2)** here's our early warning firing days ahead → **(3)** here's the automatic backup plan already in motion.

---

## About the Design Files

The files in [product_design](../product_design/) are **design references authored in HTML** (a Design-Component format that renders standalone in a browser). They are prototypes that show the intended **look, layout, and behavior** — they are **not** production code to copy directly.

Your task is to **recreate these designs in the target codebase's** (React, Vue, Svelte, etc.), using its established component library, styling system, charting library, and conventions. If no environment exists yet, pick the most appropriate stack — for the data-dense, chart-heavy nature of this product, **React + TypeScript** with a charting library (**Recharts**, **visx**, or **ECharts**) and a utility/token styling approach is a sensible default.

The HTML charts are hand-drawn SVG for mockup fidelity. **Do not port the raw SVG** — rebuild the charts with a real charting library driven by data. The SVG is the visual spec (axes, zones, threshold lines, annotations), not the implementation.

`support.js` is the runtime for the HTML prototype format only. **Ignore it for implementation** — it is included solely so the `.dc.html` files open and render in a browser for reference.

---

## Fidelity

**High-fidelity (hifi).** `Sentinel Console — Hi-fi.dc.html` is the source of truth: final dark theme, colors, typography, spacing, and chart treatments. Recreate it pixel-faithfully using the codebase's libraries.

`Sentinel Wireframes.dc.html` is a **lo-fi** companion (light greyscale) included only for context — it shows three layout explorations (A/B/C), the calm "all-healthy" variant, and the chart-direction brainstorm that led to the final chart model. **Build from the hi-fi file**; use the wireframe only to understand alternatives and rationale.

---

## The chart model (most important design decision — read first)

Two earlier iterations were rejected: **(a)** overlaying two lines on one Y axis (different units, opposite directions), and **(b)** an inverted **risk** axis (line *rising* into danger) — rejected because a *risk* number (up = bad) sitting next to the per-ESP **health** gauges (up = good) showed two inverted 0–100 numbers for the same domain and read as a contradiction. The final, agreed model:

- **The hero is a single HEALTH line that FALLS into danger.** The hero's Y axis is a **0–100 Health score**, `100 = healthy` at the top, `0 = danger` at the bottom — the **same scale as the per-ESP gauges**, so the hero and the cards always agree (the line's "today" endpoint equals the Gmail card's score). The line **declines** into a red zone. `down = danger`.
- **The lagging "today's dashboard" metric is shown separately** as a flat reassuring strip ("Sequencer health 96/100 ✓ all green"), NOT as a second line fighting the same axis. It stays green the whole visible window.
- **Hero reference lines** are on the 0–100 health axis: **amber "watch" at health 80**, **red "cliff" at health 40**. (Rate charts carry their own **0.10% / 0.30%** complaint-rate lines — see below.)
- The drama is the **gap**: Sentinel's health crosses **below** the watch line ~N days before today's tools react. A shaded vertical band labeled **"≈ N days of warning gained"** spans that gap, with an open ring where Sentinel warned and a grey "today" dot. A short **dashed +5d projection** extends the line past today toward the floor.
- One score concept everywhere: the hero line, the ESP gauges, the table, and the Screen-2 header are all the **same 0–100 health score** (higher = better). "Risk" is the product framing (what we detect); the numbers are health.

---

## Screens / Views

### Screen 1 — The Console (Layout A)

**Purpose:** At-a-glance answer to _"is anything about to break, and what do I do about it?"_ for an operator managing dozens-to-hundreds of sending domains.

**Layout:**

- Outermost card: `background #0c0e14`, `border 1px solid #20242f`, `border-radius 14px`, big ambient shadow `0 24px 60px rgba(0,0,0,.45)`.
- **Top bar** (full width): horizontal flex, `padding 14px 20px`, bottom border `1px solid #1b1f29`, subtle vertical gradient `#11141c → #0e1118`.
- **Body**: horizontal flex split into:
  - **Main column** — `flex: 1`, `padding 20px`, vertical flex `gap 18px`. Contains Zones A, B, D, E top-to-bottom.
  - **Alert rail (Zone C)** — fixed `width 340px`, left border `1px solid #1b1f29`, `background #0a0c11`, `padding 18px 16px`. Toggleable (see Tweaks); when hidden, the main column reflows to full width.

**Top bar components:**

- **Wordmark** "Sentinel" — 16px/700, color `#f2f3f7`. Logo mark: 18×18 rounded square (`radius 5px`) in the accent color with a glow and a small `#0c0e14` dot punched out of the center.
- Vertical divider `1px × 22px`, `#262b37`.
- **Account selector** — pill, `min-width 280px`, `padding 8px 13px`, `border 1px solid #262b37`, `radius 9px`, `background #11141c`. Text: `Acme Agency` (mono, `#f2f3f7`) + `— 84 domains` (`#6a7080`), trailing ▾.
- Spacer (`flex: 1`).
- **Critical status pill** — `padding 7px 13px`, `radius 999px`, `background rgba(239,68,68,.12)`, `border 1px solid rgba(239,68,68,.4)`, text `#fca5a5` 13px/600. Leading 8px red dot that **blinks** (opacity 1 → .35 → 1, 1.6s ease-in-out infinite). Copy: "2 domains critical".
- **Last-synced** — mono 12px, `#6a7080`: "last synced 4 min ago".

#### Zone A — Lead-time view (hero, largest element)

- Panel: `border 1px solid #20242f`, `radius 12px`, vertical gradient `#10131b → #0d1016`, `padding 18px 20px`.
- Header: title "Lead-time view" 15px/600 `#f2f3f7` + ` · Gmail · acme-outreach-03.com` in `#6a7080`. Subtitle "We see the dip before your reply rates do." 12.5px `#8a90a0`. Right: "last 30 days" 12.5px `#6a7080`.
- **Today's-dashboard strip:** full-width row, `padding 10px 14px`, `border 1px solid #1d2a22`, `radius 9px`, `background rgba(34,197,94,.05)`. Left: uppercase label "TODAY'S DASHBOARD" 10px/600 `#6a7080`; a flat green sparkline (`#34d399`); "Sequencer health score — flat all month, sees nothing wrong" 12px `#8a90a0`; right: mono "98/100" (98 in `#4ade80` 17px/600, /100 in `#6a7080`) and a "✓ all green" pill (`background rgba(34,197,94,.13)`, `#4ade80`, `radius 999px`).
- **The chart** (rebuild with charting lib):
  - Y axis: Health score, ticks `0 / 50 / 100` (bottom→top), mono 9px `#5a6070`. Rotated axis title "Health score" `#6a7080`.
  - **Zone bands** (full plot width), top→bottom: HEALTHY `rgba(34,197,94,.08)` labeled `#4ade80`; WATCH `rgba(245,158,11,.09)` labeled `#fbbf24`; DANGER `rgba(239,68,68,.11)` labeled `#f87171`. Zone labels 10.5px/600, top-left inside each band.
  - **Reference lines**: amber dashed "watch" at health 80; red dashed "cliff" at health 40.
  - **Sentinel health line**: smooth, accent color (`var(--accent)`, default `#818cf8`), `stroke-width 3`, with a wider same-color underlay at `opacity .18` for glow. Starts high-left (~health 97, in HEALTHY), **falls** to low-right (~health 27, in DANGER). X spans `30d ago → today → +5d` (dashed projected tail declining toward the floor).
  - **Warning-gap band**: vertical shaded band in `var(--accent-soft)` from the point Sentinel's health crosses **below** the watch line to "today". Left edge = dashed accent vertical; right edge = dashed `#6a7080` vertical ("today").
  - **Markers**: hollow accent circle where the line crosses **below** the watch line, labeled "▲ Sentinel warned · ~10d ago" (`#a5b4fc`); grey filled circle at "today", labeled "▲ reply rates now dropping" (`#8a90a0`).
  - X axis labels mono 9px `#5a6070`: "30d ago", "today", "+5d".
- Footer row: legend swatch (accent) + "Sentinel real risk score · 0–100 smoothed · up = danger"; right: a pill "◀ 12 days of warning gained ▶" (`background var(--accent-soft)`, `border 1px solid rgba(129,140,248,.4)`, `#a5b4fc` 12px/600).

#### Zone B — Per-ESP health cards

Two equal cards in a `1fr 1fr` grid, `gap 18px`. Each: `border 1px solid #20242f`, `radius 12px`, `background #10131b`, `padding 16px 17px`.

Per card:

- Header: provider dot (Gmail `#ea4335`, Outlook `#0078d4`, 9×9 `radius 2px`) + name 13.5px/600 `#f2f3f7`; right: state pill.
- **Gauge ring** (86×86 SVG): track `#1e2330` `stroke-width 9`; value arc colored, rounded caps, starts at 12 o'clock (`rotate(-90)`). Center: score mono 22px/600 `#f2f3f7` + "/100" mono 9.5px `#6a7080`.
- **Smoothed complaint rate**: label 11px `#8a90a0`; value mono 20px/600 `#f2f3f7`. Position bar: track `#1e2330` 7px `radius 4px`; fill width = position between 0 and 0.30% cliff; amber tick at the 0.10% mark (`left 33%`), red tick at the right end. Below: mono 9px `0.10 watch` / `0.30 cliff`.
- **Projection chip + sparkline** row: chip (red `→ crosses 0.30% cliff in ~5 days` / green `stable`); 14-day sparkline at right.

Sample data:

- **Gmail · Google** — score **38/100** (red arc `#ef4444`), rate **0.21%** (fill ~70%, gradient `#fb923c→#ef4444`), chip red "→ crosses 0.30% cliff in ~5 days", state pill "Critical". Sparkline trends up in red.
- **Outlook · Microsoft** — score **82/100** (green arc `#22c55e`), rate **0.06%** (fill ~20%, `#22c55e`), chip green "stable", state pill "Healthy". Sparkline flat green.

#### Zone D — Failover playbook (state machine)

- Panel: `border 1px solid #20242f`, `radius 12px`, `background #10131b`, `padding 17px 19px`.
- Header: "Failover playbook" 13.5px/600 + mono "· acme-outreach-03.com" `#8a90a0`; right: "backup plan in motion" 11px `#6a7080`.
- **Five connected pills** with `→` separators (`#3a4050`): `Healthy → Watch → Throttle → Failover → Cooldown`. Each pill `padding 9px 4px`, `radius 8px`, 11.5px.
  - Inactive: `border 1px solid #262b37`, text `#6a7080`.
  - Throttle (passed): amber tint `background rgba(245,158,11,.06)`, `border 1px solid #4a3a1a`, `#fbbf24`.
  - **Failover (current)**: `flex 1.15`, `border 1.5px solid #ef4444`, `background rgba(239,68,68,.22)`, white text/600, label "● Failover · current", and a **pulse animation** (expanding red box-shadow ring, 2s ease-in-out infinite).
- **Standby pool** widget below: inset row `background #0d1016`, `border 1px solid #1b1f29`, `radius 9px`, `padding 11px 14px`. "Standby pool" 11.5px/600 `#a0a6b4`; three 11px green dots (`#22c55e`, each with a green glow); mono "3 hot-standby domains ready (Gmail-warmed)".

#### Zone E — Domains table

- Panel: `border 1px solid #20242f`, `radius 12px`, `background #10131b`, overflow hidden.
- Header row: "Domains · 84" + "sorted by risk ▾".
- Column header (mono 9.5px uppercase `#5a6070`, bottom border `#161a22`): Domain · ESP split · Gmail · Outlook · State · Last event. Grid template `2fr 1.1fr .8fr .8fr 1fr 1.4fr`.
- **ESP split** = tiny stacked horizontal bar (66px, 8px tall, `radius 3px`): Gmail `#ea4335`, Outlook `#0078d4`, Other `#3a4050`, flex-weighted.
- Rows (12px, mono for domain/scores/event, bottom border `#161a22`):
  - `acme-outreach-03.com` · split 6/3/1 · Gmail **38** (`#f87171`) · Outlook **82** (`#4ade80`) · state pill "Failover" (red) · "throttled · 6m ago"
  - `domain-07.com` · split 5/4/1 · Gmail **61** (`#fbbf24`) · Outlook **88** (`#4ade80`) · state pill "Watch" (amber) · "reply −31% · 1h ago"
  - `domain-11.com` · split 7/2/1 · Gmail **91** (`#4ade80`) · Outlook **94** (`#4ade80`) · state pill "Healthy" (green) · "cleared · 2h ago"

#### Zone C — Alert feed (right rail)

- Header: "Alert feed" 13.5px/600 `#f2f3f7` + mono "newest first" 10.5px `#5a6070`; hairline divider `#1b1f29`.
- Each alert row: flex, `padding 14px 0`, bottom border `#161a22`. Leading severity dot 9×9 (red `#ef4444` w/ glow, amber `#fbbf24`, or green `#22c55e`), `margin-top 4px`. Body: mono timestamp 10px `#5a6070`; headline 12.5px `#d8dbe3` `line-height 1.45` (domains rendered mono `#f2f3f7`); optional action button.
- Buttons: primary = `background #ef4444`, white, 11.5px/600, `radius 7px`, `padding 7px 13px`. Secondary = `background #11141c`, `border 1px solid #2c3240`, `#cfd3dd`.
- Sample alerts (top→bottom):
  - 🔴 11:42 · 6 min ago — "Gmail complaint rate on `acme-outreach-03.com` climbing — projected to cross 0.30% in ~5 days." → button **"Throttle + fail over"**
  - 🟠 10:08 · 1 hr ago — "Reply rate on `domain-07` down 31% over 7 days while complaints flat — early engagement decay." → button **"Review list & content"**
  - 🟢 08:30 · 3 hrs ago — "`domain-11` cleared — 7 consecutive clean days. Returned to active rotation." (no button)
  - 🟢 yesterday — "`standby-gmail-02` finished warm-up — added to hot-standby pool." (no button)

---

### Screen 2 — Domain detail (drill-down)

**Purpose:** Opened by clicking a domain row. Answers _"why is the score what it is, and what do I do?"_

**Layout:** Same outer card style. Header bar, then a horizontal split:

- **Left** — `flex 1.5`, `padding 20px`, right border `1px solid #1b1f29`. Stacks the raw-vs-smoothed chart and the recommended-action card (`gap 18px`).
- **Right** — `width 380px`, `padding 20px`, `background #0a0c11`. The signal breakdown.

**Header bar:** "← Console" 12.5px `#6a7080`; domain mono 18px/600 `#f2f3f7`; state pill "● Failover" (red, `border 1px solid rgba(239,68,68,.35)`). Spacer. Right: uppercase "Overall risk score" 9.5px `#6a7080` + mono **38/100** (38 in `#f87171` 24px/600).

**Raw vs smoothed chart** (the statistical engine — rebuild with charting lib):

- Panel gradient `#10131b → #0d1016`, `border 1px solid #20242f`, `radius 12px`, `padding 18px 20px`.
- Title "Raw vs smoothed complaint rate" 14.5px/600; subtitle "How the engine sees through the noise to fire early." 12px `#8a90a0`; right "Gmail · 30 days".
- **Y axis = complaint rate %**, ticks `0.00% / 0.10% / 0.20% / 0.30% / 0.40%` (bottom→top), mono 9px `#5a6070`. Rotated axis title "Complaint rate". Faint horizontal gridlines `#161a22`.
- **Threshold lines**: red dashed at 0.30% labeled "0.30% cliff" (`#f87171`); amber dashed at 0.10% labeled "0.10% watch line" (`#fbbf24`). Light red tint above the cliff.
- **Raw daily line**: jagged, `#ef4444` `stroke-width 1.4` `opacity .55`.
- **Smoothed estimate**: smooth accent line `stroke-width 3`, with a translucent **confidence band** (accent `opacity .13`) enveloping it.
- **Alert marker**: dashed accent vertical + hollow accent circle where the smoothed line crosses 0.10%. Centered callout pill below the plot: "▲ alert fired here — 12 days early & trustworthy" (`background var(--accent-soft)`, `#a5b4fc`).
- X axis mono labels: "30d ago", "15d ago", "today".
- Legend: red swatch "Raw daily complaint rate · noisy"; accent swatch "Smoothed estimate · + confidence band".

**Recommended action card:**

- `border 1px solid rgba(239,68,68,.3)`, `background rgba(239,68,68,.05)`, `radius 12px`, `padding 18px 20px`.
- Title "Recommended action" 14px/600 `#fca5a5`; right "failover playbook · 3 steps".
- Numbered steps (mono numerals in 20px circles; red `#ef4444` for active steps 1–2, grey `#3a4050` for step 3):
  1. Throttle Gmail sends on this domain to 20%
  2. Fail traffic over to `standby-gmail-02` (hot, warmed)
  3. Hold in Cooldown until 7 consecutive clean days
- Full-width primary button "Apply failover playbook" (`background #ef4444`, white, 13.5px/600, `radius 9px`, `padding 12px`).

**Signal breakdown:**

- Title "Signal breakdown" 14px/600; subtitle "weighted inputs feeding the score" 11.5px `#6a7080`.
- Legend: accent swatch "leading · Sentinel's edge"; grey `#5a6070` swatch "lagging".
- Rows (`gap 15px`). Each: label 12px `#d8dbe3` (+ tiny "LEADING" tag `#a5b4fc` 9px/600 on leading signals) and right-aligned mono value; below, a bar (track `#1a1e28`, 7px, `radius 4px`) whose fill color = accent for **leading** signals, `#5a6070` for **lagging**, plus a mono weight label "w NN%".
- Rows (value · weight · leading?):
  - Smoothed complaint rate · `0.21%` (`#f87171`) · w 28% · **lagging**, fill 80%
  - Complaint-rate slope · `+0.04%/d` (`#f87171`) · w 22% · **leading**, fill 64%
  - Reply trend (7d) · `−31%` (`#fbbf24`) · w 16% · **leading**, fill 52%
  - Soft-bounce / deferral rate · `3.8%` · w 14% · **leading**, fill 44%
  - Postmaster reputation tier · `Medium ↓` (`#fbbf24`) · w 8% · **leading**, fill 30%
  - Hard bounces · `0.6%` · w 6% · **lagging**, fill 22%
  - Seed-list placement · `71% inbox` · w 6% · **leading**, fill 22%

---

## Interactions & Behavior

- **Navigation**: clicking a domain row in Zone E opens Screen 2 for that domain; "← Console" returns. Alert-feed headlines deep-link to the relevant domain.
- **Alert actions**: "Throttle + fail over" advances the domain through the playbook state machine (Throttle → Failover) and would, in production, trigger the backend failover; "Review list & content" routes to list tooling (out of scope for this mock); "Apply failover playbook" on Screen 2 executes the 3-step plan.
- **Account selector**: dropdown to switch customer/account (data scope changes).
- **Alert rail toggle**: show/hide Zone C (reflows main column to full width).
- **Animations**:
  - Critical status-pill dot: opacity pulse, 1.6s ease-in-out infinite.
  - Failover playbook current pill: expanding red box-shadow ring pulse, 2s ease-in-out infinite.
  - Standby-pool dots: static green glow.
  - Chart entrances (optional, recommended): line draw-in / fade, ~400–600ms ease-out.
- **Hover states** (apply codebase conventions): table rows lift to a slightly lighter `background` (e.g. `#12151d`); buttons darken/brighten ~6–8%; pills and selectors get a subtle border-color lift.
- **Loading**: charts and cards should have skeleton/shimmer placeholders while data fetches.

## State Management

- `selectedAccount` — current customer (drives all data).
- `domains[]` — per-domain: name, ESP split, Gmail score, Outlook score, state (`Healthy|Watch|Throttle|Failover|Cooldown`), last event, per-provider smoothed rate + projection, risk time-series, signal breakdown.
- `alerts[]` — severity, timestamp, headline, optional action(s), linked domain.
- `selectedDomain` — drives Screen 2; `null` = Console.
- `showAlertRail` — boolean (layout toggle).
- `accent` — theme accent color (see tokens).
- Data fetching: live/polled deliverability metrics per domain per ESP; the "last synced" timestamp reflects the most recent poll. Real-time push (WebSocket/SSE) for new alerts and state transitions is ideal given the operator use-case.

## Design Tokens

**Surfaces / borders (dark theme)**

- App backdrop: `#1a1c22`
- Card / frame: `#0c0e14`
- Panel: `#10131b` · Rail / inset: `#0a0c11` · Deep inset: `#0d1016`
- Top-bar gradient: `#11141c → #0e1118`
- Borders: `#20242f` (panel), `#1b1f29` (section divider), `#262b37` (controls), `#161a22` (table rows), `#1e2330` (gauge/bar track)

**Text**

- Primary `#f2f3f7` · body `#e7e9f0` / `#d8dbe3` · secondary `#a0a6b4` / `#8a90a0` · muted `#6a7080` · faint `#5a6070`

**Status (use everywhere, consistently)**

- Green / Healthy (score ≥ 80): `#22c55e`, text `#4ade80`, tint `rgba(34,197,94,.13)`
- Amber / Watch (60–79, rate near 0.10%): `#fbbf24` / `#f59e0b`, tint `rgba(245,158,11,.13)`
- Orange / Warn (40–59): `#fb923c`
- Red / Critical (< 40, projected to cross 0.30%): `#ef4444`, text `#fca5a5`, tint `rgba(239,68,68,.13)`
- **Accent / "Sentinel's intelligence"** (indigo): default `#818cf8`, light `#a5b4fc`, deep `#6366f1`; soft fill `rgba(129,140,248,.16)`. Implemented as CSS variables `--accent` / `--accent-soft`. Curated options offered in the mock: `#818cf8` (indigo), `#a78bfa` (violet), `#5e9bf0` (blue), `#22d3ee` (cyan).
- Provider brand dots: Gmail `#ea4335`, Outlook/Microsoft `#0078d4`.

**Reference lines (every rate chart):** `0.10%` = amber watch line; `0.30%` = red cliff.

**Typography**

- UI sans: **IBM Plex Sans** (400/500/600/700). _(Picked for an infra-tool feel; swap to the codebase's standard sans if one exists — avoid defaulting to Inter/Roboto unless that's the house font.)_
- **Mono: IBM Plex Mono** (400/500/600) with tabular numerals (`font-feature-settings: 'tnum'`). **Use mono for ALL numbers, rates, scores, timestamps, codes, and domain names** — this is a deliberate "infra tool" signal and aids scanning.
- Scale seen in mock: hero title 15px, panel titles 13.5–14.5px, body 12–12.5px, captions 10–11.5px, micro/axis 9–10px; big numerals 17–24px; section labels 9.5–10px uppercase with `letter-spacing .06–.08em`.

**Radius:** card 14px · panel 12px · controls/buttons 7–9px · pills 999px · small bars 3–4px.

**Shadows:** card ambient `0 24px 60px rgba(0,0,0,.45)`; colored glows on accent logo, green standby dots, red severity dot.

**Spacing:** card padding 18–20px; inter-panel gap 18px; control padding 7–13px; table row padding 11px 16px.

## Charts — implementation notes

Rebuild all four chart types with a real charting library, data-driven (do **not** port SVG):

1. **Hero risk-score chart** — single smooth 0–100 line over time with a projected tail; three colored Y zones (SAFE/WATCH/DANGER); a shaded vertical "warning gap" band between two event markers; glow under the line.
2. **ESP gauge rings** — radial progress arcs (0–100), rounded caps, colored by status.
3. **Sparklines** — tiny 14-day trend lines in card corners.
4. **Raw-vs-smoothed chart** — two series (jagged raw + smoothed) on a complaint-% axis, a confidence band around the smoothed series, two dashed threshold lines (0.10% / 0.30%), and a crossing marker.

## Assets

No external image assets. The Sentinel logo is a simple CSS/SVG mark (rounded accent square with a punched-out center dot) — recreate or replace with the real brand mark. Provider dots are plain colored squares; substitute real Gmail/Outlook glyphs if available in the codebase's icon set. All other graphics are CSS/SVG.

## DEFINITION OF DONE:

- Every screen is implemented, including: no console errors, zero network calls,
  deterministic by seed, jagged raw vs smooth line in the detail chart, and the Healthy⇄Critical
- Toggle flips both gauges correctly.
- When done, deploy to Vercel & Github Pages (or tell me the exact step by step), put the live URL in the README, and give me a short report of what you've completed.

## Notes

If anything in this spec is ambiguous or you're tempted to deviate, STOP and ask me first. Present 3 options with each pros and cons so I could understand the SWOT of each option before deciding what to implement.

## Files

- `Sentinel Console — Hi-fi.dc.html` — **the hi-fi source of truth.** Contains Console (Layout A) + Domain detail, dark theme. Open in a browser to view.
- `Sentinel Wireframes.dc.html` — lo-fi context: layout explorations A/B/C, calm "all-healthy" variant, and the chart-direction brainstorm (why the final risk-up / stacked-metric model was chosen).
- `product-spec-brief.md` — the original product spec brief.
- `support.js` — runtime for the HTML prototype format **only**; ignore for implementation.

> Both `.dc.html` files render standalone in any modern browser (they pull IBM Plex from Google Fonts). They are **references** — implement the design natively in your codebase per the guidance above.
