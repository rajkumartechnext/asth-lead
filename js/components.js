/* Trombone — graphiques de démonstration de la page « UI components » */
(() => {
  "use strict";

  const C = window.TromboneCharts;
  if (!C) return;

  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

  C.line("#demoLine", {
    labels: months,
    series: [
      { name: "This year", values: [42, 48, 45, 58, 62, 71], color: "--chart-ink", area: true },
      { name: "Last year", values: [38, 40, 44, 47, 50, 55], color: "--coral", dashed: true },
    ],
  });

  C.bar("#demoBar", {
    labels: months,
    values: [18, 24, 21, 30, 27, 34],
    name: "Orders",
  });
})();
