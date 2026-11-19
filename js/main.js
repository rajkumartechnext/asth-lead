(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* stockage indisponible */
      }
    },
  };

  /* 1. Barre latérale ------------------------------------------------------ */
  const app = $("#app");

  if (app) {
    const openBtn = $("[data-sidebar-open]");
    const collapseBtn = $("[data-sidebar-collapse]");

    const setMenu = (open) => {
      app.classList.toggle("is-menu-open", open);
      openBtn && openBtn.setAttribute("aria-expanded", String(open));
      document.body.style.overflow = open ? "hidden" : "";
    };

    openBtn &&
      openBtn.addEventListener("click", () =>
        setMenu(!app.classList.contains("is-menu-open")),
      );
    $$("[data-sidebar-close]").forEach((el) =>
      el.addEventListener("click", () => setMenu(false)),
    );
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && app.classList.contains("is-menu-open")) {
        setMenu(false);
        openBtn && openBtn.focus();
      }
    });
    window
      .matchMedia("(min-width: 64.01rem)")
      .addEventListener("change", (e) => e.matches && setMenu(false));

    // Repliage desktop, mémorisé entre les pages (sans animation au chargement)
    if (store.get("trombone-sidebar") === "collapsed") {
      app.style.transition = "none";
      app.classList.add("is-collapsed");
      collapseBtn && collapseBtn.setAttribute("aria-pressed", "true");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => (app.style.transition = "")),
      );
    }

    collapseBtn &&
      collapseBtn.addEventListener("click", () => {
        const collapsed = app.classList.toggle("is-collapsed");
        collapseBtn.setAttribute("aria-pressed", String(collapsed));
        store.set("trombone-sidebar", collapsed ? "collapsed" : "expanded");
      });
  }

  /* 2. Thème clair / sombre (clair par défaut) ---------------------------- */
  const root = document.documentElement;
  const isDark = () => root.dataset.theme === "dark";

  $$("[data-theme-toggle]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(isDark()));
    btn.addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      root.dataset.theme = next;
      store.set("trombone-theme", next);
      btn.setAttribute("aria-pressed", String(next === "dark"));
      document.dispatchEvent(
        new CustomEvent("trombone:themechange", { detail: { theme: next } }),
      );
    });
  });

  /* 3. Menus déroulants ---------------------------------------------------- */
  const closeDropdowns = (except) => {
    $$("[data-dropdown][aria-expanded='true']").forEach((btn) => {
      if (btn === except) return;
      btn.setAttribute("aria-expanded", "false");
      const menu = document.getElementById(btn.getAttribute("aria-controls"));
      menu && menu.classList.remove("is-open");
    });
  };

  // Dans un tableau défilant, le menu passe en position fixe pour ne pas être rogné
  const placeMenu = (btn, menu) => {
    if (!btn.closest(".table-wrap")) return;
    const box = btn.getBoundingClientRect();
    menu.style.position = "fixed";
    menu.style.right = `${window.innerWidth - box.right}px`;
    const below = box.bottom + 8;
    const fitsBelow = below + menu.offsetHeight < window.innerHeight;
    menu.style.top = `${fitsBelow ? below : box.top - menu.offsetHeight - 8}px`;
  };

  $$("[data-dropdown]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = document.getElementById(btn.getAttribute("aria-controls"));
      if (!menu) return;
      const open = btn.getAttribute("aria-expanded") !== "true";
      closeDropdowns(btn);
      btn.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      if (open) placeMenu(btn, menu);
    });
  });
  document.addEventListener("click", (e) => {
    // Un clic hors du menu, ou sur une de ses actions, le referme
    if (
      !e.target.closest(".dropdown-menu") ||
      e.target.closest(".dropdown-menu a, .dropdown-menu button")
    ) {
      closeDropdowns();
    }
  });
  document.addEventListener(
    "keydown",
    (e) => e.key === "Escape" && closeDropdowns(),
  );
  window.addEventListener("scroll", () => closeDropdowns(), { passive: true });

  /* 4. Modales & formulaires de démo -------------------------------------- */
  $$("[data-modal-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.modalOpen);
      dialog && dialog.showModal();
    });
  });

  $$("dialog.modal").forEach((dialog) => {
    $$("[data-modal-close]", dialog).forEach((b) =>
      b.addEventListener("click", () => dialog.close()),
    );
    // Clic sur le fond = fermeture
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  // Les formulaires de démo ne sont pas envoyés : validation + toast
  $$("form[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      toast(form.dataset.toast || "Saved", form.dataset.toastTone);
      const dialog = form.closest("dialog");
      dialog && dialog.close();
      if (form.dataset.redirect) {
        setTimeout(() => (window.location.href = form.dataset.redirect), 700);
      } else if (!form.hasAttribute("data-keep")) {
        form.reset();
      }
    });
  });

  /* 5. Toasts -------------------------------------------------------------- */
  function toast(message, tone = "green") {
    const region = $("#toastRegion");
    if (!region) return;
    const el = document.createElement("div");
    el.className = "toast";
    el.style.setProperty("--tone", `var(--${tone})`);
    el.innerHTML = `<span class="dot" style="--tone: var(--${tone}); border-color: #0e0e0e"></span><span></span>`;
    el.lastChild.textContent = message;
    region.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => el.remove(), { once: true });
    }, 3200);
  }

  $$("[data-toast]:not(form)").forEach((btn) => {
    btn.addEventListener("click", () =>
      toast(btn.dataset.toast, btn.dataset.toastTone),
    );
  });

  /* 6. Raccourcis clavier -------------------------------------------------- */
  document.addEventListener("keydown", (e) => {
    const search = $("#globalSearch");
    if (!search) return;
    const typing = /input|textarea|select/i.test(
      document.activeElement.tagName,
    );
    if (
      (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
      (e.key === "/" && !typing)
    ) {
      e.preventDefault();
      search.focus();
    }
  });

  /* 7. Onglets ------------------------------------------------------------- */
  $$("[role='tablist']").forEach((list) => {
    const tabs = $$("[role='tab']", list);
    const select = (tab) => {
      tabs.forEach((t) => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        t.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !selected;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => select(tab));
      tab.addEventListener("keydown", (e) => {
        const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        select(next);
      });
    });
  });

  /* 8. Vues tableau des graphiques ---------------------------------------- */
  $$("[data-table-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.tableToggle);
      if (!target) return;
      const open = target.classList.toggle("is-visible");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* 9. To-do list ---------------------------------------------------------- */
  $$("[data-todo]").forEach((list) => {
    const card = list.closest(".card") || document;
    const tones = ["coral", "yellow", "green", "mint"];

    const refresh = () => {
      const items = $$("li", list);
      const done = items.filter((li) =>
        li.classList.contains("is-done"),
      ).length;
      const pct = items.length ? Math.round((done / items.length) * 100) : 0;
      $$("[data-todo-done]", card).forEach((el) => (el.textContent = done));
      $$("[data-todo-total]", card).forEach(
        (el) => (el.textContent = items.length),
      );
      $$("[data-todo-ring]", card).forEach((ring) => {
        ring.style.setProperty("--value", pct);
        ring.setAttribute("aria-label", `${pct} percent complete`);
        ring.querySelector("span").textContent = `${pct}%`;
      });
    };

    list.addEventListener("change", (e) => {
      const input = e.target.closest("input[type='checkbox']");
      if (!input) return;
      const li = input.closest("li");
      const bar = $(".progress > span", li);
      const value = $(".todo-meta b", li);
      li.classList.toggle("is-done", input.checked);
      if (bar && value) {
        if (input.checked) {
          li.dataset.prev = bar.style.getPropertyValue("--value");
          bar.style.setProperty("--value", "100%");
          value.textContent = "100%";
        } else if (li.dataset.prev) {
          bar.style.setProperty("--value", li.dataset.prev);
          value.textContent = li.dataset.prev;
        }
      }
      refresh();
    });

    const form = $("[data-todo-add]", card);
    form &&
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = $("input", form);
        const text = input.value.trim();
        if (!text) return;
        const tone = tones[list.children.length % tones.length];
        const li = document.createElement("li");
        li.innerHTML = `
        <label class="checkbox"><input type="checkbox" /><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></label>
        <div class="todo-body">
          <span class="todo-title"><span class="dot tone-${tone}"></span> <span></span></span>
          <span class="todo-meta"><span class="due">No due date</span><span class="progress tone-${tone}"><span style="--value: 0%"></span></span><b>0%</b></span>
        </div>
        <span class="avatar avatar--sm tone-coral" title="Anna Keller">AK</span>`;
        $(".todo-title span:last-child", li).textContent = text;
        $("input", li).setAttribute("aria-label", `Mark as done: ${text}`);
        list.appendChild(li);
        input.value = "";
        refresh();
        toast("Task added", tone);
      });

    refresh();
  });

  /* 10. Tableaux de données ----------------------------------------------- */

  $$("table.table:not(.table--compact)").forEach((table) => {
    const heads = $$("thead th", table);
    if (heads.length < 4) return;
    const label = (th) => {
      const copy = th.cloneNode(true);
      copy.querySelectorAll(".visually-hidden").forEach((n) => n.remove());
      return copy.textContent.trim();
    };
    const labels = heads.map(label);
    const kinds = heads.map((th, i) =>
      labels[i] ? "" : th.querySelector("input") ? "check" : "action",
    );
    const primary = kinds.indexOf("");
    table.dataset.cards = "";
    $$("tbody tr", table).forEach((tr) => {
      [...tr.children].forEach((td, i) => {
        if (i === primary) td.dataset.cell = "primary";
        else if (kinds[i]) td.dataset.cell = kinds[i];
        else if (labels[i]) td.dataset.label = labels[i];
      });
    });
  });

  $$("[data-table]").forEach((wrap) => {
    const table = $("table", wrap);
    const tbody = $("tbody", table);
    const rows = $$("tr", tbody);
    const search = $("[data-table-search]", wrap);
    const chips = $$("[data-filter]", wrap);
    const count = $("[data-table-count]", wrap);
    const empty = $(".empty-state", wrap);
    const selectAll = $("[data-select-all]", wrap);
    const selectedCount = $("[data-selected-count]", wrap);
    const bulk = $("[data-bulk]", wrap);
    let filter = "all";

    // Recherche globale de la barre supérieure : orders.html?q=…
    const query = new URLSearchParams(window.location.search).get("q");
    if (query && search) search.value = query;

    const apply = () => {
      const q = (search && search.value.trim().toLowerCase()) || "";
      let visible = 0;
      rows.forEach((row) => {
        const matchText = !q || row.textContent.toLowerCase().includes(q);
        const matchFilter = filter === "all" || row.dataset.status === filter;
        const show = matchText && matchFilter;
        row.hidden = !show;
        if (show) visible++;
      });
      if (count) count.textContent = visible;
      if (empty) empty.classList.toggle("is-visible", visible === 0);
    };

    search && search.addEventListener("input", apply);
    chips.forEach((chip) => {
      chip.addEventListener("click", () => {
        filter = chip.dataset.filter;
        chips.forEach((c) =>
          c.setAttribute("aria-pressed", String(c === chip)),
        );
        apply();
      });
    });

    // Tri
    $$("th[data-sort]", table).forEach((th, _, all) => {
      th.tabIndex = 0;
      const sort = () => {
        const index = [...th.parentNode.children].indexOf(th);
        const asc = th.getAttribute("aria-sort") !== "ascending";
        all.forEach((h) => h.removeAttribute("aria-sort"));
        th.setAttribute("aria-sort", asc ? "ascending" : "descending");
        const value = (row) => {
          const cell = row.children[index];
          const raw = cell.dataset.value ?? cell.textContent.trim();
          return th.dataset.sort === "num"
            ? parseFloat(String(raw).replace(/[^0-9.-]/g, "")) || 0
            : raw.toLowerCase();
        };
        rows
          .sort(
            (a, b) =>
              (value(a) > value(b) ? 1 : value(a) < value(b) ? -1 : 0) *
              (asc ? 1 : -1),
          )
          .forEach((r) => tbody.appendChild(r));
      };
      th.addEventListener("click", sort);
      th.addEventListener(
        "keydown",
        (e) =>
          (e.key === "Enter" || e.key === " ") && (e.preventDefault(), sort()),
      );
    });

    // Sélection
    const rowChecks = () => $$("tbody input[type='checkbox']", table);
    const refreshSelection = () => {
      const checked = rowChecks().filter((c) => c.checked);
      if (selectedCount) selectedCount.textContent = checked.length;
      if (bulk) bulk.hidden = checked.length === 0;
      if (selectAll) {
        selectAll.checked =
          checked.length > 0 && checked.length === rowChecks().length;
        selectAll.indeterminate = checked.length > 0 && !selectAll.checked;
      }
    };
    selectAll &&
      selectAll.addEventListener("change", () => {
        rowChecks().forEach((c) => {
          if (!c.closest("tr").hidden) c.checked = selectAll.checked;
        });
        refreshSelection();
      });
    tbody.addEventListener("change", refreshSelection);

    apply();
    refreshSelection();
  });

  /* 11. Kanban ------------------------------------------------------------- */
  $$("[data-board]").forEach((board) => {
    let dragged = null;
    const cols = $$("[data-col]", board);
    const refresh = () =>
      cols.forEach((col) => {
        const n = $$(".task-card", col).length;
        const counter = $(".count", col);
        if (counter) counter.textContent = n;
      });

    $$(".task-card", board).forEach((card) => {
      card.draggable = true;
      card.addEventListener("dragstart", (e) => {
        dragged = card;
        card.classList.add("is-dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        card.classList.remove("is-dragging");
        cols.forEach((c) => c.classList.remove("is-over"));
        dragged = null;
        refresh();
      });
    });

    cols.forEach((col) => {
      col.addEventListener("dragover", (e) => {
        if (!dragged) return;
        e.preventDefault();
        col.classList.add("is-over");
        const after = $$(".task-card:not(.is-dragging)", col).find((c) => {
          const box = c.getBoundingClientRect();
          return e.clientY < box.top + box.height / 2;
        });
        const addBtn = $("[data-col-add]", col);
        if (after) col.insertBefore(dragged, after);
        else if (addBtn) col.insertBefore(dragged, addBtn);
        else col.appendChild(dragged);
      });
      col.addEventListener("dragleave", (e) => {
        if (!col.contains(e.relatedTarget)) col.classList.remove("is-over");
      });
      col.addEventListener("drop", (e) => {
        e.preventDefault();
        col.classList.remove("is-over");
        toast(`Moved to ${col.dataset.col}`, col.dataset.tone || "green");
      });
    });

    refresh();
  });

  /* 12. Bascule grille / liste -------------------------------------------- */
  $$("[data-view-switch]").forEach((wrap) => {
    const buttons = $$("[data-view]", wrap);
    const panels = $$("[data-view-panel]", wrap);
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) =>
          b.setAttribute("aria-pressed", String(b === btn)),
        );
        panels.forEach((p) =>
          p.classList.toggle(
            "is-active",
            p.dataset.viewPanel === btn.dataset.view,
          ),
        );
      });
    });
  });

  /* 13. Divers ------------------------------------------------------------- */
  $$("[data-password-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.getAttribute("aria-controls"));
      if (!input) return;
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
    });
  });

  // Pagination de démonstration : met à jour la page courante
  $$(".pagination").forEach((nav) => {
    const pages = $$("button:not([aria-label])", nav);
    const [prev, next] = [
      $("button[aria-label^='Previous']", nav),
      $("button[aria-label^='Next']", nav),
    ];
    const go = (index) => {
      pages.forEach((p, i) =>
        i === index
          ? p.setAttribute("aria-current", "page")
          : p.removeAttribute("aria-current"),
      );
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === pages.length - 1;
    };
    const current = () =>
      pages.findIndex((p) => p.getAttribute("aria-current") === "page");
    pages.forEach((p, i) => p.addEventListener("click", () => go(i)));
    prev &&
      prev.addEventListener("click", () => go(Math.max(0, current() - 1)));
    next &&
      next.addEventListener("click", () =>
        go(Math.min(pages.length - 1, current() + 1)),
      );
  });

  // Aperçu de la photo de profil choisie
  $$("[data-avatar-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      const preview = $("[data-avatar-preview]");
      if (!file || !preview) return;
      preview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
      preview.style.backgroundSize = "cover";
      preview.style.backgroundPosition = "center";
      preview.textContent = "";
      toast("Photo updated");
    });
  });

  window.Trombone = { toast };
})();
