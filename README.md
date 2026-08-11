# ClimaTecnología — landing page (código base)

HTML + CSS + JS plano, sin build, sin dependencias, sin framework. Pensado para (a) seguir
desarrollándolo con Claude Code y (b) subirlo a WordPress como página personalizada.

```
climatecnologia-frontend/
├─ index.html                      # la página completa (ábrela en el navegador tal cual)
├─ assets/
│  ├─ css/styles.css               # tokens (:root --ct-*) + componentes, todo bajo .ct-page
│  ├─ js/app.js                    # calculadora BTU, filtros, formulario → WhatsApp
│  └─ img/logo.png                 # reemplazar por el logo definitivo (SVG idealmente)
└─ wordpress/
   ├─ page-climatecnologia.php     # plantilla de página para el tema hijo
   └─ functions-snippet.php        # enqueue de CSS/JS + config desde PHP (y WooCommerce opcional)
```

## Lo que hay que editar antes de publicar

1. **Número de WhatsApp** — `assets/js/app.js`, objeto `CT_CONFIG` (`whatsapp` en formato
   internacional sin `+`, y `whatsappDisplay` para mostrar). Alimenta el botón flotante,
   la ficha de contacto y el envío del formulario.
2. **Catálogo de equipos** — `CT_CATALOGO` en el mismo archivo (`marca`, `modelo`, `btu`,
   `m2`, `desde`, `tipo`). El filtro de potencia y la recomendación de la calculadora se
   generan desde ahí.
3. **Fotos reales** — `assets/img/instalacion-1.jpg`, `-2.jpg`, `-3.jpg`. Si el archivo no
   existe, la tarjeta muestra un marcador punteado con la descripción de la foto que falta.
4. **Datos de contacto y horario** — en `index.html`, sección `#cotizar`.
5. **Testimonio y marcas** — sección `.ct-dark` de `index.html` (usar reseñas reales).

## Cómo está construido

- **Sin build**: se abre `index.html` directamente; no hay npm, ni Sass, ni bundler.
- **CSS con prefijo y ámbito**: todos los selectores viven bajo `.ct-page`, y las clases usan
  el prefijo `ct-`. Así el tema de WordPress no rompe la landing ni al revés. Los tokens
  (colores, radios, tipografías, ancho de contenedor) están en `:root` como `--ct-*`.
- **JS en un IIFE**: sin variables globales salvo `window.ClimaTecnologia` (config, catálogo,
  estado y `refrescar()`) para depurar o integrar desde fuera.
- **Estado en memoria, sin backend**: el formulario no envía nada al servidor; construye el
  mensaje y abre `wa.me` en una pestaña nueva. Si más adelante quieres guardar los leads,
  el punto de enganche es el `submit` de `[data-ct-form]` en `app.js`.
- **Accesibilidad**: contraste AA en los CTA (naranja `#cf3d08` sobre blanco), `:focus-visible`
  con anillo azul, `aria-pressed` en los grupos de selección, `aria-expanded` en el menú móvil
  y respeto de `prefers-reduced-motion`.
- **Responsive**: tres cortes (≥900px escritorio, ≤900px con menú hamburguesa, ≤560px móvil).

## Modos de la calculadora

`CT_CONFIG.modoCalculadora`:

- `"pasos"` (por defecto) — flujo guiado de 3 preguntas con barra de progreso y resultado al final.
- `"directo"` — las 3 preguntas y el resultado visibles a la vez, se actualiza en vivo.

## Montaje en WordPress

**Opción A — plantilla de página (recomendada, es la que traen los archivos de `wordpress/`)**

1. `wp-content/themes/TU-TEMA-HIJO/climatecnologia/assets/` ← copia la carpeta `assets/`.
2. Copia `wordpress/page-climatecnologia.php` a la raíz del tema hijo y pega dentro el bloque
   `<div class="ct-page" id="ct-top"> … </div>` completo de `index.html`.
3. Pega `wordpress/functions-snippet.php` al final del `functions.php` del tema hijo (ajusta
   el número de WhatsApp ahí y podrás cambiarlo sin tocar el JS).
4. Crea la página en el admin y elige la plantilla **ClimaTecnología — Landing**.
5. Marca la página como "sin barra lateral / ancho completo" si el tema lo ofrece.

**Opción B — bloque HTML personalizado**: pega el mismo `<div class="ct-page">` en un bloque
*HTML personalizado* de Gutenberg y encola el CSS/JS con el snippet (cambiando la condición
`is_page_template` por `is_page( 'slug-de-la-pagina' )`). Sirve para probar rápido, pero el
editor visual puede reformatear el markup: para producción usa la opción A.

**Opción C — Elementor / constructor**: widget *HTML* con el mismo bloque, y el CSS/JS por
snippet. Ojo con los estilos del constructor: puede que haya que subir la especificidad
añadiendo `body .ct-page` a algún selector.

### Notas de integración

- Rutas de imágenes: en WordPress cambia `assets/img/...` por
  `<?php echo get_stylesheet_directory_uri(); ?>/climatecnologia/assets/img/...` o sube las
  fotos a la Biblioteca de medios y usa sus URLs.
- Tipografías: el snippet carga Manrope y Figtree desde Google Fonts. Para RGPD/velocidad,
  autoaloja las fuentes y quita ese `wp_enqueue_style`.
- Caché: si usas WP Rocket/LiteSpeed, excluye `app.js` de la combinación/diferido agresivo,
  o al menos verifica que la calculadora siga respondiendo.
- WooCommerce: `functions-snippet.php` incluye `clima_catalogo_desde_woocommerce()` para
  alimentar el catálogo desde productos reales; descomenta la clave `catalogo` del
  `wp_localize_script` para activarlo.
- Analítica: el `submit` del formulario ya dispara un evento `generate_lead` si existe `gtag`.

## Trabajar con Claude Code

Puntos de entrada útiles al pedir cambios:

- Estilos globales → variables `--ct-*` en `:root` de `styles.css`.
- Un componente concreto → busca su prefijo de clase (`.ct-calc`, `.ct-prod`, `.ct-form`, …).
- Lógica → `app.js` está numerado por secciones: 1 config, 2 utilidades, 3 estado,
  4 calculadora, 5 grupos de opciones, 6 equipos/filtros, 7 formulario/WhatsApp,
  8 menú móvil, 9 arranque.
- Contenido → todo el texto visible está en `index.html`; nada de copy vive en el JS salvo
  los mensajes de WhatsApp y los textos del resultado de la calculadora (sección 4).

## Pendiente / mejoras sugeridas

- Fotos reales de instalaciones y reseñas verificables (con nombre y comuna).
- Datos estructurados `LocalBusiness` + `AggregateRating` en el `<head>` para SEO local.
- Guardado de leads (Contact Form 7, WPForms o endpoint propio) además del WhatsApp.
- Logo en SVG y favicon.
