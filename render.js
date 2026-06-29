/* ============================================================================
 * dEWSentinel — render.js
 * DOM ONLY. Zero business logic. Reads a ViewModel (ENGINE_SPEC.md §8) produced
 * by engine.js and writes it into the #id hooks in index.html. The only math
 * here is data→pixel mapping inside the SVG chart helper (§9), which is
 * presentation, not engine logic.
 * ========================================================================== */
(function (global) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var TIER_TAG = { // tier -> {label, css class for pill/tag}
    healthy: { label: 'Healthy', cls: 'green' },
    watch: { label: 'Watch', cls: 'amber' },
    warn: { label: 'Warning', cls: 'amber' },
    critical: { label: 'Critical', cls: 'red' }
  };
  var STATE_COLOR = {
    Healthy: { fill: 'rgba(34,197,94,.13)', text: '#4ade80' },
    Watch: { fill: 'rgba(245,158,11,.13)', text: '#fbbf24' },
    Throttle: { fill: 'rgba(245,158,11,.16)', text: '#fbbf24' },
    Failover: { fill: 'rgba(239,68,68,.13)', text: '#fca5a5' },
    Cooldown: { fill: 'rgba(129,140,248,.13)', text: '#a5b4fc' }
  };

  /* ---------- tiny DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k]); }
    if (text != null) n.textContent = text;
    return n;
  }
  function svg(tag, attrs) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  /* =======================================================================
   * §9 SVG line-chart helper. Maps data→pixels linearly and builds <path>/
   * <line>/<rect>/<circle> nodes. No chart library.
   * ===================================================================== */
  function renderLineChart(svgEl, opts) {
    clear(svgEl);
    var vb = (svgEl.getAttribute('viewBox') || '0 0 740 256').split(/\s+/).map(Number);
    var W = vb[2], H = vb[3];
    var pad = opts.pad || { l: 80, r: 40, t: 14, b: 50 };
    var plotW = W - pad.l - pad.r, plotH = H - pad.t - pad.b;
    var x0 = opts.xDomain[0], x1 = opts.xDomain[1];
    var y0 = opts.yDomain[0], y1 = opts.yDomain[1];
    var px = function (x) { return pad.l + (x1 === x0 ? 0 : (x - x0) / (x1 - x0)) * plotW; };
    var py = function (y) { return pad.t + (1 - (y1 === y0 ? 0 : (y - y0) / (y1 - y0))) * plotH; };

    // shaded bands (vertical x-range or horizontal y-range)
    (opts.bands || []).forEach(function (b) {
      var r;
      if (b.fromX != null) {
        r = svg('rect', { x: px(b.fromX), y: pad.t, width: Math.max(0, px(b.toX) - px(b.fromX)),
          height: plotH, fill: b.color });
      } else {
        r = svg('rect', { x: pad.l, y: py(b.toY), width: plotW, height: Math.max(0, py(b.fromY) - py(b.toY)),
          fill: b.color });
      }
      if (b.opacity != null) r.setAttribute('opacity', b.opacity);
      svgEl.appendChild(r);
    });

    // zone labels (optional text anchored inside bands / centered annotations)
    (opts.zoneLabels || []).forEach(function (z) {
      var anchor = z.anchor || 'start';
      var xpx = px(z.x != null ? z.x : x0) + (anchor === 'start' ? 8 : 0);
      svgEl.appendChild(textNode(xpx, py(z.y), z.label, {
        'font-size': z.size || 10.5, 'font-weight': 600, fill: z.color,
        'font-family': "'IBM Plex Sans'", 'text-anchor': anchor,
        'letter-spacing': z.spacing != null ? z.spacing : 0
      }));
    });

    // horizontal guide lines
    (opts.hlines || []).forEach(function (h) {
      var ln = svg('line', { x1: pad.l, y1: py(h.y), x2: pad.l + plotW, y2: py(h.y),
        stroke: h.color, 'stroke-width': h.width || 1 });
      if (h.dash) ln.setAttribute('stroke-dasharray', h.dash);
      if (h.opacity != null) ln.setAttribute('opacity', h.opacity);
      svgEl.appendChild(ln);
      if (h.label) svgEl.appendChild(textNode(pad.l + plotW, py(h.y) - 4, h.label,
        { 'font-size': 9, 'text-anchor': 'end', fill: h.color, 'font-family': "'IBM Plex Mono'" }));
    });

    // vertical marker guide lines
    (opts.vlines || []).forEach(function (v) {
      var ln = svg('line', { x1: px(v.x), y1: pad.t, x2: px(v.x), y2: pad.t + plotH,
        stroke: v.color, 'stroke-dasharray': v.dash || '3 3' });
      if (v.opacity != null) ln.setAttribute('opacity', v.opacity);
      svgEl.appendChild(ln);
    });

    // axes
    if (opts.axes !== false) {
      svgEl.appendChild(svg('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: pad.t + plotH, stroke: '#262b37', 'stroke-width': 1 }));
      svgEl.appendChild(svg('line', { x1: pad.l, y1: pad.t + plotH, x2: pad.l + plotW, y2: pad.t + plotH, stroke: '#262b37', 'stroke-width': 1 }));
    }
    // y-axis tick labels
    (opts.yTicks || []).forEach(function (t) {
      svgEl.appendChild(textNode(pad.l - 8, py(t.y) + 3, t.label,
        { 'font-size': 9, 'text-anchor': 'end', fill: '#5a6070', 'font-family': "'IBM Plex Mono'" }));
    });
    // x-axis tick labels
    (opts.xTicks || []).forEach(function (t) {
      svgEl.appendChild(textNode(px(t.x), pad.t + plotH + 16, t.label,
        { 'font-size': 9, fill: '#5a6070', 'font-family': "'IBM Plex Mono'", 'text-anchor': t.anchor || 'start' }));
    });
    // axis title
    if (opts.yTitle) {
      var ty = pad.t + plotH / 2;
      svgEl.appendChild(textNode(pad.l - 36, ty, opts.yTitle, {
        'font-size': 9.5, fill: '#6a7080', 'font-weight': 600, 'font-family': "'IBM Plex Sans'",
        'text-anchor': 'middle', transform: 'rotate(-90 ' + (pad.l - 36) + ' ' + ty + ')'
      }));
    }

    // series (optional glow underlay + line)
    (opts.series || []).forEach(function (s) {
      var pts = s.points.map(function (p) { return px(p[0]) + ',' + py(p[1]); }).join(' ');
      if (s.glow) {
        svgEl.appendChild(svg('polyline', { points: pts, fill: 'none', stroke: s.color,
          'stroke-width': (s.width || 3) + 4, opacity: 0.16 }));
      }
      var line = svg('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2 });
      if (s.opacity != null) line.setAttribute('opacity', s.opacity);
      if (s.dash) line.setAttribute('stroke-dasharray', s.dash);
      svgEl.appendChild(line);
    });

    // CI band as a filled path (upper series forward + lower series back)
    if (opts.ciBand) {
      var up = opts.ciBand.upper, lo = opts.ciBand.lower;
      var d = 'M' + up.map(function (p) { return px(p[0]) + ',' + py(p[1]); }).join(' L');
      for (var i = lo.length - 1; i >= 0; i--) d += ' L' + px(lo[i][0]) + ',' + py(lo[i][1]);
      d += ' Z';
      svgEl.appendChild(svg('path', { d: d, fill: opts.ciBand.color, opacity: opts.ciBand.opacity || 0.13 }));
    }

    // markers (circle + optional label). m.fill solid (filled dot) vs default open ring.
    (opts.markers || []).forEach(function (m) {
      svgEl.appendChild(svg('circle', { cx: px(m.x), cy: py(m.y), r: m.r || 5.5,
        fill: m.fill || '#0c0e14', stroke: m.color || '#818cf8', 'stroke-width': m.strokeWidth || 2.5 }));
      if (m.label) svgEl.appendChild(textNode(px(m.x), pad.t + plotH + (m.labelDy || 32), m.label,
        { 'font-size': 10, 'font-weight': 600, fill: m.labelColor || '#a5b4fc',
          'text-anchor': m.labelAnchor || 'middle', 'font-family': "'IBM Plex Sans'" }));
    });
    return svgEl;
  }
  function textNode(x, y, str, attrs) {
    var t = svg('text', Object.assign({ x: x, y: y }, attrs || {}));
    t.textContent = str;
    return t;
  }

  /* small standalone polyline drawer for sparklines */
  function sparkline(svgEl, values, color) {
    clear(svgEl);
    var vb = (svgEl.getAttribute('viewBox') || '0 0 96 30').split(/\s+/).map(Number);
    var w = vb[2], h = vb[3], pad = 3;
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    var rng = (hi - lo) || 1;
    var pts = values.map(function (v, i) {
      var x = pad + (i / (values.length - 1)) * (w - 2 * pad);
      var y = pad + (1 - (v - lo) / rng) * (h - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    svgEl.appendChild(svg('polyline', { points: pts, fill: 'none', stroke: color, 'stroke-width': 2 }));
  }

  /* =======================================================================
   * Section renderers
   * ===================================================================== */

  function renderTopbar(vm) {
    $('account-name').textContent = vm.meta.account;
    $('last-synced').textContent = 'last synced ' + vm.meta.lastSyncedMin + ' min ago';
    var pill = $('status-pill');
    pill.className = 'pill ' + vm.globalStatus.level;
    pill.querySelector('.txt').textContent = vm.globalStatus.text;
  }

  function renderLeadTime(vm) {
    var lt = vm.leadTime, today = vm.meta.today;
    var dash = lt.dashboardSeries;
    var health = lt.healthSeries;             // observed, days 0..today, down = danger
    var proj = lt.healthProjSeries;           // projected, days today+1..today+projDays
    var watch = lt.watchHealth, danger = lt.dangerHealth;
    var xMax = today + lt.projDays;           // x axis extends past today by projDays
    var warnedAgo = Math.max(0, today - lt.crossWatchDay);

    // ----- lagging "today's dashboard" strip (flat & reassuring, separate axis) -----
    sparkline($('dash-strip-spark'), dash, '#34d399');
    $('dash-strip-score').textContent = lt.dashboardScore;
    var dtag = $('dash-strip-tag');
    if (lt.dashboardScore >= 80) { dtag.textContent = '✓ all green'; dtag.style.color = '#4ade80'; dtag.style.background = 'rgba(34,197,94,.13)'; }
    else { dtag.textContent = '⚠ finally dipping'; dtag.style.color = '#fca5a5'; dtag.style.background = 'rgba(239,68,68,.13)'; }

    // ----- hero: a single 0–100 HEALTH line that FALLS into danger -----
    var observedPts = health.map(function (v, i) { return [i, v]; });
    // projected segment starts at today's point so the dashed line joins the solid one
    var projPts = [[today, health[today]]].concat(proj.map(function (v, k) { return [today + 1 + k, v]; }));
    // the warning story only exists once Sentinel has crossed WATCH before today
    var showWarning = lt.warningGainedDays > 0 && lt.crossWatchDay < today;

    var bands = [
      // health zones — HEALTHY on top, DANGER at the bottom (down = bad)
      { fromY: watch, toY: 100, color: 'rgba(34,197,94,.08)' },
      { fromY: danger, toY: watch, color: 'rgba(245,158,11,.09)' },
      { fromY: 0, toY: danger, color: 'rgba(239,68,68,.11)' }
    ];
    var zoneLabels = [
      { x: 0, y: watch + (100 - watch) / 2, label: 'HEALTHY', color: '#4ade80' },
      { x: 0, y: danger + (watch - danger) / 2, label: 'WATCH', color: '#fbbf24' },
      { x: 0, y: danger / 2, label: 'DANGER', color: '#f87171' }
    ];
    var vlines = [{ x: today, color: '#6a7080', dash: '3 3', opacity: 0.65 }];
    var markers = [];
    if (showWarning) {
      // warning-gained band: Sentinel crossed WATCH → lagging tools react
      bands.push({ fromX: lt.crossWatchDay, toX: lt.dashDropDay, color: 'rgba(129,140,248,.14)' });
      zoneLabels.push({ x: (lt.crossWatchDay + lt.dashDropDay) / 2, y: 97, anchor: 'middle', size: 10,
        color: '#a5b4fc', label: '≈ ' + lt.warningGainedDays + ' days of warning gained' });
      vlines.push({ x: lt.crossWatchDay, color: '#818cf8', dash: '3 3', opacity: 0.55 });
      // Sentinel warned — open indigo ring sitting on the watch line
      markers.push({ x: lt.crossWatchDay, y: health[lt.crossWatchDay], color: '#818cf8', r: 6,
        label: '▲ Sentinel warned · ' + warnedAgo + 'd ago', labelColor: '#a5b4fc' });
      // today — filled grey dot where lagging tools finally notice
      markers.push({ x: today, y: health[today], color: '#8a90a0', fill: '#8a90a0', r: 5, strokeWidth: 0,
        label: '▲ reply rates now dropping', labelColor: '#8a90a0' });
    } else {
      // calm state: just mark today, no warning annotations
      markers.push({ x: today, y: health[today], color: '#8a90a0', fill: '#8a90a0', r: 5, strokeWidth: 0 });
    }

    renderLineChart($('leadtime-chart'), {
      xDomain: [0, xMax], yDomain: [0, 100],
      pad: { l: 76, r: 30, t: 16, b: 52 },
      bands: bands,
      zoneLabels: zoneLabels,
      hlines: [
        { y: danger, color: '#f87171', dash: '6 4', width: 1.2, opacity: 0.6, label: 'cliff' },
        { y: watch, color: '#fbbf24', dash: '6 4', width: 1.2, opacity: 0.6, label: 'watch' }
      ],
      vlines: vlines,
      yTicks: [{ y: 100, label: '100' }, { y: 50, label: '50' }, { y: 0, label: '0' }],
      yTitle: 'Health score',
      xTicks: [
        { x: 0, label: '30d ago' },
        { x: today, label: 'today', anchor: 'middle' },
        { x: xMax, label: '+' + lt.projDays + 'd', anchor: 'end' }
      ],
      series: [
        { points: observedPts, color: '#818cf8', width: 3, glow: true },
        { points: projPts, color: '#818cf8', width: 2, dash: '2 4', opacity: 0.55 }
      ],
      markers: markers
    });

    $('warn-badge').textContent = showWarning
      ? '◀ ≈ ' + lt.warningGainedDays + ' days of warning gained ▶'
      : '✓ all clear · no early warning needed';
  }

  function renderEspCard(prefix, card) {
    $(prefix + '-score').textContent = card.score;
    var circ = 2 * Math.PI * 37; // r=37
    var ring = $(prefix + '-ring');
    ring.setAttribute('stroke', card.ringColor);
    ring.setAttribute('stroke-dasharray', (card.score / 100 * circ).toFixed(1) + ' ' + circ.toFixed(1));
    var tag = $(prefix + '-tag');
    var tt = TIER_TAG[card.tier];
    tag.textContent = tt.label;
    tag.style.color = tt.cls === 'red' ? '#fca5a5' : tt.cls === 'amber' ? '#fbbf24' : '#4ade80';
    tag.style.background = tt.cls === 'red' ? 'rgba(239,68,68,.13)' : tt.cls === 'amber' ? 'rgba(245,158,11,.13)' : 'rgba(34,197,94,.13)';

    $(prefix + '-rate').textContent = card.smoothedRatePct;
    $(prefix + '-ci').textContent = card.ciUpperPct;

    var bar = $(prefix + '-rate-bar');
    bar.style.width = (card.rateBarPos * 100).toFixed(0) + '%';
    if (card.tier === 'healthy') bar.style.background = '#22c55e';
    else if (card.tier === 'critical') bar.style.background = 'linear-gradient(90deg,#fb923c,#ef4444)';
    else bar.style.background = 'linear-gradient(90deg,#fbbf24,#fb923c)';

    var proj = $(prefix + '-projection');
    var isCliff = card.daysToCliff != null;
    proj.querySelector('.t').textContent = card.projection;
    proj.style.color = isCliff ? '#fca5a5' : '#4ade80';
    proj.style.background = isCliff ? 'rgba(239,68,68,.13)' : 'rgba(34,197,94,.13)';
    proj.querySelector('.dot').style.background = isCliff ? '#ef4444' : '#22c55e';

    sparkline($(prefix + '-spark'), card.spark, isCliff ? '#ef4444' : '#22c55e');
  }

  function renderFailover(vm) {
    var fo = vm.failover;
    $('failover-current').textContent = '· ' + fo.current.domain;
    var wrap = $('failover-stages');
    clear(wrap);
    fo.stages.forEach(function (stage, i) {
      if (i > 0) wrap.appendChild(el('div', { class: 'fo-arrow' }, '→'));
      var d = el('div', { class: 'fo-stage' }, stage === fo.current.stage ? '● ' + stage : stage);
      if (stage === fo.current.stage) {
        d.classList.add('active-' + stage.toLowerCase());
        if (stage === 'Failover') d.appendChild(el('span', { style: 'opacity:.8; font-weight:400;' }, ' · current'));
      }
      wrap.appendChild(d);
    });
    var pool = $('standby-pool');
    clear(pool);
    fo.standby.forEach(function (s) {
      pool.appendChild(el('span', { title: s.domain + ' — Gmail ' + s.gmailHealth + ' / Outlook ' + s.outlookHealth }));
    });
  }

  function renderDomains(vm) {
    var body = $('domains-tbody');
    clear(body);
    var focal = vm.failover.current.domain;
    vm.domains.forEach(function (d) {
      var isFocal = d.domain === focal;
      var row = el('div', { class: 'trow' + (isFocal ? ' navrow is-interactive' : '') });
      if (isFocal) { row.setAttribute('title', 'Open domain detail'); row.setAttribute('data-step', '3'); }
      var nameCell = el('div', { class: 'mono', style: 'color:#e7e9f0;' }, d.domain);
      if (isFocal) nameCell.appendChild(el('span', { class: 'chev' }, '›'));
      row.appendChild(nameCell);
      // ESP split bar
      var split = el('div', { class: 'split' });
      split.appendChild(el('div', { style: 'flex:' + d.gmailSplit + '; background:#ea4335;' }));
      split.appendChild(el('div', { style: 'flex:' + d.outlookSplit + '; background:#0078d4;' }));
      split.appendChild(el('div', { style: 'flex:1; background:#3a4050;' }));
      row.appendChild(split);
      row.appendChild(el('div', { class: 'mono', style: 'font-weight:600; color:' + scoreColor(d.gmail) }, d.gmail));
      row.appendChild(el('div', { class: 'mono', style: 'color:' + scoreColor(d.outlook) }, d.outlook));
      var stwrap = el('div');
      var sc = STATE_COLOR[d.state] || STATE_COLOR.Healthy;
      var st = el('span', { class: 'state-tag', style: 'background:' + sc.fill + '; color:' + sc.text }, d.state);
      stwrap.appendChild(st);
      row.appendChild(stwrap);
      row.appendChild(el('div', { class: 'mono', style: 'color:#8a90a0; font-size:11px;' }, d.lastEvent));
      body.appendChild(row);
    });
  }
  function scoreColor(s) { return s >= 80 ? '#4ade80' : s >= 60 ? '#fbbf24' : '#f87171'; }

  function renderAlerts(vm) {
    var feed = $('alert-feed');
    clear(feed);
    if (!vm.alerts.length) { feed.appendChild(el('div', { style: 'color:#5a6070; font-size:12px; padding:14px 0;' }, 'No alerts.')); return; }
    vm.alerts.forEach(function (a) {
      var row = el('div', { class: 'alert ' + a.severity });
      row.appendChild(el('span', { class: 'adot' }));
      var b = el('div', { class: 'abody' });
      b.appendChild(el('div', { class: 'mono ats' }, a.ts));
      b.appendChild(el('div', { class: 'atext' }, a.headline));
      if (a.action) {
        var btn = el('button', { class: 'abtn ' + (a.severity === 'red' ? 'red' : 'ghost') }, a.action);
        b.appendChild(btn);
      }
      row.appendChild(b);
      feed.appendChild(row);
    });
  }

  function renderDetail(vm) {
    var d = vm.detail, g = vm.esp.gmail, days = vm.meta.days, today = vm.meta.today;
    $('detail-domain').textContent = vm.failover.current.domain;
    $('detail-score').innerHTML = g.score + '<span style="font-size:13px; color:#6a7080;">/100</span>';
    $('detail-score').className = 'mono val';
    $('detail-score').style.color = scoreColor(g.score);
    var dp = $('detail-state-pill');
    dp.className = 'pill ' + TIER_TAG[g.tier].cls;
    dp.style.padding = '4px 11px'; dp.style.fontSize = '11.5px';
    dp.querySelector('.txt').textContent = vm.failover.current.stage;

    // raw vs smoothed chart — y in % (0..0.40), so raw spikes past 0.30 are visible
    var toPct = function (s) { return s.map(function (v, i) { return [i, v * 100]; }); };
    renderLineChart($('raw-smoothed-chart'), {
      xDomain: [0, days - 1], yDomain: [0, 0.40],
      pad: { l: 86, r: 28, t: 20, b: 50 },
      bands: [{ fromY: 0.30, toY: 0.40, color: 'rgba(239,68,68,.07)' }],
      hlines: [
        { y: 0.30, color: '#ef4444', dash: '6 4', width: 1.3, opacity: 0.7, label: '0.30% cliff' },
        { y: 0.10, color: '#fbbf24', dash: '6 4', width: 1.3, opacity: 0.75, label: '0.10% watch line' }
      ],
      vlines: [{ x: d.crossWatchDay, color: '#818cf8', dash: '3 3', opacity: 0.5 }],
      yTicks: [
        { y: 0.40, label: '0.40%' }, { y: 0.30, label: '0.30%' }, { y: 0.20, label: '0.20%' },
        { y: 0.10, label: '0.10%' }, { y: 0, label: '0.00%' }
      ],
      yTitle: 'Complaint rate',
      xTicks: [
        { x: 0, label: '30d ago' }, { x: Math.floor((days - 1) / 2), label: '15d ago', anchor: 'middle' },
        { x: today, label: 'today', anchor: 'end' }
      ],
      ciBand: { upper: toPct(d.ciUpperSeries), lower: toPct(d.ciLowerSeries), color: '#818cf8', opacity: 0.13 },
      series: [
        { points: toPct(d.rawSeries), color: '#ef4444', width: 1.4, opacity: 0.55 },
        { points: toPct(d.smoothedSeries), color: '#818cf8', width: 3 }
      ],
      markers: [{ x: d.crossWatchDay, y: d.smoothedSeries[d.crossWatchDay] * 100, color: '#818cf8', r: 6 }]
    });

    var daysEarly = today - d.crossWatchDay;
    $('detail-callout').innerHTML = '▲ alert fired here — ' + daysEarly + ' days before the cliff &amp; trustworthy';

    // signal breakdown
    var sb = $('signal-breakdown');
    clear(sb);
    d.signals.forEach(function (s) {
      var wrap = el('div', { class: 'sig' });
      var top = el('div', { class: 'top' });
      var nm = el('div', { class: 'nm' }); nm.textContent = s.name;
      if (s.kind === 'leading') nm.appendChild(el('span', { class: 'ld' }, 'LEADING'));
      top.appendChild(nm);
      var vv = el('div', { class: 'mono vv', style: 'color:' + subColor(s.sub) }, s.value);
      top.appendChild(vv);
      wrap.appendChild(top);
      var bw = el('div', { class: 'barwrap' });
      var bar = el('div', { class: 'bar' });
      // bar shows how MUCH risk this signal contributes (100 - subscore)
      var fillPct = Math.round(100 - s.sub);
      bar.appendChild(el('div', { class: 'f', style: 'width:' + fillPct + '%; background:' + (s.kind === 'leading' ? '#818cf8' : '#5a6070') + ';' }));
      bw.appendChild(bar);
      bw.appendChild(el('div', { class: 'mono w' }, 'w ' + Math.round(s.weight * 100) + '%'));
      wrap.appendChild(bw);
      sb.appendChild(wrap);
    });

    // recommended action card
    var calm = vm.meta.scenario === 'healthy';
    var recCard = $('rec-card');
    recCard.className = 'rec' + (calm ? ' calm' : '');
    var steps = $('recommended-action');
    clear(steps);
    var stepList = calm
      ? ['Maintain current sending rotation and warm-up cadence', 'Keep standby pool warm', 'No throttle or failover required']
      : ['Throttle Gmail sends on this domain to 20%',
         'Fail traffic over to ' + (vm.failover.standby[1] ? vm.failover.standby[1].domain : 'standby-gmail-02'),
         'Hold in Cooldown until 7 consecutive clean days'];
    stepList.forEach(function (txt, i) {
      var step = el('div', { class: 'rec-step' });
      var n = el('span', { class: 'mono n', style: 'background:' + (calm ? '#1f6f43' : (i < 2 ? '#ef4444' : '#3a4050')) }, String(i + 1));
      step.appendChild(n);
      step.appendChild(document.createTextNode(txt));
      steps.appendChild(step);
    });
    $('rec-meta').textContent = calm ? 'all clear · monitoring' : 'failover playbook · 3 steps';
    $('rec-btn').textContent = calm ? 'No action needed' : 'Apply failover playbook';
    $('rec-btn').disabled = calm;
  }
  function subColor(sub) { return sub >= 70 ? '#d8dbe3' : sub >= 40 ? '#fbbf24' : '#f87171'; }

  /* =======================================================================
   * Top-level render — the single entry point render(viewModel)
   * ===================================================================== */
  function render(vm) {
    renderTopbar(vm);
    renderLeadTime(vm);
    renderEspCard('gmail', vm.esp.gmail);
    renderEspCard('outlook', vm.esp.outlook);
    renderFailover(vm);
    renderDomains(vm);
    renderAlerts(vm);
    renderDetail(vm);
  }

  global.Render = { render: render, renderLineChart: renderLineChart, sparkline: sparkline };
})(typeof window !== 'undefined' ? window : globalThis);
