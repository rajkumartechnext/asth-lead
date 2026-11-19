/* ==========================================================================
   Trombone — mini librairie de graphiques SVG (sans dépendance)
   API : TromboneCharts.bar / line / donut / sparkline / heatmap
   Chaque graphique se redessine au redimensionnement et au changement de
   thème, et lit ses couleurs dans les variables CSS (--chart-*, --coral…).
   ========================================================================== */

(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const charts = new Set();

  const cssVar = (name) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  const color = (value) => (value && value.startsWith("--") ? cssVar(value) : value);

  const svgEl = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* Échelle « ronde » pour l'axe Y ---------------------------------------- */
  function niceScale(maxValue, tickCount = 4) {
    if (maxValue <= 0) return { max: 1, step: 0.25 };
    const raw = maxValue / tickCount;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const n = raw / magnitude;
    const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * magnitude;
    return { max: step * Math.ceil(maxValue / step), step };
  }

  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const defaultFormat = (v) => compact.format(v);

  /* Infobulle partagée par graphique -------------------------------------- */
  function createTooltip(container) {
    const tip = document.createElement("div");
    tip.className = "chart-tooltip";
    tip.setAttribute("aria-hidden", "true");
    container.appendChild(tip);

    return {
      show(html, x, y) {
        tip.innerHTML = html;
        tip.classList.add("is-visible");
        const cw = container.clientWidth;
        const tw = tip.offsetWidth;
        const th = tip.offsetHeight;
        let left = x + 14;
        if (left + tw > cw) left = x - tw - 14;
        left = Math.max(0, left);
        const top = Math.max(-th / 2, y - th - 10);
        tip.style.left = `${left}px`;
        tip.style.top = `${top}px`;
      },
      hide() {
        tip.classList.remove("is-visible");
      },
    };
  }

  const tooltipRow = (label, value, tone) =>
    `<div class="tt-row">${tone ? `<span class="dot" style="--tone:${tone}"></span>` : ""}<span>${label}</span><b>${value}</b></div>`;

  /* Cycle de vie commun ---------------------------------------------------- */
  function mount(container, options, render) {
    if (typeof container === "string") container = document.querySelector(container);
    if (!container) return null;

    const chart = {
      container,
      options,
      firstRender: true,
      render() {
        container.querySelectorAll(":scope > svg, :scope > .chart-tooltip").forEach((n) => n.remove());
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true" });
        container.insertBefore(svg, container.firstChild);
        const tooltip = createTooltip(container);
        render({ svg, width, height, tooltip, options: chart.options, animate: chart.firstRender && !reducedMotion.matches });
        chart.firstRender = false;
      },
      update(newOptions) {
        chart.options = { ...chart.options, ...newOptions };
        chart.firstRender = true;
        chart.render();
      },
    };

    let frame;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => chart.render());
    });
    ro.observe(container);
    charts.add(chart);
    chart.render();
    return chart;
  }

  const rerenderAll = () => charts.forEach((c) => c.render());
  document.addEventListener("trombone:themechange", rerenderAll);

  /* Axe Y + grille --------------------------------------------------------- */
  function drawYAxis(svg, { top, left, right, innerH, width, scale, format }) {
    const grid = svgEl("g", {}, svg);
    for (let v = 0; v <= scale.max + 1e-9; v += scale.step) {
      const y = top + innerH - (v / scale.max) * innerH;
      svgEl("line", {
        x1: left, x2: width - right, y1: y, y2: y,
        stroke: v === 0 ? cssVar("--chart-axis") : cssVar("--chart-grid"),
        "stroke-width": v === 0 ? 1 : 1,
        "stroke-opacity": v === 0 ? 0.5 : 1,
      }, grid);
      const label = svgEl("text", { x: left - 10, y: y + 4, "text-anchor": "end" }, grid);
      label.textContent = format(v);
    }
  }

  /* Libellés X espacés pour éviter les collisions */
  function drawXLabels(svg, labels, xAt, y, innerW) {
    const maxLabels = Math.max(2, Math.floor(innerW / 52));
    const every = Math.ceil(labels.length / maxLabels);
    const last = labels.length - 1;
    labels.forEach((text, i) => {
      if (i !== last && i % every !== 0) return;
      if (i !== last && i !== 0 && last - i < every * 0.75) return;
      if (i === last && every > 1 && last % every !== 0 && last % every < every * 0.75) return;
      const t = svgEl("text", { x: xAt(i), y, "text-anchor": "middle" }, svg);
      t.textContent = text;
    });
  }

  /* Chemin de barre : haut arrondi 4px, base droite sur l'axe */
  function barPath(x, y, w, h, r = 4) {
    if (h <= 0) return "";
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  /* ------------------------------------------------------------------------
     Histogramme
     options : { labels, values, format, highlight (index), name,
                 tooltipLabels (libellés longs pour l'infobulle) }
     ------------------------------------------------------------------------ */
  function bar(container, options) {
    return mount(container, options, ({ svg, width, height, tooltip, options: o, animate }) => {
      const format = o.format || defaultFormat;
      const axisFormat = o.axisFormat || defaultFormat;
      const margin = { top: 22, right: 4, bottom: 26, left: 46 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const scale = niceScale(Math.max(...o.values));
      drawYAxis(svg, { ...margin, innerH, width, scale, format: axisFormat });

      const n = o.values.length;
      const band = innerW / n;
      const barW = Math.max(3, Math.min(band - 2, band * 0.64, 34));
      const hi = o.highlight ?? n - 1;
      const xAt = (i) => margin.left + band * i + band / 2;
      const yAt = (v) => margin.top + innerH - (v / scale.max) * innerH;

      const soft = cssVar("--chart-ink-soft");
      const ink = cssVar("--chart-ink");
      const accent = color(o.accent || "--coral");
      const outline = cssVar("--color-outline");

      const bars = o.values.map((v, i) => {
        const y = yAt(v);
        const isHi = i === hi;
        const path = svgEl("path", {
          d: barPath(xAt(i) - barW / 2, y, barW, margin.top + innerH - y),
          fill: isHi ? accent : soft,
          stroke: isHi ? outline : "none",
          "stroke-width": isHi ? 1.5 : 0,
        }, svg);
        if (animate) {
          path.style.transformBox = "fill-box";
          path.style.transformOrigin = "50% 100%";
          path.animate(
            [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
            { duration: 700, delay: i * (300 / n), easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }
          );
        }
        return path;
      });

      // Étiquette directe sur la barre mise en avant uniquement
      const hiLabel = svgEl("text", {
        x: xAt(hi), y: yAt(o.values[hi]) - 8, "text-anchor": "middle",
        style: `fill:${cssVar("--color-text")};font-weight:700;font-size:12px`,
      }, svg);
      hiLabel.textContent = format(o.values[hi]);

      drawXLabels(svg, o.labels, xAt, height - 6, innerW);

      // Zones de survol plus larges que les barres
      o.values.forEach((v, i) => {
        const hit = svgEl("rect", {
          class: "chart-hit", x: margin.left + band * i, y: margin.top,
          width: band, height: innerH,
        }, svg);
        hit.addEventListener("mouseenter", () => {
          bars.forEach((b, j) => {
            if (j !== hi) b.setAttribute("fill", j === i ? ink : soft);
          });
          const label = (o.tooltipLabels || o.labels)[i];
          tooltip.show(
            `<div class="tt-title">${label}</div>${tooltipRow(o.name || "Value", format(v), i === hi ? accent : ink)}`,
            xAt(i), yAt(v)
          );
        });
        hit.addEventListener("mouseleave", () => {
          bars.forEach((b, j) => j !== hi && b.setAttribute("fill", soft));
          tooltip.hide();
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Courbes (un seul axe Y, séries de même unité)
     options : { labels, series: [{ name, values, color, dashed, area }], format }
     ------------------------------------------------------------------------ */
  function line(container, options) {
    return mount(container, options, ({ svg, width, height, tooltip, options: o, animate }) => {
      const format = o.format || defaultFormat;
      const axisFormat = o.axisFormat || defaultFormat;
      const margin = { top: 14, right: 70, bottom: 26, left: 46 };
      const innerW = width - margin.left - margin.right;
      const innerH = height - margin.top - margin.bottom;
      const all = o.series.flatMap((s) => s.values);
      const scale = niceScale(Math.max(...all));
      drawYAxis(svg, { ...margin, innerH, width, scale, format: axisFormat });

      const n = o.labels.length;
      const xAt = (i) => margin.left + (innerW * i) / (n - 1);
      const yAt = (v) => margin.top + innerH - (v / scale.max) * innerH;
      const surface = cssVar("--chart-surface");

      // Dégradé pour l'aire de la première série
      const defs = svgEl("defs", {}, svg);
      const gradId = `grad-${Math.random().toString(36).slice(2, 8)}`;
      const grad = svgEl("linearGradient", { id: gradId, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);

      o.series.forEach((s, si) => {
        const c = color(s.color);
        const points = s.values.map((v, i) => [xAt(i), yAt(v)]);
        const d = points.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join("");

        if (s.area) {
          svgEl("stop", { offset: "0%", "stop-color": c, "stop-opacity": 0.14 }, grad);
          svgEl("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0 }, grad);
          svgEl("path", {
            d: `${d}L${xAt(n - 1)},${yAt(0)}L${xAt(0)},${yAt(0)}Z`,
            fill: `url(#${gradId})`,
          }, svg);
        }

        const path = svgEl("path", {
          d, fill: "none", stroke: c, "stroke-width": s.width || 2.5,
          "stroke-linejoin": "round", "stroke-linecap": "round",
          "stroke-dasharray": s.dashed ? "6 5" : "none",
        }, svg);

        if (animate && !s.dashed) {
          const len = path.getTotalLength();
          path.animate(
            [{ strokeDasharray: `${len}`, strokeDashoffset: len }, { strokeDasharray: `${len}`, strokeDashoffset: 0 }],
            { duration: 1100, delay: si * 150, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
          );
        }

        // Point final + étiquette directe (nom de la série)
        const [ex, ey] = points[n - 1];
        svgEl("circle", { cx: ex, cy: ey, r: 4.5, fill: c, stroke: surface, "stroke-width": 2 }, svg);
        const lbl = svgEl("text", {
          x: ex + 10, y: ey + 4,
          style: `fill:${cssVar("--color-text")};font-weight:600`,
        }, svg);
        lbl.textContent = s.name;
      });

      // Anti-collision simple des étiquettes de fin
      const labels = [...svg.querySelectorAll("text[style*='font-weight:600']")];
      if (labels.length === 2) {
        const [a, b] = labels.map((t) => +t.getAttribute("y"));
        if (Math.abs(a - b) < 14) {
          const mid = (a + b) / 2;
          labels[0].setAttribute("y", a <= b ? mid - 5 : mid + 11);
          labels[1].setAttribute("y", a <= b ? mid + 11 : mid - 5);
        }
      }

      drawXLabels(svg, o.labels, xAt, height - 6, innerW);

      // Couche de survol : réticule + points
      const cross = svgEl("line", {
        y1: margin.top, y2: margin.top + innerH, stroke: cssVar("--chart-axis"),
        "stroke-width": 1, "stroke-dasharray": "3 3", opacity: 0,
      }, svg);
      const dots = o.series.map((s) =>
        svgEl("circle", { r: 5, fill: color(s.color), stroke: surface, "stroke-width": 2, opacity: 0 }, svg)
      );
      const hit = svgEl("rect", {
        class: "chart-hit", x: margin.left, y: margin.top, width: innerW, height: innerH,
      }, svg);

      const onMove = (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * width;
        const i = Math.max(0, Math.min(n - 1, Math.round(((x - margin.left) / innerW) * (n - 1))));
        const cx = xAt(i);
        cross.setAttribute("x1", cx);
        cross.setAttribute("x2", cx);
        cross.setAttribute("opacity", 1);
        dots.forEach((dot, si) => {
          dot.setAttribute("cx", cx);
          dot.setAttribute("cy", yAt(o.series[si].values[i]));
          dot.setAttribute("opacity", 1);
        });
        const rows = o.series.map((s) => tooltipRow(s.name, format(s.values[i]), color(s.color))).join("");
        const extra = o.tooltipExtra ? o.tooltipExtra(i) : "";
        tooltip.show(`<div class="tt-title">${(o.tooltipLabels || o.labels)[i]}</div>${rows}${extra}`, cx, Math.min(...o.series.map((s) => yAt(s.values[i]))));
      };
      hit.addEventListener("mousemove", onMove);
      hit.addEventListener("mouseleave", () => {
        cross.setAttribute("opacity", 0);
        dots.forEach((d) => d.setAttribute("opacity", 0));
        tooltip.hide();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Donut
     options : { items: [{ label, value, color }], format,
                 onHover(item|null) }
     ------------------------------------------------------------------------ */
  function donut(container, options) {
    return mount(container, options, ({ svg, width, height, tooltip, options: o, animate }) => {
      const format = o.format || defaultFormat;
      const size = Math.min(width, height);
      const cx = width / 2;
      const cy = height / 2;
      const r = size / 2 - 6;
      const inner = r * 0.62;
      const total = o.items.reduce((sum, it) => sum + it.value, 0);
      const outline = cssVar("--color-outline");
      const gap = 0.025; // espace angulaire entre segments (radians)

      const arc = (a0, a1, ro, ri) => {
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const p = (a, rad) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
        const [x0, y0] = p(a0, ro);
        const [x1, y1] = p(a1, ro);
        const [x2, y2] = p(a1, ri);
        const [x3, y3] = p(a0, ri);
        return `M${x0},${y0}A${ro},${ro} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${ri},${ri} 0 ${large} 0 ${x3},${y3}Z`;
      };

      let angle = 0;
      const segments = o.items.map((it, i) => {
        const sweep = (it.value / total) * Math.PI * 2;
        const a0 = angle + gap / 2;
        const a1 = angle + sweep - gap / 2;
        const mid = angle + sweep / 2;
        angle += sweep;
        const path = svgEl("path", {
          d: arc(a0, a1, r, inner), fill: color(it.color),
          stroke: outline, "stroke-width": 1.5, "stroke-linejoin": "round",
          style: "cursor:pointer;transition:transform 200ms cubic-bezier(0.22,1,0.36,1)",
        }, svg);
        if (animate) {
          path.animate([{ opacity: 0, transform: "scale(0.92)" }, { opacity: 1, transform: "scale(1)" }], {
            duration: 500, delay: i * 90, easing: "ease-out", fill: "backwards",
          });
          path.style.transformOrigin = `${cx}px ${cy}px`;
        }
        const highlight = (on) => {
          const dx = Math.sin(mid) * 5;
          const dy = -Math.cos(mid) * 5;
          path.style.transform = on ? `translate(${dx}px, ${dy}px)` : "";
        };
        path.addEventListener("mouseenter", () => {
          highlight(true);
          const pct = ((it.value / total) * 100).toFixed(1);
          tooltip.show(
            `<div class="tt-title">${it.label}</div>${tooltipRow("Revenue", format(it.value), color(it.color))}${tooltipRow("Share", pct + "%")}`,
            cx + Math.sin(mid) * r, cy - Math.cos(mid) * r
          );
          o.onHover && o.onHover(it, i);
        });
        path.addEventListener("mouseleave", () => {
          highlight(false);
          tooltip.hide();
          o.onHover && o.onHover(null);
        });
        return { path, highlight };
      });
      // Permet à une légende HTML de mettre un segment en avant
      svg.closest(".chart").tromboneSegments = segments;
    });
  }

  /* ------------------------------------------------------------------------
     Sparkline (indicateurs)
     options : { values, labels, color, format }
     ------------------------------------------------------------------------ */
  function sparkline(container, options) {
    return mount(container, options, ({ svg, width, height, tooltip, options: o }) => {
      const format = o.format || defaultFormat;
      const pad = 5;
      const min = Math.min(...o.values);
      const max = Math.max(...o.values);
      const span = max - min || 1;
      const n = o.values.length;
      const xAt = (i) => pad + ((width - pad * 2) * i) / (n - 1);
      const yAt = (v) => pad + (height - pad * 2) * (1 - (v - min) / span);
      const ink = cssVar("--chart-ink");
      const d = o.values.map((v, i) => `${i ? "L" : "M"}${xAt(i)},${yAt(v)}`).join("");

      svgEl("path", { d, fill: "none", stroke: ink, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      svgEl("circle", {
        cx: xAt(n - 1), cy: yAt(o.values[n - 1]), r: 4,
        fill: color(o.color || "--yellow"), stroke: cssVar("--color-outline"), "stroke-width": 1.5,
      }, svg);

      const dot = svgEl("circle", { r: 3.5, fill: ink, opacity: 0 }, svg);
      const hit = svgEl("rect", { class: "chart-hit", x: 0, y: 0, width, height }, svg);
      hit.addEventListener("mousemove", (event) => {
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * width;
        const i = Math.max(0, Math.min(n - 1, Math.round(((x - pad) / (width - pad * 2)) * (n - 1))));
        dot.setAttribute("cx", xAt(i));
        dot.setAttribute("cy", yAt(o.values[i]));
        dot.setAttribute("opacity", 1);
        tooltip.show(`<div class="tt-title">${o.labels ? o.labels[i] : ""}</div><div class="tt-row"><b style="padding:0;margin:0">${format(o.values[i])}</b></div>`, xAt(i), yAt(o.values[i]));
      });
      hit.addEventListener("mouseleave", () => {
        dot.setAttribute("opacity", 0);
        tooltip.hide();
      });
    });
  }

  /* ------------------------------------------------------------------------
     Carte de chaleur (rampe séquentielle en niveaux de gris)
     options : { rows, cols, values: number[][], format, colLabelEvery }
     ------------------------------------------------------------------------ */
  function heatmap(container, options) {
    return mount(container, options, ({ svg, width, height, tooltip, options: o, animate }) => {
      const format = o.format || ((v) => `${v}`);
      const margin = { top: 0, right: 0, bottom: 22, left: 38 };
      const rows = o.rows.length;
      const cols = o.cols.length;
      const gap = 3;
      const cellW = (width - margin.left - margin.right - gap * (cols - 1)) / cols;
      const cellH = (height - margin.top - margin.bottom - gap * (rows - 1)) / rows;
      const max = Math.max(...o.values.flat());
      const ramp = [1, 2, 3, 4, 5].map((k) => cssVar(`--chart-seq-${k}`));
      const step = (v) => (v <= 0 ? 0 : Math.min(4, Math.floor((v / max) * 4.999)));
      const outline = cssVar("--chart-ink");

      o.rows.forEach((label, r) => {
        const t = svgEl("text", { x: 0, y: margin.top + r * (cellH + gap) + cellH / 2 + 4 }, svg);
        t.textContent = label;
      });
      const every = o.colLabelEvery || (cellW < 22 ? 2 : 1);
      o.cols.forEach((label, c) => {
        if (c % every) return;
        const t = svgEl("text", {
          x: margin.left + c * (cellW + gap) + cellW / 2, y: height - 6, "text-anchor": "middle",
        }, svg);
        t.textContent = label;
      });

      o.values.forEach((row, r) => {
        row.forEach((v, c) => {
          const x = margin.left + c * (cellW + gap);
          const y = margin.top + r * (cellH + gap);
          const cell = svgEl("rect", {
            x, y, width: cellW, height: cellH, rx: 4, fill: ramp[step(v)],
            style: "cursor:crosshair",
          }, svg);
          if (animate) {
            cell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: (r + c) * 18, fill: "backwards" });
          }
          cell.addEventListener("mouseenter", () => {
            cell.setAttribute("stroke", outline);
            cell.setAttribute("stroke-width", 2);
            tooltip.show(`<div class="tt-title">${o.rowNames ? o.rowNames[r] : o.rows[r]} · ${o.cols[c]}</div>${tooltipRow("Orders", format(v))}`, x + cellW / 2, y);
          });
          cell.addEventListener("mouseleave", () => {
            cell.removeAttribute("stroke");
            tooltip.hide();
          });
        });
      });
    });
  }

  window.TromboneCharts = { bar, line, donut, sparkline, heatmap, cssVar };
})();
