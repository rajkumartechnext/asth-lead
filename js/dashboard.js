/* ==========================================================================
   Trombone — tableau de bord
   Données de démonstration générées de façon déterministe (même rendu à
   chaque chargement). Remplacez les fonctions de ce fichier par vos
   appels API : chaque graphique n'attend que des tableaux de nombres.
   ========================================================================== */

(() => {
  "use strict";

  const C = window.TromboneCharts;
  if (!C) return;

  /* Formats ---------------------------------------------------------------- */
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const moneyCompact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });
  const int = new Intl.NumberFormat("en-US");
  const fmtMoney = (v) => money.format(v);
  const fmtAxis = (v) => (v === 0 ? "0" : moneyCompact.format(v));

  const dayShort = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const dayMonth = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const dayLong = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  const monthShort = new Intl.DateTimeFormat("en-US", { month: "short" });
  const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

  /* Générateur pseudo-aléatoire déterministe ------------------------------ */
  function mulberry32(seed) {
    return () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12);

  /* En-tête : date du jour + salutation ------------------------------------ */
  const todayEl = document.querySelector("[data-today]");
  if (todayEl) {
    todayEl.textContent = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  }
  const greetEl = document.querySelector("[data-greeting]");
  if (greetEl) {
    const h = new Date().getHours();
    greetEl.textContent = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }

  /* Séries par période ----------------------------------------------------- */
  // Profil hebdomadaire : plus de ventes en semaine qu'au week-end
  const weekdayFactor = [0.55, 1.12, 1.2, 1.1, 1.05, 1.0, 0.7]; // dim → sam

  function dailySeries(days, seed) {
    const rnd = mulberry32(seed);
    const labels = [];
    const long = [];
    const values = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = addDays(today, -i);
      labels.push(days <= 7 ? dayShort.format(d) : dayMonth.format(d));
      long.push(dayLong.format(d));
      const trend = 1 + (days - i) / days / 6;
      values.push(Math.round(5200 * weekdayFactor[d.getDay()] * trend * (0.9 + rnd() * 0.2)));
    }
    return { labels, long, values };
  }

  function weeklySeries(weeks, seed) {
    const rnd = mulberry32(seed);
    const labels = [];
    const long = [];
    const values = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = addDays(today, -i * 7 - 6);
      labels.push(dayMonth.format(start));
      long.push(`Week of ${dayMonth.format(start)}`);
      values.push(Math.round(36000 * (1 + (weeks - i) / weeks / 5) * (0.85 + rnd() * 0.3)));
    }
    return { labels, long, values };
  }

  function monthlySeries(months, seed) {
    const rnd = mulberry32(seed);
    const season = [0.82, 0.8, 0.9, 0.92, 0.95, 0.88, 0.84, 0.8, 1.02, 1.1, 1.24, 1.38]; // jan → déc
    const labels = [];
    const long = [];
    const values = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(monthShort.format(d));
      long.push(monthLong.format(d));
      values.push(Math.round(148000 * season[d.getMonth()] * (1 + (months - i) / months / 8) * (0.92 + rnd() * 0.16)));
    }
    return { labels, long, values };
  }

  const RANGES = {
    "7d": {
      series: () => dailySeries(7, 7),
      subtitle: "Daily membership fees, last 7 days",
      note: "vs. previous 7 days",
      aov: 138,
      margin: 43.4,
      outstanding: 36940,
      deltas: { revenue: 5.2, orders: 3.4, margin: 0.8, outstanding: -2.1 },
      channels: [0.44, 0.27, 0.18, 0.11],
    },
    "30d": {
      series: () => dailySeries(30, 30),
      subtitle: "Daily membership fees, last 30 days",
      note: "vs. previous 30 days",
      aov: 143,
      margin: 42.8,
      outstanding: 36940,
      deltas: { revenue: 12.4, orders: 8.1, margin: 1.6, outstanding: -4.3 },
      channels: [0.41, 0.29, 0.19, 0.11],
    },
    "90d": {
      series: () => weeklySeries(13, 90),
      subtitle: "Weekly membership fees, last 13 weeks",
      note: "vs. previous quarter",
      aov: 146,
      margin: 41.9,
      outstanding: 36940,
      deltas: { revenue: 9.7, orders: 6.2, margin: 0.9, outstanding: 3.8 },
      channels: [0.39, 0.31, 0.19, 0.11],
    },
    "12m": {
      series: () => monthlySeries(12, 12),
      subtitle: "Monthly membership fees, last 12 months",
      note: "vs. previous 12 months",
      aov: 151,
      margin: 41.2,
      outstanding: 36940,
      deltas: { revenue: 18.3, orders: 11.5, margin: 2.4, outstanding: -6.8 },
      channels: [0.37, 0.33, 0.18, 0.12],
    },
  };

  // Pour l'encours, une baisse est une bonne nouvelle
  const LOWER_IS_BETTER = new Set(["outstanding"]);

  const CHANNELS = [
    { label: "Website", color: "--coral" },
    { label: "Referrals", color: "--yellow" },
    { label: "Events", color: "--green" },
    { label: "Social media", color: "--mint" },
  ];

  /* Rendu ------------------------------------------------------------------ */
  let revenueChart;
  let channelChart;
  const sparks = {};

  function setDelta(key, value, unit = "%") {
    const el = document.querySelector(`[data-kpi-delta="${key}"]`);
    if (!el) return;
    const up = value >= 0;
    const good = LOWER_IS_BETTER.has(key) ? !up : up;
    el.classList.toggle("delta--down", !good);
    el.querySelector("use").setAttribute("href", up ? "#i-arrow-up" : "#i-arrow-down");
    el.querySelector("span").textContent = `${Math.abs(value).toFixed(1)}${unit}`;
    el.setAttribute("aria-label", `${up ? "Up" : "Down"} ${Math.abs(value).toFixed(1)}${unit === "%" ? " percent" : " points"}`);
  }

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach((el) => (el.textContent = text));
  }

  // Transforme une série en sparkline de 12 points max.
  // Each point is the average of the 7 days before it, so the weekly rhythm
  // (quiet weekends) does not turn the sparkline into a zigzag.
  const toSpark = (values, n = 12) => {
    if (values.length <= n) return values;
    const smooth = values.map((_, i) => {
      const week = values.slice(Math.max(0, i - 6), i + 1);
      return week.reduce((a, b) => a + b, 0) / week.length;
    });
    // Skip the first week when there is room: its average covers fewer days.
    const from = values.length >= n + 6 ? 6 : 0;
    const span = values.length - 1 - from;
    return Array.from({ length: n }, (_, i) => Math.round(smooth[from + Math.round((span * i) / (n - 1))]));
  };

  function renderRange(key) {
    const cfg = RANGES[key];
    const { labels, long, values } = cfg.series();
    const total = values.reduce((a, b) => a + b, 0);
    const bestIndex = values.indexOf(Math.max(...values));
    const orders = Math.round(total / cfg.aov);

    // KPI
    setText('[data-kpi="revenue"]', fmtMoney(total));
    setText('[data-kpi="orders"]', int.format(orders));
    setText('[data-kpi="margin"]', `${cfg.margin.toFixed(1)}%`);
    setText('[data-kpi="outstanding"]', fmtMoney(cfg.outstanding));
    setText("[data-kpi-note]", cfg.note);
    setDelta("revenue", cfg.deltas.revenue);
    setDelta("orders", cfg.deltas.orders);
    setDelta("margin", cfg.deltas.margin, " pts");
    setDelta("outstanding", cfg.deltas.outstanding);

    // Sparklines
    const rnd = mulberry32(values.length);
    const spark = toSpark(values);
    const sparkLabels = spark.map((_, i) => `Period ${i + 1}`);
    const sparkData = {
      revenue: { values: spark, color: "--yellow", format: fmtAxis },
      orders: { values: spark.map((v, i) => Math.round(((v * 7) / cfg.aov) * (0.97 + i * 0.004))), color: "--coral", format: (v) => int.format(v) },
      margin: { values: spark.map((_, i) => +(cfg.margin - 1.4 + i * 0.13 + rnd() * 0.5).toFixed(1)), color: "--green", format: (v) => `${v}%` },
      outstanding: { values: spark.map((_, i) => Math.round(cfg.outstanding * (1.12 - i * 0.012 + rnd() * 0.05))), color: "--mint", format: fmtAxis },
    };
    Object.entries(sparkData).forEach(([k, data]) => {
      const opts = { ...data, labels: sparkLabels };
      if (sparks[k]) sparks[k].update(opts);
      else sparks[k] = C.sparkline(`[data-spark="${k}"]`, opts);
    });

    // Histogramme
    setText("[data-rev-subtitle]", cfg.subtitle);
    setText("[data-rev-total]", fmtMoney(total));
    setText("[data-rev-best]", `${long[bestIndex]} · ${fmtMoney(values[bestIndex])}`);
    const barOptions = {
      labels, values, tooltipLabels: long, name: "Membership fees",
      format: fmtMoney, axisFormat: fmtAxis, highlight: values.length - 1, accent: "--coral",
    };
    if (revenueChart) revenueChart.update(barOptions);
    else revenueChart = C.bar("#revenueChart", barOptions);

    // Vue tableau (accessibilité)
    const tableView = document.getElementById("revTable");
    if (tableView) {
      tableView.innerHTML = `<table class="table table--compact"><thead><tr><th scope="col">Period</th><th scope="col" class="text-right">Membership fees</th></tr></thead><tbody>${values
        .map((v, i) => `<tr><td>${long[i]}</td><td class="text-right mono">${fmtMoney(v)}</td></tr>`)
        .join("")}</tbody></table>`;
    }

    // Donut canaux
    const items = CHANNELS.map((c, i) => ({ ...c, value: Math.round(total * cfg.channels[i]) }));
    const center = { value: document.querySelector("[data-donut-value]"), label: document.querySelector("[data-donut-label]") };
    const resetCenter = () => {
      center.value.textContent = moneyCompact.format(total);
      center.label.textContent = "Total";
    };
    resetCenter();
    const donutOptions = {
      items, format: fmtMoney,
      onHover(item) {
        if (!item) return resetCenter();
        center.value.textContent = `${Math.round((item.value / total) * 100)}%`;
        center.label.textContent = item.label;
      },
    };
    if (channelChart) channelChart.update(donutOptions);
    else channelChart = C.donut("#channelChart", donutOptions);

    const legend = document.getElementById("channelLegend");
    if (legend) {
      legend.innerHTML = items
        .map((it) => `<li tabindex="0"><span class="dot" style="--tone: var(${it.color})"></span><span>${it.label}</span><b>${moneyCompact.format(it.value)}</b><span class="pct">${Math.round((it.value / total) * 100)}%</span></li>`)
        .join("");
      [...legend.children].forEach((li, i) => {
        const on = () => {
          const segs = document.getElementById("channelChart").tromboneSegments;
          segs && segs[i] && segs[i].highlight(true);
          donutOptions.onHover(items[i]);
        };
        const off = () => {
          const segs = document.getElementById("channelChart").tromboneSegments;
          segs && segs[i] && segs[i].highlight(false);
          resetCenter();
        };
        li.addEventListener("mouseenter", on);
        li.addEventListener("mouseleave", off);
        li.addEventListener("focus", on);
        li.addEventListener("blur", off);
      });
    }
  }

  /* Flux de trésorerie (12 mois, fixe) ------------------------------------- */
  (function renderCashflow() {
    const rnd = mulberry32(2026);
    const labels = [];
    const long = [];
    const cashIn = [];
    const cashOut = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(monthShort.format(d));
      long.push(monthLong.format(d));
      const base = 150000 + (11 - i) * 5200;
      cashIn.push(Math.round(base * (0.9 + rnd() * 0.22)));
      cashOut.push(Math.round(base * (0.78 + rnd() * 0.2)));
    }
    C.line("#cashflowChart", {
      labels, tooltipLabels: long, format: fmtMoney, axisFormat: fmtAxis,
      series: [
        { name: "Cash in", values: cashIn, color: "--chart-ink", area: true },
        { name: "Cash out", values: cashOut, color: "--coral", dashed: true },
      ],
      tooltipExtra: (i) => {
        const net = cashIn[i] - cashOut[i];
        return `<div class="tt-row" style="margin-top:.25rem;padding-top:.25rem;border-top:1px solid #333"><span>Net fees</span><b>${net >= 0 ? "+" : "−"}${fmtMoney(Math.abs(net))}</b></div>`;
      },
    });
  })();

  /* Carte de chaleur : commandes par jour et par heure --------------------- */
  (function renderHeatmap() {
    const rnd = mulberry32(42);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hours = Array.from({ length: 12 }, (_, i) => `${8 + i}h`);
    const dayWeight = [1, 1.18, 1.05, 1.02, 0.92, 0.32, 0.18];
    const hourWeight = [0.35, 0.7, 1, 0.95, 0.7, 0.55, 0.8, 0.9, 0.75, 0.55, 0.4, 0.25];
    const values = dayWeight.map((dw) => hourWeight.map((hw) => Math.round(42 * dw * hw * (0.75 + rnd() * 0.5))));

    C.heatmap("#heatmapChart", { rows: days, rowNames: dayNames, cols: hours, values, format: (v) => `${v}` });

    let peak = { v: -1 };
    values.forEach((row, r) => row.forEach((v, c) => v > peak.v && (peak = { v, r, c })));
    const totals = values.map((row) => row.reduce((a, b) => a + b, 0));
    const all = totals.reduce((a, b) => a + b, 0);
    setText("[data-heat-peak]", `${days[peak.r]} ${hours[peak.c]}`);
    setText("[data-heat-day]", dayNames[totals.indexOf(Math.max(...totals))]);
    setText("[data-heat-weekend]", `${Math.round(((totals[5] + totals[6]) / all) * 100)}%`);
  })();

  /* Sélecteur de période --------------------------------------------------- */
  const group = document.querySelector("[data-range-group]");
  if (group) {
    group.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-range]");
      if (!btn) return;
      group.querySelectorAll("[data-range]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderRange(btn.dataset.range);
    });
  }

  renderRange("30d");
})();
