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
    email: "contacto@climatecnologia.cl",
    endpoint: "",                     // lo entrega WordPress via CT_WP; vacio = se abre el mailto
    modoCalculadora: "pasos",         // "pasos" (guiado) | "directo" (todo a la vista)
    mostrarPrecios: true,
    moneda: "es-CL"
  };

  // Catálogo: editar aquí o reemplazar por datos de WooCommerce/ACF (ver README).
  // desde = solo equipo; instalado = variante «Con instalación» de la tienda. El más
  // barato instalado de cada potencia es el «desde» de la calculadora y de las
  // tarjetas de precios (sección 6b): cambiarlo aquí cambia los dos.
  var CT_CATALOGO = [
    { marca: "Artik", modelo: "EVO 9000",            btu: 9000,  m2: 18, desde: 265000, instalado: 415000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 9000",   btu: 9000,  m2: 18, desde: 310000, instalado: 460000, tipo: "Inverter IA" },
    { marca: "Artik", modelo: "EVO 12000",           btu: 12000, m2: 25, desde: 275000, instalado: 425000, tipo: "Inverter" },
    { marca: "TCL",   modelo: "Breezin 12000",       btu: 12000, m2: 25, desde: 300000, instalado: 450000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 12000",  btu: 12000, m2: 25, desde: 345000, instalado: 495000, tipo: "Inverter IA" },
    { marca: "Artik", modelo: "EVO 18000",           btu: 18000, m2: 36, desde: 395000, instalado: 550000, tipo: "Inverter" },
    { marca: "TCL",   modelo: "Breezin 18000",       btu: 18000, m2: 36, desde: 420000, instalado: 620000, tipo: "Inverter" },
    { marca: "Midea", modelo: "AI Ecomaster 18000",  btu: 18000, m2: 36, desde: 475000, instalado: 675000, tipo: "Inverter IA" },
    { marca: "Artik", modelo: "EVO 24000",           btu: 24000, m2: 45, desde: 505000, instalado: 660000, tipo: "Inverter" },
    { marca: "Artik", modelo: "EVO 36000",           btu: 36000, m2: 58, desde: 799990, instalado: 960000, tipo: "Inverter" }
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

  // Equipo mas barato instalado de una potencia: respalda el «desde» del resultado, de
  // su mensaje de WhatsApp y de las tarjetas de precios.
  function masBarato(btu) {
    var orden = function (p) { return p.instalado || Number.MAX_VALUE; };
    return CT_CATALOGO.filter(function (p) { return p.btu === btu; })
      .sort(function (a, b) { return orden(a) - orden(b); })[0] || null;
  }

  // Solo se promete precio si el equipo lo trae y Ajustes deja mostrarlo.
  function precioInstalado(p) {
    return p && p.instalado && CT_CONFIG.mostrarPrecios ? clp(p.instalado) : "";
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
    if (!enResultado) { pintarWhats(); return; }

    var reco = r.excede ? null : masBarato(r.btu);
    var precio = precioInstalado(reco);
    var textos = {
      "[data-ct-btu]": (r.excede ? "+" : "") + miles(r.btu),
      "[data-ct-resumen]": r.excede
        ? "Para " + state.m2 + " m² con este uso conviene dividir la carga en dos equipos o un cassette. Lo definimos en la visita técnica."
        : "Para " + state.m2 + " m² con " + SOL[state.sol].label.toLowerCase() + " y uso de " + USO[state.uso].label.toLowerCase() + ", esta es la potencia mínima que rinde sin trabajar al límite.",
      "[data-ct-price-label]": precio ? "Instalado desde" : (r.excede ? "Solución sugerida" : "Equipo sugerido"),
      "[data-ct-price]": precio,
      "[data-ct-model]": r.excede ? "Dos equipos o un cassette · se define en la visita técnica"
        : (reco ? reco.marca + " " + reco.modelo + " · cubre hasta " + reco.m2 + " m²" : miles(r.btu) + " BTU a pedido · lo conseguimos")
    };
    Object.keys(textos).forEach(function (sel) { var el = $(sel); if (el) el.textContent = textos[sel]; });
    var elPrice = $("[data-ct-price]");
    if (elPrice) elPrice.hidden = !precio;

    state.equipoElegido = reco && !r.excede ? reco.marca + " " + reco.modelo : "";
    var m2Input = $("#f-m2");
    if (m2Input && !m2Input.value) m2Input.placeholder = String(state.m2);
    pintarPreview();
    pintarWhats();
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

  /* ---------- 6b. Tarjetas de precios ----------
     Monto y modelo salen de CT_CATALOGO, igual que el resultado de la calculadora:
     asi no pueden mostrar dos precios distintos. Lo escrito en el markup queda como
     respaldo sin JS. Corre antes de pintarWhats(), que lee el precio de cada tarjeta. */
  $$(".ct-price[data-ct-precio-btu]").forEach(function (card) {
    var p = masBarato(Number(card.getAttribute("data-ct-precio-btu")));
    if (!p || !p.instalado) return;
    var elPrecio = $("[data-ct-precio]", card), elModelo = $("[data-ct-precio-modelo]", card);
    if (elPrecio) elPrecio.textContent = clp(p.instalado);
    if (elModelo) elModelo.textContent = p.marca + " " + p.modelo;
  });

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
    // Los CTA directos (WhatsApp y llamada) se van del sitio: si no se marcan aqui, GA4
    // muestra una caida de conversiones justo cuando la conversion real sube. Mide
    // intencion (el clic), igual que el submit del formulario. El valor del atributo es
    // el method que viaja a GA4.
    var cta = e.target.closest("[data-ct-wa-cta], [data-ct-tel]");
    if (cta) {
      if (typeof window.gtag === "function") {
        var params = {
          method: cta.getAttribute("data-ct-wa-cta") || cta.getAttribute("data-ct-tel") || "whatsapp",
          service: state.servicio
        };
        // En las tarjetas de precios, que potencia se cotizo.
        if (cta.hasAttribute("data-ct-plan")) params.plan = cta.getAttribute("data-ct-plan");
        window.gtag("event", "generate_lead", params);
      }
      return;
    }

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
  var elMailForm  = $("[data-ct-mail-form]");
  var elMailPanel = $("[data-ct-mail-panel]"), elMailOk = $("[data-ct-mail-ok]");
  var elMailError = $("[data-ct-mail-error]"), elMailSend = $("[data-ct-mail-send]");
  var elMailNote  = $("[data-ct-mail-note]");

  // Marca de tiempo de carga: el servidor descarta los envios instantaneos (bots).
  var t0 = Date.now();
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var enviando = false;
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

  function pintarPreview() {
    var texto = armarMensaje();
    if (elPreview) elPreview.textContent = texto;
    if (elMailForm) elMailForm.href = urlCorreo(asuntoCorreo(), texto);
  }

  function urlWhatsApp(texto) {
    return "https://wa.me/" + CT_CONFIG.whatsapp + (texto ? "?text=" + encodeURIComponent(texto) : "");
  }

  // Mensaje de los CTA que van directo a WhatsApp (hero, barra movil y resultado de la
  // calculadora). Sin calculadora usada va el texto generico; con resultado en pantalla
  // va todo lo que ya sabemos, una linea por dato, para que el tecnico pueda cotizar sin
  // volver a preguntar. Sale de las mismas etiquetas, equipo y precio que pinta el
  // resultado, asi el mensaje no puede divergir de lo que el visitante tiene a la vista.
  function mensajeWhatsApp() {
    var base = "Hola ClimaTecnología, necesito más información.";
    if (pasosMode && state.paso < 3) return base;

    var r = calcular(state.m2);
    var reco = r.excede ? null : masBarato(r.btu);
    var precio = precioInstalado(reco);
    var recomendacion = r.excede
      ? "más de 36.000 BTU, dos equipos o un cassette"
      : miles(r.btu) + " BTU" + (reco
        ? " (" + reco.marca + " " + reco.modelo + (precio ? ", desde " + precio + " instalado" : "") + ")"
        : "");

    return [
      "Hola ClimaTecnología, usé la calculadora de su web:",
      "• Espacio: " + USO[state.uso].label + ", " + state.m2 + " m²",
      "• Exposición: " + SOL[state.sol].label,
      "• Recomendación: " + recomendacion,
      "¿Me pueden cotizar?"
    ].join("\n");
  }

  // Tarjetas de precios: el mensaje nombra la potencia y el precio que el visitante
  // eligio. El precio se lee de la tarjeta, asi solo vive en un lugar del markup.
  function mensajePlan(a) {
    var plan = a.getAttribute("data-ct-plan");
    if (!plan) return "";
    var card = a.closest(".ct-price");
    var precio = card ? $("[data-ct-precio]", card) : null;
    return "Hola ClimaTecnología, me interesa un equipo de " + plan + " instalado" +
      (precio ? " (desde " + precio.textContent.trim() + ")" : "") + ". ¿Me pueden cotizar?";
  }

  // Los CTA dinamicos traen el wa.me escrito en el markup (funcionan sin JS); aqui se
  // reemplaza por el numero configurado en WordPress y el mensaje del momento.
  function pintarWhats() {
    var texto = mensajeWhatsApp();
    $$("[data-ct-wa-cta]").forEach(function (a) { a.href = urlWhatsApp(mensajePlan(a) || texto); });
  }

  // mailto: abre la aplicacion de correo del visitante con asunto y cuerpo ya escritos.
  function urlCorreo(asunto, texto) {
    return "mailto:" + CT_CONFIG.email +
      "?subject=" + encodeURIComponent(asunto) +
      "&body=" + encodeURIComponent(texto);
  }

  function asuntoCorreo() { return "Cotización " + state.servicio + " · ClimaTecnología"; }

  if (form) {
    form.addEventListener("input", pintarPreview);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Punto de enganche para analítica (GA4 / Meta Pixel):
      if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "whatsapp", service: state.servicio });
      window.open(urlWhatsApp(armarMensaje()), "_blank", "noopener");
    });
  }

  /* ---------- 7b. Envio directo por correo ----------
     Sin endpoint (index.html suelto, plugin viejo) no se toca nada: el enlace
     conserva su mailto: y abre la aplicacion de correo del visitante. */

  function abrirPanel() {
    elMailPanel.hidden = false;
    elMailForm.setAttribute("aria-expanded", "true");
    // Un frame de margen: si se agrega la clase en el mismo tick, el navegador
    // pinta directo el estado final y la transicion no ocurre.
    requestAnimationFrame(function () {
      elMailPanel.classList.add("is-open");
      var email = $("#f-email");
      if (email) email.focus();
    });
  }

  function limpiarError() {
    var email = $("#f-email");
    if (email) email.classList.remove("is-bad");
    if (elMailError) { elMailError.hidden = true; elMailError.textContent = ""; }
  }

  function mostrarError(texto, conSalida) {
    if (!elMailError) return;
    elMailError.textContent = texto;
    if (conSalida) {
      // El servidor fallo, pero el lead no se pierde: se le ofrece su propio correo.
      var a = document.createElement("a");
      a.href = urlCorreo(asuntoCorreo(), armarMensaje());
      a.textContent = "Ábralo en su aplicación de correo";
      elMailError.appendChild(document.createTextNode(" "));
      elMailError.appendChild(a);
    }
    elMailError.hidden = false;
  }

  function datosCorreo() {
    var v = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    var conM2 = pideM2();
    var m2Form = Number(v("#f-m2"));
    var m2 = m2Form > 0 ? m2Form : state.m2;
    var r = conM2 ? calcular(m2) : null;
    return {
      servicio: state.servicio,
      nombre: v("#f-nombre"),
      email: v("#f-email"),
      fono: v("#f-fono"),
      comuna: v("#f-comuna"),
      m2: conM2 ? m2 : 0,
      btu: (conM2 && r && !r.excede) ? r.btu : 0,
      detalle: v("#f-msg"),
      pagina: window.location.href,
      sitio: v("#f-sitio"),
      ms: Date.now() - t0
    };
  }

  function exito() {
    elMailPanel.hidden = true;
    elMailForm.hidden = true;
    if (elMailNote) elMailNote.hidden = true;
    if (elMailOk) elMailOk.hidden = false;
    if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "email_directo", service: state.servicio });
  }

  function fallo(mensaje) {
    enviando = false;
    elMailSend.classList.remove("is-sending");
    mostrarError(mensaje || "No pudimos enviar su solicitud.", !mensaje);
  }

  function enviar() {
    if (enviando) return;        // doble clic o doble Enter: un solo POST
    var email = $("#f-email");
    limpiarError();

    if (!email || !RE_EMAIL.test(email.value.trim())) {
      if (email) { email.classList.add("is-bad"); email.focus(); }
      mostrarError("Necesitamos un correo válido para poder responderle.", false);
      return;
    }

    enviando = true;
    elMailSend.classList.add("is-sending");

    window.fetch(CT_CONFIG.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Sin cookies a proposito: con la cookie de sesion WordPress exige ademas la
      // cabecera X-WP-Nonce y rechaza la peticion. Es decir, sin esto el formulario
      // se rompe justo para quien esta con sesion iniciada — incluido quien lo pruebe.
      credentials: "omit",
      cache: "no-store",
      body: JSON.stringify(datosCorreo())
    }).then(function (res) {
      if (res.ok) { exito(); return; }
      // 400 y 429 traen un mensaje pensado para el visitante; se muestra tal cual.
      res.json().then(function (d) { fallo(d && d.message); }, function () { fallo(); });
    }, function () {
      fallo();
    });
  }

  if (elMailForm && elMailPanel && elMailSend) {
    elMailForm.addEventListener("click", function (e) {
      if (!CT_CONFIG.endpoint) return;   // sin backend: que siga el mailto:
      e.preventDefault();
      if (!elMailPanel.classList.contains("is-open")) abrirPanel();
      else enviar();
    });

    elMailSend.addEventListener("click", enviar);

    // Enter en cualquiera de los dos campos nuevos envia, como espera cualquiera.
    elMailPanel.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); enviar(); }
    });
  }

  // Enlaces directos a correo (ficha de contacto)
  $$("[data-ct-mail-link]").forEach(function (a) {
    a.href = urlCorreo("Consulta desde el sitio · ClimaTecnología",
      "Hola ClimaTecnología, quiero cotizar un servicio de climatización.");
    a.textContent = CT_CONFIG.email;
  });

  // Enlaces directos a WhatsApp (botón flotante, ficha de contacto)
  $$("[data-ct-wa-link]").forEach(function (a) {
    a.href = urlWhatsApp("Hola ClimaTecnología, quiero cotizar un servicio de climatización.");
    a.target = "_blank";
    a.rel = "noopener";
    if (a.textContent.trim() === "+56 9 1234 5678") a.textContent = CT_CONFIG.whatsappDisplay;
  });

  // Llamadas (barra móvil): el número es el mismo de WhatsApp, así que también sigue
  // a Ajustes. Con + delante: sin él, el teléfono lo marca como número local y falla.
  $$("[data-ct-tel]").forEach(function (a) { a.href = "tel:+" + CT_CONFIG.whatsapp; });

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
  // «Precios» apagado en Ajustes: fuera la seccion de precios instalados y su enlace del menu.
  $$("[data-ct-precios]").forEach(function (el) { el.hidden = !CT_CONFIG.mostrarPrecios; });

  pintarFiltros();
  pintarEquipos();
  pintarCalculadora();
  pintarCamposServicio();
  pintarPreview();

  // Exponer para depuración / integraciones externas
  window.ClimaTecnologia = { config: CT_CONFIG, catalogo: CT_CATALOGO, state: state, refrescar: function () { pintarFiltros(); pintarEquipos(); pintarCalculadora(); } };
})();
