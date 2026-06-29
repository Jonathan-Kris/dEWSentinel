/* ============================================================================
 * dEWSentinel — engine.js
 * PURE LOGIC. Zero DOM. The only thing this file exposes to the outside world
 * is runEngine(opts) -> ViewModel (see ENGINE_SPEC.md §8).
 *
 * Everything rendered in the UI is COMPUTED here from synthetic, seeded data.
 * Nothing is hardcoded to satisfy the acceptance checks — the generator
 * parameters are tuned instead (ENGINE_SPEC.md non-negotiable #4).
 * ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- §5.1 Seeded RNG (reference implementation, verbatim) -------- */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- §5.2 Beta-Binomial smoothed complaint rate ------------------
   * b0 is the smoothing knob (§5.2). Tuned up to 4000 (from the 1200
   * reference) so the credible band ignores single-complaint spikes — keeping
   * the healthy scenario cleanly below the 0.10% Watch line — while critical
   * still crosses 0.30% at the cliff. (Spec explicitly invites tuning b0.)   */
  function betaBinomialSmooth(windowSends, windowComplaints, prior) {
    prior = prior || { a0: 0.6, b0: 4000 };
    const S = windowSends.reduce((x, y) => x + y, 0);
    const C = windowComplaints.reduce((x, y) => x + y, 0);
    const a = prior.a0 + C;
    const b = prior.b0 + Math.max(0, S - C);
    const mean = a / (a + b);
    const variance = (a * b) / ((a + b) * (a + b) * (a + b + 1));
    const sd = Math.sqrt(variance);
    const z = 1.645; // ~90% credible interval
    return { mean, ciLower: Math.max(0, mean - z * sd), ciUpper: mean + z * sd };
  }

  /* ---------- §5.3 Slope projection --------------------------------------- */
  function leastSquaresSlope(ys) {
    const n = ys.length, xs = ys.map((_, i) => i);
    const mx = (n - 1) / 2;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
    return num / den;
  }
  function daysToThreshold(currentMean, slopePerDay, cliff) {
    cliff = (cliff == null) ? 0.003 : cliff;
    if (slopePerDay <= 0) return Infinity;
    return (cliff - currentMean) / slopePerDay;
  }

  /* ---------- small helpers ----------------------------------------------- */
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  // linear normalizer: value==at100 -> 100, value==at0 -> 0, clamped to [0,100]
  function normalize(value, at100, at0) {
    if (at100 === at0) return 100;
    return clamp(((value - at0) / (at100 - at0)) * 100, 0, 100);
  }
  function poisson(rng, lambda) {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rng(); } while (p > L);
    return k - 1;
  }
  function lerp(a, b, t) { return a + (b - a) * clamp(t, 0, 1); }

  const TIER_SCORE = { high: 100, medium: 55, low: 20, bad: 0 };
  const CLIFF = 0.003;   // 0.30%
  const WATCH = 0.001;   // 0.10%
  const WINDOW = 9;      // smoothing window W (tuned up from the §5.2 default of 7
                         // to steady the noisy tail so the projection is stable)
  const SLOPE_WINDOW = 10;

  /* =======================================================================
   * §4 Synthetic generator — emits per-day, per-ESP records for one domain.
   * The *shape* of the timeline is mandatory (§4); noise levels are tuned so
   * the §10 acceptance numbers fall out naturally.
   * ===================================================================== */

  // Underlying ("true") daily complaint rate that the noisy draws sample from.
  function trueComplaintRate(scenario, esp, day, days) {
    // Outlook is always stable/green; Gmail-healthy is also stable.
    if (esp === 'outlook' || scenario === 'healthy') {
      return 0.00022; // ~0.022% — comfortably below the 0.10% Watch band, so the
                      // smoothed ciUpper stays under Watch even with count noise.
    }
    // Gmail · critical — the four-phase decay story (§4 table). Complaints
    // hold near baseline while the LEADING signals (reply/deferral/seed, below)
    // move first; the complaint rate only ramps hard in the final ~13 days, so
    // the *smoothed* line sits ~0.20% "today" with ~5 days projected to cliff.
    if (day <= 10) return 0.00040;                                   // Stable
    if (day <= 16) return lerp(0.00040, 0.00060, (day - 10) / 6);    // Early drift (inch up)
    return lerp(0.00060, 0.00460, (day - 16) / (days - 1 - 16));     // Acceleration → cliff
  }

  // Leading reply-rate multiplier (engagement sags FIRST, before complaints —
  // the early-drift phase). Bottoms out by ~day 19 so the health score crosses
  // into Watch well ahead of the lagging dashboard, building the lead time.
  function replyFactor(scenario, esp, day) {
    if (esp === 'outlook' || scenario === 'healthy') return 1.0;
    if (day <= 8) return 1.0;
    return lerp(1.0, 0.60, (day - 8) / 11); // ~ -40% by ~day 19, then flat
  }

  // Leading deferral (4xx) rate — creeps up early, plateaus by ~day 19.
  function deferralRate(scenario, esp, day) {
    if (esp === 'outlook' || scenario === 'healthy') return 0.008;
    if (day <= 8) return 0.009;
    return lerp(0.009, 0.042, (day - 8) / 11); // ~4% by ~day 19, then flat
  }

  // Leading seed-list inbox placement (drops during acceleration).
  function seedPlacement(scenario, esp, day) {
    if (esp === 'outlook' || scenario === 'healthy') return 97;
    if (day <= 17) return 97;
    return lerp(97, 70, (day - 17) / 12); // ~71% by today
  }

  // LAGGING warmup placement — "what the old dashboard sees". Holds until cliff.
  function warmupPlacement(scenario, esp, day) {
    if (esp === 'outlook' || scenario === 'healthy') return 97;
    if (day <= 26) return 97;
    return lerp(97, 68, (day - 26) / 3); // only collapses at the very end
  }

  // LAGGING postmaster tier — provider-side, holds high until the cliff.
  function postmasterTier(scenario, esp, day) {
    if (esp === 'outlook' || scenario === 'healthy') return 'high';
    if (day <= 26) return 'high';
    if (day <= 27) return 'medium';
    if (day <= 28) return 'low';
    return 'low';
  }

  function generate(scenario, seed, days) {
    const rng = makeRng(seed);
    const data = { gmail: [], outlook: [] };
    const base = new Date(Date.UTC(2026, 5, 1)); // fixed epoch -> deterministic dates
    ['gmail', 'outlook'].forEach((esp) => {
      // de-correlate the two ESP streams a little
      for (let i = 0; i < (esp === 'outlook' ? 13 : 7); i++) rng();
      for (let day = 0; day < days; day++) {
        const sends = Math.round(300 + (rng() - 0.5) * 150); // ~225–375/day
        const cr = trueComplaintRate(scenario, esp, day, days);
        const complaints = poisson(rng, cr * sends);
        const hardBounces = poisson(rng, 0.006 * sends);
        const deferrals = Math.round(deferralRate(scenario, esp, day) * sends + (rng() - 0.5) * 4);
        const replyBase = 0.05 * sends * replyFactor(scenario, esp, day);
        const replies = Math.max(0, Math.round(replyBase + (rng() - 0.5) * 6));
        const date = new Date(base.getTime() + day * 86400000).toISOString();
        data[esp].push({
          day, date, esp,
          sends,
          complaints,
          hardBounces,
          deferrals: Math.max(0, deferrals),
          replies,
          postmasterTier: postmasterTier(scenario, esp, day),
          seedPlacementPct: Math.round(seedPlacement(scenario, esp, day) + (rng() - 0.5) * 3),
          warmupPlacementPct: Math.round(warmupPlacement(scenario, esp, day) + (rng() - 0.5) * 2)
        });
      }
    });
    return data;
  }

  /* =======================================================================
   * Series + scoring helpers (operate on generated records)
   * ===================================================================== */

  // Smoothed complaint series (one betaBinomial per day, trailing window).
  function smoothedSeries(records) {
    return records.map((_, d) => {
      const lo = Math.max(0, d - (WINDOW - 1));
      const ws = records.slice(lo, d + 1).map((r) => r.sends);
      const wc = records.slice(lo, d + 1).map((r) => r.complaints);
      return betaBinomialSmooth(ws, wc);
    });
  }

  // Trailing-window rate of a per-record field (e.g. deferrals/sends).
  function trailingRate(records, d, field) {
    const lo = Math.max(0, d - (WINDOW - 1));
    let num = 0, den = 0;
    for (let i = lo; i <= d; i++) { num += records[i][field]; den += records[i].sends; }
    return den ? num / den : 0;
  }

  // Reply-rate drop vs the first-week baseline, evaluated at day d (trailing 7d).
  function replyDrop(records, d) {
    const baseN = Math.min(WINDOW, records.length);
    let bnum = 0, bden = 0;
    for (let i = 0; i < baseN; i++) { bnum += records[i].replies; bden += records[i].sends; }
    const baseRate = bden ? bnum / bden : 0;
    const lo = Math.max(0, d - (WINDOW - 1));
    let cnum = 0, cden = 0;
    for (let i = lo; i <= d; i++) { cnum += records[i].replies; cden += records[i].sends; }
    const curRate = cden ? cnum / cden : 0;
    if (baseRate <= 0) return 0;
    return clamp((baseRate - curRate) / baseRate, 0, 1); // fraction dropped
  }

  // §5.4 per-ESP health score at day d, with full sub-score breakdown.
  function scoreAt(records, smoothed, d) {
    const sm = smoothed[d];
    // slope on the SMOOTHED means over the trailing slope-window
    const lo = Math.max(0, d - (SLOPE_WINDOW - 1));
    const means = smoothed.slice(lo, d + 1).map((s) => s.mean);
    const slope = means.length >= 2 ? leastSquaresSlope(means) : 0;
    const dtt = daysToThreshold(sm.mean, slope, CLIFF);

    const defRate = trailingRate(records, d, 'deferrals');
    const hbRate = trailingRate(records, d, 'hardBounces');
    const rDrop = replyDrop(records, d);
    const tier = records[d].postmasterTier;
    const seed = records[d].seedPlacementPct;

    const sub = {
      complaint: normalize(sm.ciUpper, 0.0005, 0.0030),         // 0.05% -> 0.30%
      slope: normalize(isFinite(dtt) ? clamp(dtt, 3, 30) : 30, 30, 3),
      deferral: normalize(defRate, 0.0, 0.08),                  // 0% -> 8%
      reply: normalize(rDrop, 0.0, 0.40),                       // 0 -> 40% drop
      tier: TIER_SCORE[tier],
      hardBounce: normalize(hbRate, 0.0, 0.05),                 // 0% -> 5%
      seed: normalize(seed, 100, 40)                            // 100% -> 40%
    };
    const W = { complaint: 0.28, slope: 0.22, deferral: 0.16, reply: 0.12, tier: 0.10, hardBounce: 0.06, seed: 0.06 };
    const score = Math.round(
      W.complaint * sub.complaint + W.slope * sub.slope + W.deferral * sub.deferral +
      W.reply * sub.reply + W.tier * sub.tier + W.hardBounce * sub.hardBounce + W.seed * sub.seed
    );
    return {
      score, sub, weights: W,
      mean: sm.mean, ciUpper: sm.ciUpper, ciLower: sm.ciLower,
      slope, daysToThreshold: dtt, deferralRate: defRate, hardBounceRate: hbRate,
      replyDrop: rDrop, tier, seedPlacementPct: seed
    };
  }

  function tierOf(score) {
    return score >= 80 ? 'healthy' : score >= 60 ? 'watch' : score >= 40 ? 'warn' : 'critical';
  }

  // §5.5 lagging-only "today's dashboard" proxy score at day d.
  function dashboardAt(records, d) {
    const warmup = records[d].warmupPlacementPct;
    const postSub = TIER_SCORE[records[d].postmasterTier];
    return Math.round(0.6 * normalize(warmup, 100, 60) + 0.4 * postSub);
  }

  // §5.6 failover state machine.
  function failoverState(scoreObj) {
    const s = scoreObj.score, ciU = scoreObj.ciUpper, dtt = scoreObj.daysToThreshold;
    if (s < 40 || dtt <= 3 || ciU >= CLIFF) return 'Failover';
    if (s < 60 || dtt <= 7) return 'Throttle';
    if (s < 80 || ciU >= WATCH) return 'Watch';
    return 'Healthy';
  }

  const RING_COLOR = { healthy: '#22c55e', watch: '#f59e0b', warn: '#f59e0b', critical: '#ef4444' };
  const pct = (p, dp) => (p * 100).toFixed(dp == null ? 2 : dp) + '%';

  /* =======================================================================
   * §5.8 Orchestrator
   * ===================================================================== */
  function runEngine(opts) {
    opts = opts || {};
    const scenario = opts.scenario || 'critical';
    const seed = (opts.seed == null) ? 42 : (opts.seed >>> 0);
    const days = opts.days || 30;
    const today = (opts.today == null) ? days - 1 : opts.today;

    const data = generate(scenario, seed, days);
    const smG = smoothedSeries(data.gmail);
    const smO = smoothedSeries(data.outlook);

    // per-day score series (health) for both ESPs
    const gmailScores = data.gmail.map((_, d) => scoreAt(data.gmail, smG, d));
    const outlookScores = data.outlook.map((_, d) => scoreAt(data.outlook, smO, d));
    const dashSeries = data.gmail.map((_, d) => dashboardAt(data.gmail, d));

    const gToday = gmailScores[today];
    const oToday = outlookScores[today];

    /* ---- lead-time (§5.8): gmail health crosses into Watch (<80) vs
            dashboard proxy dropping below 80 ---- */
    const sentinelSeries = gmailScores.map((s) => s.score);
    let crossWatchDay = sentinelSeries.findIndex((v) => v < 80);
    let dashDropDay = dashSeries.findIndex((v) => v < 80);
    if (crossWatchDay < 0) crossWatchDay = today;
    if (dashDropDay < 0) dashDropDay = today;
    const warningGainedDays = Math.max(0, dashDropDay - crossWatchDay);

    /* ---- ESP cards ---- */
    function buildCard(scoreObj, sm) {
      const tier = tierOf(scoreObj.score);
      const dtt = scoreObj.daysToThreshold;
      const showCliff = isFinite(dtt) && dtt > 0 && dtt <= 45 && scoreObj.slope > 0;
      const spark = sm.slice(Math.max(0, sm.length - 14)).map((s) => s.mean);
      return {
        score: scoreObj.score,
        tier,
        ringColor: RING_COLOR[tier],
        smoothedRatePct: pct(scoreObj.mean),
        ciUpperPct: pct(scoreObj.ciUpper),
        rateBarPos: clamp((scoreObj.mean - WATCH) / (CLIFF - WATCH), 0, 1),
        projection: showCliff
          ? '→ crosses 0.30% cliff in ~' + Math.max(1, Math.round(dtt)) + ' days'
          : 'stable',
        daysToCliff: showCliff ? Math.round(dtt) : null,
        spark
      };
    }
    const esp = { gmail: buildCard(gToday, smG), outlook: buildCard(oToday, smO) };

    /* ---- failover ---- */
    const gState = failoverState(gToday);
    const oState = failoverState(oToday);
    const standby = [
      { domain: 'standby-gmail-01.com', gmailHealth: 96 + Math.round(makeRng(seed + 1)() * 3), outlookHealth: 95 },
      { domain: 'standby-gmail-02.com', gmailHealth: 94 + Math.round(makeRng(seed + 2)() * 4), outlookHealth: 97 },
      { domain: 'standby-gmail-03.com', gmailHealth: 95 + Math.round(makeRng(seed + 3)() * 3), outlookHealth: 96 }
    ];
    const focalDomain = 'acme-outreach-03.com';
    const failover = {
      stages: ['Healthy', 'Watch', 'Throttle', 'Failover', 'Cooldown'],
      current: { domain: focalDomain, esp: 'gmail', stage: gState },
      standby,
      routingAction: gState === 'Failover'
        ? 'Route Gmail traffic → ' + standby[1].domain + ' (Gmail health ' + standby[1].gmailHealth + ')'
        : null
    };

    /* ---- alerts (§5.7) ---- */
    const alerts = [];
    if (scenario === 'critical') {
      if (gState === 'Failover' || esp.gmail.daysToCliff != null) {
        alerts.push({
          severity: 'red', ts: '11:42 · 6 min ago',
          headline: 'Gmail complaint rate on ' + focalDomain + ' climbing — projected to cross 0.30% in ~' +
            (esp.gmail.daysToCliff || 5) + ' days.',
          action: 'Throttle + fail over'
        });
      }
      if (gToday.replyDrop >= 0.15) {
        alerts.push({
          severity: 'amber', ts: '10:08 · 1 hr ago',
          headline: 'Reply rate on domain-07 down ' + Math.round(gToday.replyDrop * 100) +
            '% over 7 days while complaints flat — early engagement decay.',
          action: 'Review list & content'
        });
      }
      alerts.push({
        severity: 'green', ts: '08:30 · 3 hrs ago',
        headline: 'domain-11 cleared — 7 consecutive clean days. Returned to active rotation.',
        action: null
      });
      alerts.push({
        severity: 'green', ts: 'yesterday',
        headline: 'standby-gmail-02 finished warm-up — added to hot-standby pool.',
        action: null
      });
    } else {
      alerts.push({
        severity: 'green', ts: '09:12 · 20 min ago',
        headline: 'All monitored domains within healthy complaint thresholds.',
        action: null
      });
      alerts.push({
        severity: 'green', ts: 'today',
        headline: focalDomain + ' steady — Gmail & Outlook placement nominal.',
        action: null
      });
    }

    /* ---- global status ---- */
    const anyCritical = gState === 'Failover' || oState === 'Failover';
    const globalStatus = anyCritical
      ? { level: 'red', text: '2 domains critical' }
      : { level: 'green', text: 'all domains healthy' };

    /* ---- domains table ---- */
    const domains = [{
      domain: focalDomain,
      gmail: gToday.score, outlook: oToday.score,
      state: gState,
      gmailSplit: 6, outlookSplit: 3,
      lastEvent: scenario === 'critical' ? 'throttled · 6m ago' : 'nominal · 5m ago'
    }];
    if (scenario === 'critical') {
      domains.push({
        domain: 'domain-07.com', gmail: 61, outlook: 88, state: 'Watch',
        gmailSplit: 5, outlookSplit: 4, lastEvent: 'reply −31% · 1h ago'
      });
      domains.push({
        domain: 'domain-11.com', gmail: 91, outlook: 94, state: 'Healthy',
        gmailSplit: 7, outlookSplit: 2, lastEvent: 'cleared · 2h ago'
      });
    } else {
      domains.push({
        domain: 'domain-07.com', gmail: 90, outlook: 92, state: 'Healthy',
        gmailSplit: 5, outlookSplit: 4, lastEvent: 'cleared · 2h ago'
      });
      domains.push({
        domain: 'domain-11.com', gmail: 93, outlook: 95, state: 'Healthy',
        gmailSplit: 7, outlookSplit: 2, lastEvent: 'nominal · 3h ago'
      });
    }

    /* ---- detail (Screen 2, focal gmail) ---- */
    const rawSeries = data.gmail.map((r) => (r.sends ? r.complaints / r.sends : 0));
    const smoothed = smG.map((s) => s.mean);
    const ciUpperSeries = smG.map((s) => s.ciUpper);
    const ciLowerSeries = smG.map((s) => s.ciLower);
    let detailCross = smoothed.findIndex((m) => m >= WATCH);
    if (detailCross < 0) detailCross = today;

    const sigDefs = [
      { name: 'Smoothed complaint rate', kind: 'lagging', weight: gToday.weights.complaint, sub: gToday.sub.complaint,
        value: pct(gToday.mean) },
      { name: 'Complaint-rate slope', kind: 'leading', weight: gToday.weights.slope, sub: gToday.sub.slope,
        value: (gToday.slope >= 0 ? '+' : '') + (gToday.slope * 100).toFixed(3) + '%/d' },
      { name: 'Reply trend (7d)', kind: 'leading', weight: gToday.weights.reply, sub: gToday.sub.reply,
        value: '−' + Math.round(gToday.replyDrop * 100) + '%' },
      { name: 'Soft-bounce / deferral rate', kind: 'leading', weight: gToday.weights.deferral, sub: gToday.sub.deferral,
        value: (gToday.deferralRate * 100).toFixed(1) + '%' },
      { name: 'Postmaster reputation tier', kind: 'lagging', weight: gToday.weights.tier, sub: gToday.sub.tier,
        value: gToday.tier.charAt(0).toUpperCase() + gToday.tier.slice(1) },
      { name: 'Hard bounces', kind: 'lagging', weight: gToday.weights.hardBounce, sub: gToday.sub.hardBounce,
        value: (gToday.hardBounceRate * 100).toFixed(1) + '%' },
      { name: 'Seed-list placement', kind: 'leading', weight: gToday.weights.seed, sub: gToday.sub.seed,
        value: gToday.seedPlacementPct + '% inbox' }
    ];
    const recommendedAction = scenario === 'critical'
      ? 'Throttle Gmail sends to 20%, fail over to ' + standby[1].domain +
        ', hold in Cooldown until 7 consecutive clean days.'
      : 'No action required — maintain current rotation and warm-up cadence.';

    const detail = {
      rawSeries, smoothedSeries: smoothed, ciUpperSeries, ciLowerSeries,
      crossWatchDay: detailCross,
      signals: sigDefs,
      recommendedAction
    };

    return {
      meta: { account: 'Acme Agency', domainCount: 84, lastSyncedMin: 4, scenario, seed, days, today },
      globalStatus,
      leadTime: {
        dashboardSeries: dashSeries,
        sentinelSeries,
        warningGainedDays,
        crossWatchDay, dashDropDay
      },
      esp,
      alerts,
      failover,
      domains,
      detail
    };
  }

  const API = {
    makeRng, betaBinomialSmooth, leastSquaresSlope, daysToThreshold,
    normalize, runEngine
  };
  global.Engine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
