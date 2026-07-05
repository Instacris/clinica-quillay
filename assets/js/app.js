/* ============================================================================
   CLÍNICA QUILLAY — Interacciones generales (vanilla JS, sin dependencias)
   ----------------------------------------------------------------------------
   - Menú responsive (hamburguesa) con bloqueo de scroll y cierre por ESC
   - Header sticky con sombra al hacer scroll
   - Buscador en vivo de especialidades (genera la grilla)
   - Acordeón FAQ accesible
   - Tabs de convenios
   - Animaciones de aparición (respetando prefers-reduced-motion)
   - Año dinámico del footer
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --------------------------------------------------------------------------
     1. MENÚ RESPONSIVE
     ------------------------------------------------------------------------ */
  const nav       = $("#nav");
  const toggle    = $("#navToggle");
  const backdrop  = $("#navBackdrop");

  function openMenu() {
    nav.classList.add("is-open");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Cerrar menú");
    document.body.classList.add("nav-locked");
  }
  function closeMenu() {
    nav.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
    document.body.classList.remove("nav-locked");
    setTimeout(() => { if (!nav.classList.contains("is-open")) backdrop.hidden = true; }, 300);
  }
  function toggleMenu() {
    toggle.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu();
  }

  if (toggle) toggle.addEventListener("click", toggleMenu);
  if (backdrop) backdrop.addEventListener("click", closeMenu);
  // Cerrar al navegar por un enlace del menú
  $$("#nav a").forEach(a => a.addEventListener("click", closeMenu));
  // Cerrar con tecla Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
      toggle.focus();
    }
  });

  /* --------------------------------------------------------------------------
     2. HEADER STICKY (sombra al scrollear)
     ------------------------------------------------------------------------ */
  const header = $("#header");
  const onScroll = () => header.classList.toggle("is-stuck", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* --------------------------------------------------------------------------
     3. ESPECIALIDADES + BUSCADOR EN VIVO
     ------------------------------------------------------------------------ */
  // Datos editables. Cada ícono usa un símbolo SVG inline simple.
  const ESPECIALIDADES = [
    "Cardiología", "Pediatría", "Dermatología", "Traumatología",
    "Ginecología", "Oftalmología", "Otorrinolaringología", "Neurología",
    "Medicina Interna", "Urología", "Endocrinología", "Nutrición",
    "Psiquiatría", "Kinesiología", "Gastroenterología", "Broncopulmonar",
    "Reumatología", "Cirugía General", "Medicina General", "Geriatría"
  ];

  const ICON_STETHO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3v6a5 5 0 0 0 10 0V3"/><path d="M4 3H2M14 3h2"/><path d="M9 19a5 5 0 0 0 5 5 5 5 0 0 0 5-5v-3"/><circle cx="20" cy="13" r="2"/></svg>';

  const specGrid  = $("#specGrid");
  const specEmpty = $("#specEmpty");
  const specCount = $("#specCount");
  const specSearch = $("#specSearch");

  if (specGrid) {
    // Generar tarjetas
    const fragment = document.createDocumentFragment();
    ESPECIALIDADES.forEach(nombre => {
      const card = document.createElement("a");
      card.className = "specialty";
      card.href = "#reservar";
      card.dataset.name = nombre.toLowerCase();
      card.innerHTML =
        `<span class="specialty__icon">${ICON_STETHO}</span>` +
        `<span><h3>${nombre}</h3><small>Ver disponibilidad</small></span>`;
      fragment.appendChild(card);
    });
    specGrid.insertBefore(fragment, specEmpty);

    const cards = $$(".specialty", specGrid);

    const updateCount = (visible) => {
      specCount.textContent = visible === ESPECIALIDADES.length
        ? `${ESPECIALIDADES.length} especialidades`
        : `${visible} de ${ESPECIALIDADES.length} especialidades`;
    };
    updateCount(ESPECIALIDADES.length);

    const filter = () => {
      const q = specSearch.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const match = card.dataset.name.includes(q);
        card.classList.toggle("is-hidden", !match);
        if (match) visible++;
      });
      specEmpty.classList.toggle("is-visible", visible === 0);
      updateCount(visible);
    };

    specSearch.addEventListener("input", filter);
  }

  /* --------------------------------------------------------------------------
     4. ACORDEÓN FAQ
     ------------------------------------------------------------------------ */
  $$("#faq .faq__q").forEach(btn => {
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      // Cierra el resto (comportamiento acordeón)
      $$("#faq .faq__q").forEach(b => b.setAttribute("aria-expanded", "false"));
      btn.setAttribute("aria-expanded", String(!expanded));
    });
  });

  /* --------------------------------------------------------------------------
     5. TABS DE CONVENIOS
     ------------------------------------------------------------------------ */
  const tabs = $$(".conv-tab");
  if (tabs.length) {
    const selectTab = (tab) => {
      tabs.forEach(t => {
        const selected = t === tab;
        t.setAttribute("aria-selected", String(selected));
        const panel = document.getElementById(t.getAttribute("aria-controls"));
        panel.classList.toggle("is-active", selected);
        panel.hidden = !selected;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => selectTab(tab));
      // Navegación con flechas (accesibilidad de tablist)
      tab.addEventListener("keydown", e => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        selectTab(next);
      });
    });
  }

  /* --------------------------------------------------------------------------
     6. ANIMACIONES DE APARICIÓN
     ------------------------------------------------------------------------ */
  const reveals = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(el => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(el => io.observe(el));
  }

  /* --------------------------------------------------------------------------
     7. AÑO DINÁMICO
     ------------------------------------------------------------------------ */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
