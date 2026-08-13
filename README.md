# ClimaTecnología — landing page (código base)

HTML + CSS + JS plano, sin dependencias ni framework. Pensado para (a) seguir desarrollándolo
con Claude Code abriendo `index.html` directamente y (b) empaquetarlo con `./build.sh` en un
plugin de WordPress que reemplaza el layout del tema por completo.

```
climatecnologia-frontend/
├─ index.html                      # la página completa (ábrela en el navegador tal cual)
├─ build.sh                        # genera dist/climatecnologia-landing-<versión>.zip
├─ assets/
│  ├─ css/styles.css               # tokens (:root --ct-*) + componentes, todo bajo .ct-page
│  ├─ js/app.js                    # calculadora BTU, filtros, formulario → WhatsApp
│  └─ img/logo.png                 # reemplazar por el logo definitivo (SVG idealmente)
└─ wordpress/climatecnologia-landing/   # fuente del plugin
   ├─ climatecnologia-landing.php       # cabecera del plugin y constantes
   ├─ includes/class-ct-template.php    # plantilla a pantalla completa + neutralizar el tema
   ├─ includes/class-ct-settings.php    # pantalla Ajustes → ClimaTecnología
   └─ templates/fullscreen.php          # el documento HTML entero (sin get_header/get_footer)
```

`index.html` es la única fuente de verdad del markup: `build.sh` extrae de ahí el bloque
`<div class="ct-page">` y lo escribe en `templates/parts/landing-markup.php` dentro del zip.
Ese archivo se genera, nunca se edita a mano.

## Lo que hay que editar antes de publicar

1. **Número de WhatsApp** — `assets/js/app.js`, objeto `CT_CONFIG` (`whatsapp` en formato
   internacional sin `+`, y `whatsappDisplay` para mostrar). Alimenta el botón flotante,
   la ficha de contacto y el envío del formulario. Una vez instalado el plugin ya no hace
   falta tocar el JS: se cambia en *Ajustes → ClimaTecnología*.
2. **Catálogo de equipos** — `CT_CATALOGO` en el mismo archivo (`marca`, `modelo`, `btu`,
   `m2`, `desde`, `tipo`). El filtro de potencia y la recomendación de la calculadora se
   generan desde ahí.
3. **Fotos reales** — `assets/img/instalacion-1.jpg`, `-2.jpg`, `-3.jpg`. Si el archivo no
   existe, la tarjeta muestra un marcador punteado con la descripción de la foto que falta.
4. **Datos de contacto y horario** — en `index.html`, sección `#cotizar`.
5. **Testimonio y marcas** — sección `.ct-dark` de `index.html` (usar reseñas reales).

## Cómo está construido

- **Sin build para desarrollar**: se abre `index.html` directamente; no hay npm, ni Sass, ni
  bundler. `build.sh` es bash puro y solo hace falta para generar el zip de WordPress.
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

### Generar el zip

```bash
./build.sh          # → dist/climatecnologia-landing-1.0.0.zip
```

Extrae el markup de `index.html`, copia `assets/`, valida la sintaxis PHP y empaqueta.
La versión sale de la cabecera `Version:` de `wordpress/climatecnologia-landing/climatecnologia-landing.php`:
súbela ahí antes de publicar cambios para que WordPress rompa la caché de CSS y JS.

### Instalar

1. **Plugins → Añadir nuevo → Subir plugin** → el `.zip` → *Instalar* → *Activar*.
2. **Páginas → Añadir nueva** → *Atributos de página → Plantilla* →
   **«ClimaTecnología — Pantalla completa»** → *Publicar*.
3. **Ajustes → ClimaTecnología** → número de WhatsApp, precios y modo de la calculadora.

No hace falta tema hijo, ni tocar `functions.php`, ni FTP. Para actualizar, vuelve a subir
el zip nuevo sobre el plugin instalado.

### Qué significa "pantalla completa"

**Markup:** `templates/fullscreen.php` emite el `<html>` entero y **no** llama a
`get_header()`, `get_sidebar()` ni `get_footer()`, así que el tema no llega a imprimir su
cabecera, su menú, su barra lateral ni su pie: la página es solo la landing.

**CSS:** en esa página se aplica una **lista blanca** — solo se imprimen las hojas cuyo
handle empieza por `ct-`, más las de la barra de administración. Ni WordPress, ni el tema,
ni ningún plugin aportan un byte de CSS: la página se renderiza exactamente igual que
`index.html` abierto en el navegador (comprobado con capturas idénticas píxel a píxel).
Se filtra `print_styles_array`, la lista final de handles justo antes de imprimirse, así que
también atrapa a los plugins que encolan tarde. Lo que no pasa por esa cola —estilos globales
del `theme.json`, `@font-face` de temas de bloques, «CSS adicional» del Personalizador,
emojis, skip-link— se desengancha en origen.

Si necesitas que el CSS de algún plugin sí cargue en la landing, añádelo por filtro sin
tocar el plugin:

```php
add_filter( 'ct_landing_estilos_permitidos', function ( $permitidos ) {
	$permitidos[] = 'handle-del-plugin';
	return $permitidos;
} );
```

**JavaScript:** aquí no hay lista blanca. Solo se quita el JS del tema (que se quedaría sin
markup al que engancharse) y el detector de emojis. La analítica, GTM y los píxeles siguen
cargando, que es lo que necesita el evento `generate_lead` del formulario.

Todo está condicionado a las páginas que usan la plantilla: el resto del sitio sigue igual.
Y se conservan `wp_head()`, `wp_body_open()` y `wp_footer()` — sin ellos se romperían la
barra de administración, la analítica y cualquier otro plugin.

### Notas de integración

- Imágenes: `build.sh` reescribe las rutas `assets/img/...` a la URL del plugin. Si prefieres
  la Biblioteca de medios, usa esas URLs directamente en `index.html`.
- Tipografías: el plugin carga Manrope y Figtree desde Google Fonts. Para RGPD/velocidad,
  autoaloja las fuentes y quita ese `wp_enqueue_style` de `class-ct-template.php`.
- Caché: si usas WP Rocket/LiteSpeed, excluye `app.js` de la combinación/diferido agresivo,
  o al menos verifica que la calculadora siga respondiendo.
- Analítica: el `submit` del formulario ya dispara un evento `generate_lead` si existe `gtag`.
- WooCommerce: si algún día quieres alimentar el catálogo desde productos reales, añade a
  `class-ct-template.php` una clave `catalogo` en el `wp_localize_script` con un array de
  `{ marca, modelo, btu, m2, desde, tipo }` — `app.js` ya la reconoce y sustituye con ella el
  `CT_CATALOGO` interno.

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
