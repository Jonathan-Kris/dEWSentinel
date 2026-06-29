# Product Spec Brief — "Sentinel" (working name)
## Deliverability Early-Warning Console

**Context for the designer:** This is an observability dashboard for a cold-email *infrastructure* company. Their customers run outbound email campaigns; over 2–3 months sender reputation silently decays until emails get filtered as spam, and by the time the customer notices (reply rates drop), the damage is done and takes weeks to undo. Today's tools show a misleading "all green" dashboard because they rely on *lagging* metrics. This product's whole job is to detect the decay *early* using leading indicators, warn the user before the cliff, and auto-trigger a backup plan. The two inbox providers that matter are **Gmail (Google)** and **Outlook (Microsoft)**, and reputation with each decays *independently* — so almost everything is shown split by provider.

**What to design:** one primary dashboard screen (the hero), plus one secondary domain-detail drill-down. Data-dense but calm; charts are the centerpiece.

---

## Positioning
**One-liner:** "We see the dip before your reply rates do." A live reputation early-warning system that turns a customer-churning surprise into a preemptive save.

## Primary user
A deliverability operator / agency owner managing dozens-to-hundreds of sending domains. Technical, lives in dashboards (think Datadog/Grafana user). Wants: *is anything about to break, and what do I do about it* — at a glance.

## The core story the UI must tell
Three beats, top to bottom: **(1)** here's the thing today's dashboard can't see → **(2)** here's our early warning firing days ahead → **(3)** here's the automatic backup plan already in motion. The mockup should make a viewer instantly grasp "this catches problems before they happen."

---

## Screen 1 — The Console (primary)

**Top bar**
- Left: product wordmark "Sentinel".
- Center: account/customer selector (dropdown, e.g. "Acme Agency — 84 domains").
- Right: a global status pill (e.g. red **"2 domains critical"**), and a "Last synced 4 min ago" timestamp in muted monospace.

**Zone A — The signature chart (hero, spans top, largest element):** "Lead-time view."
- An overlay line chart over ~30 days, with **two lines**:
  - A flat, reassuring **green line** labeled *"Sequencer health score (what today's dashboard shows)"* — stays ~95–100 the whole time.
  - A **rising indigo line** labeled *"Sentinel real risk score"* — drifts down/up showing reputation degrading well before the green line reacts.
- A shaded vertical band annotation between where Sentinel fires and where the green line finally drops, labeled **"12 days of warning gained."** This contrast is the money shot — make it obvious and a little dramatic.
- Subtle horizontal threshold guides.

**Zone B — Per-ESP health cards (two side-by-side cards below the hero):**
- **Gmail card** and **Outlook card**, each containing:
  - A big health score 0–100 with a colored ring/gauge (e.g. Gmail **38/100, red**; Outlook **82/100, green**) — showing they decay independently.
  - Smoothed complaint rate vs the two reference lines: **"0.21%"** with a tiny inline bar showing position between the 0.10% watch line and 0.30% cliff.
  - A projection chip: **"→ reaches 0.30% cliff in ~5 days"** (red) for Gmail; **"stable"** (green) for Outlook.
  - A small sparkline of the last 14 days.

**Zone C — Alert feed (right rail or left column, time-ordered):**
- Each alert is a row: a severity dot (red/amber/green), a timestamp, a plain-language headline, and a one-line recommended action with a button.
- Sample alerts:
  - 🔴 *"Gmail complaint rate on acme-outreach-03.com climbing — projected to cross 0.30% in ~5 days."* → button: **"Throttle + fail over"**
  - 🟠 *"Reply rate on domain-07 down 31% over 7 days while complaints flat — early engagement decay."* → button: **"Review list & content"**
  - 🟢 *"domain-11 cleared — 7 consecutive clean days. Returned to active rotation."*

**Zone D — Failover playbook panel (the backup plan, bottom):** a horizontal **state-machine visualization** with five stages:

`Healthy → Watch → Throttle → Failover → Cooldown`

- Show stages as connected pills with an arrow flow. The *current* stage for a flagged domain is highlighted (e.g. acme-outreach-03 currently at **Failover**, pulsing).
- A small adjacent "Standby pool" widget: a row of pre-warmed backup domains with green health dots, labeled **"3 hot-standby domains ready (Gmail-warmed)"** — conveying instant, hot failover.

**Zone E — Domains table (collapsible, below):**
- Columns: Domain · ESP split (a tiny Google/Microsoft/Other stacked bar) · Gmail score · Outlook score · State (the pill from the state machine) · Last event.
- A few rows in healthy green, one or two in critical red, to show range.

---

## Screen 2 — Domain detail (drill-down)
Opened by clicking a domain. Shows *why* the score is what it is:
- Header: domain name + current state pill + overall risk score.
- **The "raw vs smoothed" chart:** a jagged red raw-daily-complaint line vs a smooth indigo estimate line with a light confidence band, the 0.10% and 0.30% threshold lines, and a marker where the smoothed line crossed 0.10% ("alert fired here — early & trustworthy"). (This visualizes the statistical engine.)
- **Signal breakdown:** a horizontal bar list of the weighted inputs feeding the score — smoothed complaint rate, complaint-rate slope, soft-bounce/deferral rate, reply trend, hard bounces, Postmaster reputation tier, seed-list placement — each with its current value and a small contribution weight. Leading signals visually distinguished from lagging ones.
- **Recommended action card** with the failover steps and an "Apply" button.

---

## Status & color system (use consistently everywhere)
- **Green — Healthy** (score ≥ 80): safe.
- **Amber — Watch** (60–79, or smoothed rate near 0.10%): early caution.
- **Orange — Warn** (40–59): trending toward the cliff.
- **Red — Critical** (< 40, or projected to cross 0.30%): act now.
- **Indigo** = the brand / "Sentinel's own intelligence" (the smart line, the engine).
- **0.10% = the amber "watch line," 0.30% = the red "cliff"** — these two reference lines appear on every rate chart.

## Visual design direction
- **Aesthetic:** technical observability tool — think Datadog / Grafana / Vercel dashboard / Linear. Clean, confident, data-dense but breathable. No decorative fluff; the data *is* the design.
- **Mode:** dark theme as primary (operators live in dark dashboards); a light variant is a plus.
- **Typography:** crisp sans for UI; **monospace for all numbers, rates, codes, timestamps, and domain names** — it signals "infra tool" and aids scanning.
- **Charts:** the stars of the page. Smooth, precise, with clear threshold guides and annotations. Favor line + area; avoid 3D/skeuomorphic anything.
- **Density:** comfortable on the hero, tighter in tables/feeds. Generous whitespace around the hero chart so the "12 days of warning" moment lands.

## Render these two states in the mockup
1. **The dramatic "critical" state** (default to show): one customer with Gmail in red, the alert feed lit, a domain at the Failover stage — this tells the whole story.
2. Optionally a calm **"all healthy"** variant so the contrast is visible.

## Out of scope (keep the mockup focused)
Settings, billing, auth, onboarding, integrations config, and any multi-account admin. This is the live monitoring surface only.
