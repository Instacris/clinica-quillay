/* ============================================================================
   CLÍNICA QUILLAY — Widget de reserva de hora (DEMO, vanilla JS)
   ----------------------------------------------------------------------------
   Flujo de 4 pasos + confirmación:
     1) Identidad   → RUT (validación módulo 11) + previsión
     2) Centro      → selección de sede
     3) Especialidad→ filtrada por centro
     4) Profesional → filtrado por especialidad + fecha + horario
     5) Confirmación (resumen)

   IMPORTANTE: NO envía datos reales. En el submit se arma el "payload" listo
   para conectar a un backend PHP/MySQL. Busca el bloque marcado:
       // ===> PUNTO DE CONEXIÓN AL BACKEND
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const form = $("#reservar");
  if (!form) return;

  /* --------------------------------------------------------------------------
     DATOS (100% editables) — reemplazables por una respuesta del backend
     ------------------------------------------------------------------------ */
  const CENTROS = [
    { id: "cordillera", nombre: "Centro Cordillera", comuna: "Providencia" },
    { id: "costanera",  nombre: "Centro Costanera",  comuna: "Las Condes" },
    { id: "maipu",      nombre: "Centro Maipú",      comuna: "Maipú" }
  ];

  // Especialidades por centro (ids)
  const ESPECIALIDADES = [
    { id: "cardio",  nombre: "Cardiología",    centros: ["cordillera", "costanera"] },
    { id: "pedia",   nombre: "Pediatría",      centros: ["cordillera", "maipu"] },
    { id: "derma",   nombre: "Dermatología",   centros: ["costanera", "maipu"] },
    { id: "trauma",  nombre: "Traumatología",  centros: ["cordillera", "costanera", "maipu"] },
    { id: "gine",    nombre: "Ginecología",    centros: ["cordillera", "costanera"] },
    { id: "oftalmo", nombre: "Oftalmología",   centros: ["costanera"] },
    { id: "general", nombre: "Medicina General", centros: ["cordillera", "costanera", "maipu"] },
    { id: "nutri",   nombre: "Nutrición",      centros: ["maipu", "costanera"] }
  ];

  // Profesionales (cada uno con especialidad + centros donde atiende)
  const PROFESIONALES = [
    { id: "p1", nombre: "Dra. Valentina Rojas",  esp: "cardio",  centros: ["cordillera", "costanera"] },
    { id: "p2", nombre: "Dr. Andrés Lagos",      esp: "cardio",  centros: ["cordillera"] },
    { id: "p3", nombre: "Dr. Matías Fuentes",    esp: "pedia",   centros: ["cordillera", "maipu"] },
    { id: "p4", nombre: "Dra. Paula Núñez",      esp: "pedia",   centros: ["maipu"] },
    { id: "p5", nombre: "Dra. Camila Herrera",   esp: "derma",   centros: ["costanera", "maipu"] },
    { id: "p6", nombre: "Dr. Ignacio Soto",      esp: "trauma",  centros: ["cordillera", "costanera", "maipu"] },
    { id: "p7", nombre: "Dra. Francisca Vidal",  esp: "gine",    centros: ["cordillera", "costanera"] },
    { id: "p8", nombre: "Dr. Tomás Reyes",       esp: "oftalmo", centros: ["costanera"] },
    { id: "p9", nombre: "Dra. Carla Méndez",     esp: "general", centros: ["cordillera", "costanera", "maipu"] },
    { id: "p10", nombre: "Nut. Daniela Pérez",   esp: "nutri",   centros: ["maipu", "costanera"] }
  ];

  const HORARIOS = ["08:30", "09:15", "10:00", "11:30", "12:15", "15:00", "16:30", "17:45"];

  /* --------------------------------------------------------------------------
     VALIDACIÓN DE RUT CHILENO (módulo 11)
     ------------------------------------------------------------------------ */
  function limpiarRut(rut) {
    return (rut || "").replace(/[^0-9kK]/g, "").toUpperCase();
  }
  function calcularDV(cuerpo) {
    let suma = 0, mul = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i], 10) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return "0";
    if (resto === 10) return "K";
    return String(resto);
  }
  function validarRut(rut) {
    const limpio = limpiarRut(rut);
    if (limpio.length < 7) return false;            // RUT demasiado corto
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    if (!/^\d+$/.test(cuerpo)) return false;
    return calcularDV(cuerpo) === dv;
  }
  function formatearRut(rut) {
    const limpio = limpiarRut(rut);
    if (limpio.length < 2) return limpio;
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    const conPuntos = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${conPuntos}-${dv}`;
  }

  /* --------------------------------------------------------------------------
     ESTADO
     ------------------------------------------------------------------------ */
  const state = {
    rut: "", prevision: "",
    centro: "", especialidad: "", profesional: "",
    fecha: "", hora: ""
  };
  let current = 1;            // paso actual (1..5)
  const TOTAL_STEPS = 4;      // 4 pasos + pantalla de confirmación (5)

  /* --------------------------------------------------------------------------
     REFERENCIAS DEL DOM
     ------------------------------------------------------------------------ */
  const steps      = $$(".step", form);
  const stepperItems = $$("#stepper .stepper__item");
  const btnPrev    = $('[data-action="prev"]', form);
  const btnNext    = $('[data-action="next"]', form);
  const btnConfirm = $('[data-action="confirm"]', form);

  const rutInput   = $("#rut");
  const prevSelect = $("#prevision");
  const centrosBox = $("#centrosOptions");
  const espSelect  = $("#espSelect");
  const profBox    = $("#profOptions");
  const fechaInput = $("#fecha");
  const slotsBox   = $("#slots");
  const summaryBox = $("#summary");

  /* --------------------------------------------------------------------------
     HELPERS DE UI
     ------------------------------------------------------------------------ */
  function showError(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("is-visible", show);
  }
  function nombreCentro(id)  { const c = CENTROS.find(x => x.id === id); return c ? c.nombre : ""; }
  function nombreEsp(id)     { const e = ESPECIALIDADES.find(x => x.id === id); return e ? e.nombre : ""; }
  function nombreProf(id)    { const p = PROFESIONALES.find(x => x.id === id); return p ? p.nombre : ""; }

  const AVATAR = '<svg class="option__avatar" viewBox="0 0 44 44" fill="none" aria-hidden="true"><circle cx="22" cy="22" r="22" fill="#e1ece6"/><circle cx="22" cy="17" r="7" fill="#4f8a7e"/><path d="M9 38a13 13 0 0 1 26 0Z" fill="#4f8a7e"/></svg>';
  const PIN = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';

  /* --------------------------------------------------------------------------
     RENDER DE PASOS DINÁMICOS
     ------------------------------------------------------------------------ */
  // Paso 2: centros
  function renderCentros() {
    centrosBox.innerHTML = CENTROS.map(c => `
      <label class="option">
        <input type="radio" name="centro" value="${c.id}" ${state.centro === c.id ? "checked" : ""}>
        <span class="option__box">
          ${PIN}
          <span>
            <span class="option__title">${c.nombre}</span>
            <span class="option__meta">${c.comuna}</span>
          </span>
        </span>
      </label>`).join("");

    $$('input[name="centro"]', centrosBox).forEach(input => {
      input.addEventListener("change", () => {
        state.centro = input.value;
        // Cambiar de centro invalida especialidad/profesional ya elegidos
        state.especialidad = ""; state.profesional = "";
        showError("centroError", false);
      });
    });
  }

  // Paso 3: especialidades filtradas por centro
  function renderEspecialidades() {
    const disponibles = ESPECIALIDADES.filter(e => e.centros.includes(state.centro));
    espSelect.innerHTML = '<option value="">Selecciona una especialidad…</option>' +
      disponibles.map(e => `<option value="${e.id}" ${state.especialidad === e.id ? "selected" : ""}>${e.nombre}</option>`).join("");
    espSelect.onchange = () => {
      state.especialidad = espSelect.value;
      state.profesional = "";   // reset profesional al cambiar especialidad
      showError("espError", false);
    };
  }

  // Paso 4: profesionales filtrados por especialidad + centro, + slots
  function renderProfesionales() {
    const disponibles = PROFESIONALES.filter(p =>
      p.esp === state.especialidad && p.centros.includes(state.centro));

    if (disponibles.length === 0) {
      profBox.innerHTML = '<p class="step__hint">No hay profesionales para esta combinación. Vuelve atrás y prueba otro centro o especialidad.</p>';
    } else {
      profBox.innerHTML = disponibles.map(p => `
        <label class="option">
          <input type="radio" name="profesional" value="${p.id}" ${state.profesional === p.id ? "checked" : ""}>
          <span class="option__box">
            ${AVATAR}
            <span>
              <span class="option__title">${p.nombre}</span>
              <span class="option__meta">${nombreEsp(p.esp)} · ${nombreCentro(state.centro)}</span>
            </span>
          </span>
        </label>`).join("");

      $$('input[name="profesional"]', profBox).forEach(input => {
        input.addEventListener("change", () => {
          state.profesional = input.value;
          showError("profError", false);
        });
      });
    }

    // Fecha mínima = hoy
    const hoy = new Date().toISOString().split("T")[0];
    fechaInput.min = hoy;
    if (state.fecha) fechaInput.value = state.fecha;
    fechaInput.onchange = () => { state.fecha = fechaInput.value; showError("fechaError", false); };

    renderSlots();
  }

  function renderSlots() {
    slotsBox.innerHTML = HORARIOS.map(h => `
      <button type="button" class="slot" data-hora="${h}" aria-pressed="${state.hora === h ? "true" : "false"}">${h}</button>`).join("");
    $$(".slot", slotsBox).forEach(slot => {
      slot.addEventListener("click", () => {
        state.hora = slot.dataset.hora;
        $$(".slot", slotsBox).forEach(s => s.setAttribute("aria-pressed", "false"));
        slot.setAttribute("aria-pressed", "true");
        showError("horaError", false);
      });
    });
  }

  // Paso 5: resumen
  function renderSummary() {
    const filas = [
      ["Paciente (RUT)", formatearRut(state.rut)],
      ["Previsión", state.prevision],
      ["Centro", nombreCentro(state.centro)],
      ["Especialidad", nombreEsp(state.especialidad)],
      ["Profesional", nombreProf(state.profesional)],
      ["Fecha", state.fecha],
      ["Hora", state.hora]
    ];
    summaryBox.innerHTML = filas.map(([k, v]) => `
      <div class="summary__row"><dt>${k}</dt><dd>${v || "-"}</dd></div>`).join("");
  }

  /* --------------------------------------------------------------------------
     VALIDACIÓN POR PASO
     ------------------------------------------------------------------------ */
  function validateStep(step) {
    let ok = true;
    if (step === 1) {
      const rutOk = validarRut(rutInput.value);
      rutInput.setAttribute("aria-invalid", String(!rutOk));
      showError("rutError", !rutOk);
      if (rutOk) state.rut = rutInput.value;

      const prevOk = prevSelect.value !== "";
      showError("prevError", !prevOk);
      if (prevOk) state.prevision = prevSelect.value;

      ok = rutOk && prevOk;
    }
    else if (step === 2) {
      ok = state.centro !== "";
      showError("centroError", !ok);
    }
    else if (step === 3) {
      ok = state.especialidad !== "";
      showError("espError", !ok);
    }
    else if (step === 4) {
      const profOk = state.profesional !== "";
      const fechaOk = !!fechaInput.value;
      const horaOk = state.hora !== "";
      showError("profError", !profOk);
      showError("fechaError", !fechaOk);
      showError("horaError", !horaOk);
      if (fechaOk) state.fecha = fechaInput.value;
      ok = profOk && fechaOk && horaOk;
    }
    return ok;
  }

  /* --------------------------------------------------------------------------
     NAVEGACIÓN ENTRE PASOS
     ------------------------------------------------------------------------ */
  function goTo(step) {
    current = step;

    steps.forEach(s => s.classList.toggle("is-active", Number(s.dataset.step) === step));

    // Stepper visual (1..4); en confirmación (5) marcamos todos como hechos
    stepperItems.forEach((item, i) => {
      const n = i + 1;
      let estado = "";
      if (step === 5) estado = "done";
      else if (n < step) estado = "done";
      else if (n === step) estado = "active";
      item.dataset.state = estado;
    });

    // Botones
    btnPrev.hidden = step === 1;
    btnNext.hidden = step >= 5;
    btnConfirm.hidden = step !== 5;
    btnNext.textContent = step === TOTAL_STEPS ? "Revisar reserva" : "Continuar";

    // Preparar contenido del paso entrante
    if (step === 2) renderCentros();
    if (step === 3) renderEspecialidades();
    if (step === 4) renderProfesionales();
    if (step === 5) renderSummary();

    // Mover el foco al inicio del paso (accesibilidad)
    const activeStep = steps.find(s => Number(s.dataset.step) === step);
    const focusTarget = activeStep.querySelector("input, select, button, [tabindex]");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  btnNext.addEventListener("click", () => {
    if (!validateStep(current)) return;
    goTo(current + 1);
  });
  btnPrev.addEventListener("click", () => {
    // Si volvemos desde la confirmación, regresamos al paso 4
    goTo(current === 5 ? 4 : current - 1);
  });

  // Formateo de RUT al salir del campo
  rutInput.addEventListener("blur", () => {
    if (rutInput.value.trim()) rutInput.value = formatearRut(rutInput.value);
  });

  /* --------------------------------------------------------------------------
     CONFIRMACIÓN (DEMO — no envía datos)
     ------------------------------------------------------------------------ */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Estructura lista para el backend
    const payload = {
      rut: limpiarRut(state.rut),
      prevision: state.prevision,
      centro: state.centro,
      especialidad: state.especialidad,
      profesional: state.profesional,
      fecha: state.fecha,
      hora: state.hora
    };

    /* ===> PUNTO DE CONEXIÓN AL BACKEND (PHP/MySQL)
       Reemplaza este bloque por una petición real, por ejemplo:

       fetch("/api/reservas.php", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify(payload)
       })
       .then(r => r.json())
       .then(data => { /* mostrar nº de reserva real *\/ })
       .catch(() => { /* manejar error *\/ });
    -------------------------------------------------------------------------- */
    console.log("[DEMO] Payload de reserva (no enviado):", payload);

    // Feedback visual de éxito (simulado)
    const folio = "QLY-" + Math.floor(100000 + Math.random() * 900000);
    summaryBox.insertAdjacentHTML("beforebegin",
      `<div class="notice notice--ok" id="okMsg" role="status">
         <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
         <span><strong>¡Reserva simulada con éxito!</strong> Folio de demostración <strong>${folio}</strong>. En producción este número vendría del backend.</span>
       </div>`);

    btnConfirm.disabled = true;
    btnConfirm.textContent = "Reserva enviada (demo)";
    document.getElementById("okMsg").scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* --------------------------------------------------------------------------
     INICIO
     ------------------------------------------------------------------------ */
  goTo(1);
})();
