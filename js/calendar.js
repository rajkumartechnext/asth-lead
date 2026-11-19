(() => {
  "use strict";

  const grid = document.querySelector("[data-calendar-grid]");
  const title = document.querySelector("[data-calendar-title]");
  if (!grid || !title) return;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const today = new Date();
  let cursor = new Date(today.getFullYear(), today.getMonth(), 1);

  const events = [
    { day: 3, monthOffset: 0, title: "Design review", time: "09:30", tone: "tone-coral" },
    { day: 5, monthOffset: 0, title: "Team stand-up", time: "10:00", tone: "tone-mint" },
    { day: 9, monthOffset: 0, title: "Supplier call", time: "11:30", tone: "tone-yellow" },
    { day: 12, monthOffset: 0, title: "Sales planning", time: "14:00", tone: "tone-green" },
    { day: 16, monthOffset: 0, title: "Invoice review", time: "15:30", tone: "tone-coral" },
    { day: 18, monthOffset: 0, title: "Product sync", time: "10:30", tone: "tone-mint" },
    { day: 20, monthOffset: 0, title: "Campaign launch", time: "09:00", tone: "tone-yellow" },
    { day: 23, monthOffset: 0, title: "Stock audit", time: "13:00", tone: "tone-green" },
    { day: 26, monthOffset: 0, title: "Client call", time: "16:00", tone: "tone-coral" },
    { day: 30, monthOffset: 0, title: "Month close", time: "11:00", tone: "tone-ink" }
  ];

  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function render() {
    title.textContent = `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`;
    grid.className = "calendar-grid";
    grid.innerHTML = "";

    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));

    for (let i = 0; i < 42; i += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const outside = date.getMonth() !== cursor.getMonth();
      const day = document.createElement("article");
      day.className = `calendar-day${outside ? " is-outside" : ""}${sameDay(date, today) ? " is-today" : ""}`;
      day.innerHTML = `<span class="calendar-day-number">${date.getDate()}</span><div class="calendar-events"></div>`;

      events.forEach((event) => {
        const eventDate = new Date(cursor.getFullYear(), cursor.getMonth() + event.monthOffset, event.day);
        if (sameDay(date, eventDate)) {
          const el = document.createElement("button");
          el.type = "button";
          el.className = `calendar-event ${event.tone}`;
          el.innerHTML = `<span class="calendar-event-time">${event.time}</span>${event.title}`;
          el.addEventListener("click", () => {
            document.querySelector("#eventTitle").value = event.title;
            document.querySelector("#eventModal")?.showModal();
          });
          day.querySelector(".calendar-events").appendChild(el);
        }
      });
      grid.appendChild(day);
    }
  }

  document.querySelector("[data-calendar-prev]")?.addEventListener("click", () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    render();
  });
  document.querySelector("[data-calendar-next]")?.addEventListener("click", () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    render();
  });
  document.querySelector("[data-calendar-today]")?.addEventListener("click", () => {
    cursor = new Date(today.getFullYear(), today.getMonth(), 1);
    render();
  });

  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-calendar-view]").forEach((b) => b.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      grid.classList.toggle("calendar-view-agenda", button.dataset.calendarView === "agenda");
    });
  });

  render();
})();
