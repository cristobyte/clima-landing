/* ============================================================
   ClimaTecnología — lógica de la landing (vanilla JS, sin build)
   Todo lo editable está en CT_CONFIG y CT_CATALOGO.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. Configuración editable ---------- */
  var CT_CONFIG = {
    whatsapp: "56934507925",          // número en formato internacional, sin + ni espacios
    whatsappDisplay: "+56 9 3450 7925",
    modoCalculadora: "pasos",         // "pasos" (guiado) | "directo" (todo a la vista)
    mostrarPrecios: true,
    moneda: "es-CL"
  };

  // Catálogo: editar aquí o reemplazar por datos de WooCommerce/ACF (ver README).
  var CT_CATALOGO = [
    { marca: "Artik", modelo: "EVO 9000",            btu: 9000,  m2: 18, desde: 265000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 9000",   btu: 9000,  m2: 18, desde: 310000, tipo: "Inverter IA" },
    { marca: "Artik", modelo: "EVO 12000",           btu: 12000, m2: 25, desde: 275000, tipo: "Inverter" },
    { marca: "TCL",   modelo: "Breezin 12000",       btu: 12000, m2: 25, desde: 300000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 12000",  btu: 12000, m2: 25, desde: 345000, tipo: "Inverter IA" },
    { marca: "TCL",   modelo: "Breezin 18000",       btu: 18000, m2: 36, desde: 420000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 18000",  btu: 18000, m2: 36, desde: 475000, tipo: "Inverter IA" },
    { marca: "Artik", modelo: "EVO 36000",           btu: 36000, m2: 58, desde: 799990, tipo: "Inverter" }
  ];

  // WordPress puede sobreescribir la config vía wp_localize_script (objeto global CT_WP).
  if (typeof window.CT_WP === "object" && window.CT_WP) {
    Object.keys(window.CT_WP).forEach(function (k) {
      if (k === "catalogo") {
        if (Array.isArray(window.CT_WP.catalogo) && window.CT_WP.catalogo.length) CT_CATALOGO = window.CT_WP.catalogo;
      } else if (window.CT_WP[k] !== "" && window.CT_WP[k] !== null) {
        CT_CONFIG[k] = window.CT_WP[k];
      }
    });
    CT_CONFIG.mostrarPrecios = CT_CONFIG.mostrarPrecios !== false && CT_CONFIG.mostrarPrecios !== "0";
  }

  var SOL = { baja: { label: "Poco sol", base: 480 }, media: { label: "Sol medio", base: 560 }, alta: { label: "Mucho sol", base: 660 } };
  var USO = { dormitorio: { label: "Dormitorio", add: 0 }, living: { label: "Living", add: 60 }, oficina: { label: "Oficina", add: 120 } };
  var ESCALONES = [9000, 12000, 18000, 24000, 36000];
  var FILTROS = ["todos", "9000", "12000", "18000", "36000"];

  /* ---------- 2. Utilidades ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function miles(n) { return Math.round(n).toLocaleString(CT_CONFIG.moneda).replace(/,/g, "."); }
  function clp(n) { return "$" + miles(n); }

  var root = $(".ct-page");
  if (!root) return;

  /* ---------- 3. Estado ---------- */
  var state = {
    m2: 24,
    sol: "media",
    uso: "living",
    paso: 0,                 // 0-2 preguntas, 3 = resultado
    filtro: "todos",
    servicio: "Instalación",
    equipoElegido: ""
  };
  var pasosMode = CT_CONFIG.modoCalculadora === "pasos";

  function calcular(m2) {
    var s = SOL[state.sol] || SOL.media;
    var u = USO[state.uso] || USO.living;
    var bruto = m2 * (s.base + u.add);
    var btu = null;
    for (var i = 0; i < ESCALONES.length; i++) { if (ESCALONES[i] >= bruto) { btu = ESCALONES[i]; break; } }
    return { bruto: bruto, btu: btu || 36000, excede: bruto > 36000 };
  }

  /* ---------- 4. Calculadora ---------- */
  var elRange = $("#ct-m2"), elOut = $("#ct-m2-out");
  var elProgress = $("[data-ct-progress]"), elBar = $("[data-ct-progress-bar]"), elProgLabel = $("[data-ct-progress-label]");
  var elNavSteps = $("[data-ct-nav-steps]"), elPrev = $("[data-ct-prev]"), elNext = $("[data-ct-next]");
  var elResult = $("[data-ct-result]"), elDisclaimer = $("[data-ct-disclaimer]"), elRestart = $("[data-ct-restart]");
  var pasos = $$("[data-ct-step]");

  function pintarCalculadora() {
    var r = calcular(state.m2);
    if (elOut) elOut.textContent = state.m2 + " m²";

    var enResultado = !pasosMode || state.paso >= 3;
    pasos.forEach(function (el) {
      var idx = Number(el.getAttribute("data-ct-step"));
      el.hidden = pasosMode ? idx !== state.paso : false;
    });
    if (elProgress) elProgress.hidden = !pasosMode || enResultado;
    if (elNavSteps) elNavSteps.hidden = !pasosMode || enResultado;
    if (elPrev) elPrev.disabled = state.paso === 0;
    if (elNext) elNext.textContent = state.paso === 2 ? "Ver resultado" : "Siguiente";
    var MIN_PROGRESO = 5; // % visible en el paso 1, antes de que el usuario avance
    var avance = Math.min(state.paso, 3) / 3;                      // 0 · 0.33 · 0.67 · 1
    var pct = MIN_PROGRESO + avance * (100 - MIN_PROGRESO);        // 5 · 37 · 68 · 100
    if (elBar) elBar.style.width = Math.round(pct) + "%";    if (elProgLabel) elProgLabel.textContent = "Paso " + Math.min(state.paso + 1, 3) + " de 3";
    if (elRestart) elRestart.hidden = !pasosMode;
    if (elResult) elResult.hidden = !enResultado;
    if (elDisclaimer) elDisclaimer.hidden = !enResultado;
    if (!enResultado) return;

    var opciones = r.excede ? [] : CT_CATALOGO.filter(function (p) { return p.btu === r.btu; });
    var reco = opciones[0] || null;
    var textos = {
      "[data-ct-btu]": miles(r.btu),
      "[data-ct-resumen]": r.excede
        ? "Para " + state.m2 + " m² con este uso conviene dividir la carga en dos equipos o un cassette. Lo definimos en la visita técnica."
        : "Para " + state.m2 + " m² con " + SOL[state.sol].label.toLowerCase() + " y uso de " + USO[state.uso].label.toLowerCase() + ", esta es la potencia mínima que rinde sin trabajar al límite.",
      "[data-ct-count]": r.excede ? "a medida" : (reco ? (opciones.length > 1 ? opciones.length + " modelos" : "1 modelo") : "a pedido"),
      "[data-ct-model]": r.excede ? "Dos equipos o cassette" : (reco ? reco.marca + " " + reco.modelo : miles(r.btu) + " BTU a pedido"),
      "[data-ct-cover]": r.excede ? "Se define en la visita técnica" : (reco ? "Cubre hasta " + reco.m2 + " m²" : "No publicado en tienda, lo conseguimos"),
      "[data-ct-price]": reco && CT_CONFIG.mostrarPrecios ? "Desde " + clp(reco.desde) : "Cotización a medida"
    };
    Object.keys(textos).forEach(function (sel) { var el = $(sel); if (el) el.textContent = textos[sel]; });

    state.equipoElegido = reco && !r.excede ? reco.marca + " " + reco.modelo : "";
    var m2Input = $("#f-m2");
    if (m2Input && !m2Input.value) m2Input.placeholder = String(state.m2);
    pintarPreview();
  }

  if (elRange) elRange.addEventListener("input", function () { state.m2 = Number(this.value); pintarCalculadora(); });
  if (elNext) elNext.addEventListener("click", function () { state.paso = Math.min(state.paso + 1, 3); pintarCalculadora(); });
  if (elPrev) elPrev.addEventListener("click", function () { state.paso = Math.max(state.paso - 1, 0); pintarCalculadora(); });
  if (elRestart) elRestart.addEventListener("click", function () { state.paso = 0; pintarCalculadora(); });

  /* ---------- 5. Grupos de opciones (sol / uso / servicio) ---------- */
  $$("[data-ct-group]").forEach(function (group) {
    var key = group.getAttribute("data-ct-group");
    group.addEventListener("click", function (e) {
      var btn = e.target.closest(".ct-choice");
      if (!btn || !group.contains(btn)) return;
      $$(".ct-choice", group).forEach(function (b) { b.classList.remove("is-active"); b.removeAttribute("aria-pressed"); });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      state[key] = btn.getAttribute("data-value");
      if (key === "servicio") { pintarCamposServicio(); pintarPreview(); } else pintarCalculadora();
    });
  });

  /* ---------- 6. Equipos + filtros ---------- */
  var elFiltros = $("[data-ct-filters]"), elEquipos = $("[data-ct-equipos]");

  function pintarFiltros() {
    if (!elFiltros) return;
    elFiltros.innerHTML = FILTROS.map(function (id) {
      var label = id === "todos" ? "Todos" : miles(Number(id)) + " BTU";
      return '<button class="ct-filter' + (id === state.filtro ? " is-active" : "") + '" type="button" data-filtro="' + id + '"' +
             (id === state.filtro ? ' aria-pressed="true"' : "") + ">" + label + "</button>";
    }).join("");
  }

  function pintarEquipos() {
    if (!elEquipos) return;
    var lista = CT_CATALOGO.filter(function (p) { return state.filtro === "todos" || String(p.btu) === state.filtro; });
    elEquipos.innerHTML = lista.map(function (p) {
      var precio = CT_CONFIG.mostrarPrecios ? clp(p.desde) : "Cotizar";
      return '' +
        '<article class="ct-prod">' +
          '<div class="ct-prod__top">' +
            '<div class="ct-prod__meta"><span class="ct-prod__brand">' + p.marca + '</span><span class="ct-prod__type">' + p.tipo + '</span></div>' +
            '<p class="ct-prod__btu">' + miles(p.btu) + '</p>' +
            '<p class="ct-prod__cover">BTU · cubre hasta ' + p.m2 + ' m²</p>' +
          '</div>' +
          '<div class="ct-prod__body">' +
            '<h3 class="ct-prod__name">' + p.marca + " " + p.modelo + '</h3>' +
            '<div class="ct-prod__spacer"></div>' +
            '<p class="ct-prod__from">Desde</p>' +
            '<p class="ct-prod__price">' + precio + '</p>' +
            '<a class="ct-btn ct-btn--blue" href="#cotizar" data-ct-equipo="' + p.marca + " " + p.modelo + '">Cotizar con instalación</a>' +
          '</div>' +
        '</article>';
    }).join("");
  }

  if (elFiltros) {
    elFiltros.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-filtro]");
      if (!btn) return;
      state.filtro = btn.getAttribute("data-filtro");
      pintarFiltros();
      pintarEquipos();
    });
  }

  // Cotizar un equipo concreto → precarga servicio y detalle del formulario
  root.addEventListener("click", function (e) {
    var equipo = e.target.closest("[data-ct-equipo]");
    if (equipo) {
      state.equipoElegido = equipo.getAttribute("data-ct-equipo");
      setServicio("Instalación");
      var det = $("#f-msg");
      if (det) det.value = "Me interesa el " + state.equipoElegido + ".";
      pintarPreview();
      return;
    }
    var srv = e.target.closest("[data-ct-servicio]");
    if (srv) { setServicio(srv.getAttribute("data-ct-servicio")); pintarPreview(); }
  });

  function setServicio(valor) {
    state.servicio = valor;
    var group = $('[data-ct-group="servicio"]');
    if (!group) return;
    $$(".ct-choice", group).forEach(function (b) {
      var on = b.getAttribute("data-value") === valor;
      b.classList.toggle("is-active", on);
      if (on) b.setAttribute("aria-pressed", "true"); else b.removeAttribute("aria-pressed");
    });
    pintarCamposServicio();
  }

  /* ---------- 7. Formulario → WhatsApp ---------- */
  var form = $("[data-ct-form]"), elPreview = $("[data-ct-preview]");
  var elM2Wrap = $("[data-ct-m2]");

  // Mantencion y reparacion son sobre un equipo ya instalado: los m2 no aportan
  // nada ni al formulario ni al mensaje.
  var SERVICIOS_SIN_M2 = ["Mantención", "Reparación"];

  function pideM2() { return SERVICIOS_SIN_M2.indexOf(state.servicio) === -1; }

  function pintarCamposServicio() { if (elM2Wrap) elM2Wrap.hidden = !pideM2(); }

  function armarMensaje() {
    var v = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    var conM2 = pideM2();
    var m2Form = Number(v("#f-m2"));
    var m2 = m2Form > 0 ? m2Form : state.m2;
    var r = conM2 ? calcular(m2) : null;
    return [
      "Hola ClimaTecnología, necesito: " + state.servicio + ".",
      v("#f-nombre") ? "Soy " + v("#f-nombre") + "." : "Soy [tu nombre].",
      v("#f-comuna") ? "Estoy en " + v("#f-comuna") + "." : "Estoy en [tu comuna].",
      conM2 ? "El espacio tiene unos " + m2 + " m²." : "",
      conM2 ? (r.excede ? "Por la superficie probablemente necesito más de un equipo."
                        : "Según la calculadora necesito " + miles(r.btu) + " BTU.") : "",
      v("#f-msg")
    ].filter(Boolean).join(" ");
  }

  function pintarPreview() { if (elPreview) elPreview.textContent = armarMensaje(); }

  function urlWhatsApp(texto) {
    return "https://wa.me/" + CT_CONFIG.whatsapp + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  if (form) {
    form.addEventListener("input", pintarPreview);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Punto de enganche para analítica (GA4 / Meta Pixel):
      if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "whatsapp", service: state.servicio });
      window.open(urlWhatsApp(armarMensaje()), "_blank", "noopener");
    });
  }

  // Enlaces directos a WhatsApp (botón flotante, ficha de contacto)
  $$("[data-ct-wa-link]").forEach(function (a) {
    a.href = urlWhatsApp("Hola ClimaTecnología, quiero cotizar un servicio de climatización.");
    a.target = "_blank";
    a.rel = "noopener";
    if (a.textContent.trim() === "+56 9 1234 5678") a.textContent = CT_CONFIG.whatsappDisplay;
  });

  /* ---------- 8. Menú móvil ---------- */
  var toggle = $("[data-ct-nav-toggle]"), nav = $("#ct-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) { nav.classList.remove("is-open"); toggle.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- 9. Arranque ---------- */
  pintarFiltros();
  pintarEquipos();
  pintarCalculadora();
  pintarCamposServicio();
  pintarPreview();

  // Exponer para depuración / integraciones externas
  window.ClimaTecnologia = { config: CT_CONFIG, catalogo: CT_CATALOGO, state: state, refrescar: function () { pintarFiltros(); pintarEquipos(); pintarCalculadora(); } };
})();
