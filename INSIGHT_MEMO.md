# dEWSentinel — Deliverability Early-Warning Sentinel
### One-page insight memo

**Thesis:** *We see the dip before your reply rates do.* Cold-email reputation decays silently for weeks before any dashboard turns red. dEWSentinel detects that decay early, per inbox provider, and triggers a backup plan — turning a customer-churning surprise into a preemptive save.

---

### The problem

A customer's sending domain looks healthy for 2–3 months, then deliverability collapses "overnight." It wasn't overnight — reputation eroded the whole time, invisibly. Three facts make this a structural trap:

- **The cliff is tiny.** Google expects bulk senders to stay under **0.10%** spam complaints and never reach **0.30%**. At cold-email volume, ~3 complaints per 1,000 crosses it.
- **The metric that matters is lagging *and self-concealing.*** Postmaster's complaint rate updates 24–48h late, and its denominator is *inbox-delivered* mail — so once filtering starts, the very recipients who'd complain never see the message, and the reported rate can *fall* while reputation craters.
- **Decay is fast; recovery is slow.** Damage lands in days; restoring a domain takes 4–8 weeks (Gmail wants 7 consecutive clean days). The cost function is brutally asymmetric.

Meanwhile the sequencer dashboard stays green, because it reports a warmup/inbox-placement score — a lagging signal that looks fine right up until it doesn't.

---

### The insight

Stop watching the complaint rate. Watch the signals that move *before* it, and treat the decision as risk management, not reporting.

1. **Per-ESP, not aggregate.** Gmail and Outlook reputations decay independently; a domain can be dying at Gmail while green at Outlook. Score each separately.
2. **Smooth the noise.** At low volume a single complaint swings the raw rate wildly. A Beta-Binomial estimate (a baseline prior + a confidence band) yields a stable rate you can act on, and you alert on the band's upper edge — early, not after the spike.
3. **Project the trend.** Fit a slope to the *smoothed* rate and extrapolate: *"Gmail at 0.18%, climbing — reaches the 0.30% cliff in ~5 days."* That sentence is the product.
4. **Lead with first-party telemetry.** The earliest signal isn't Postmaster — it's the SMTP conversation itself: rising 4xx deferrals and provider throttle/spam codes captured at send time, before any complaint posts.
5. **Act asymmetrically.** Because a miss costs weeks and a false alarm costs a day of throttling, the right policy is a conservative circuit breaker that trips on weak early signals.

---

### The approach

A leading **per-ESP risk score** (smoothed complaint rate + slope-to-cliff + deferral/throttle codes + engagement + placement) feeding a **circuit-breaker + hot-standby failover**:

`Healthy → Watch → Throttle → Failover → Cooldown`

On degradation, dEWSentinel throttles the burning domain and **re-routes the at-risk provider's traffic to a pre-warmed standby domain** (kept hot, warmed for that ESP), then parks and re-warms the original until it's clean for 7 straight days. It's the email equivalent of a payments circuit breaker plus a hot/cold-wallet failover.

---

### Where the data comes from — and why this is defensible

| Layer | Signal | Source |
|---|---|---|
| **Leading** | deferrals, 4xx/5xx throttle & spam codes, bounce reasons | **First-party MTA accounting-webhook telemetry** (captured at send) |
| **Leading** | inbox vs spam placement | seed-list panel |
| **Confirming (lagging)** | spam rate, domain/IP reputation | Google Postmaster + Microsoft SNDS/JMRP |

The leading layer only exists **because sending.ac owns the sending infrastructure** — it already emits this telemetry (it's the same first-party stream the warm.ac index is built from). A competitor layered on someone else's sending platform is blind to it. dEWSentinel is not a new pipeline; it's a predictive, customer-facing consumer of a stream sending.ac already produces.

---

### What's in this repo

A runnable POC of the console: synthetic 30-day scenario, the live risk engine (Beta-Binomial smoothing + slope projection + per-ESP scoring), and the failover state machine — rendered in the dEWSentinel UI with a Healthy⇄Critical toggle. **Data is simulated;** the engine and visuals are real. Production wiring is documented, not mocked.

**Roadmap:** **v0 (this)** engine + console on synthetic data → **v1** ingest live MTA webhook + Postmaster/SNDS for one ESP; real alerts → **v2** automated failover execution + standby-pool orchestration.

*Prepared as a proof-of-concept for discussion. Thresholds reflect public Google/Microsoft sender guidance; figures in the mockup are illustrative.*
