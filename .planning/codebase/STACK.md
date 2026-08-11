# Stack

## Summary

Static landing page. Vanilla HTML + CSS + JavaScript, **no build step, no dependencies, no framework, no package manager**. Opens directly in a browser via `index.html`. Secondary deployment target is WordPress as a child-theme page template.

## Languages & Runtime

| Layer | Technology | Notes |
|-------|-----------|-------|
| Markup | HTML5 | `index.html`, 372 lines, `lang="es-CL"` |
| Styles | CSS (plain) | `assets/css/styles.css`, 325 lines. No preprocessor. |
| Behavior | JavaScript ES5-style | `assets/js/app.js`, 277 lines. IIFE, `"use strict"`. |
| WordPress glue | PHP | `wordpress/*.php`, 102 lines total |

**No `package.json`, no `node_modules`, no lockfile, no bundler, no transpiler, no linter config, no CI.**

## JavaScript Baseline

Written in a deliberately conservative style — `var`, `function` expressions, no arrow functions, no `const`/`let`, no template literals, no modules. Uses `Array.prototype.slice.call()` to convert NodeLists rather than `Array.from`.

Two modern APIs are used despite the ES5 style, and they set the real browser floor:
- `Element.closest()` — `app.js:132`, `:179`, `:189`, `:198`, `:265`
- `Object.keys().forEach()` — `app.js:31`, `:115`

Effective support: all evergreen browsers, IE11 excluded.

## CSS Baseline

Modern CSS, no fallbacks or vendor autoprefixing beyond hand-written range-input prefixes:

- **Custom properties** — full token system on `:root` (`styles.css:7-31`)
- **`:has()`** — `html:has(.ct-page)` for scoped smooth scroll (`styles.css:33`). Highest browser requirement in the file (Firefox 121+, Dec 2023).
- **`clamp()`** — fluid type and spacing throughout
- **CSS Grid + `auto-fit`/`minmax`** — every layout section
- **`aspect-ratio`** — photo placeholders (`styles.css:252-253`)
- **`backdrop-filter`** — sticky header blur (`styles.css:99`)
- **CSS mask with inline SVG data URI** — checklist bullets (`styles.css:128-133`), `-webkit-mask` + `mask`
- **`text-wrap: pretty`** — `styles.css:41`
- **`padding-inline` / `padding-block` / `border-block`** — logical properties throughout
- Hand-written vendor prefixes only for `::-webkit-slider-*` / `::-moz-range-*` (`styles.css:166-170`)

## External Runtime Dependencies

| Dependency | Source | Where |
|-----------|--------|-------|
| Manrope (500,600,700,800) | Google Fonts CDN | `index.html:10`, `functions-snippet.php:21-26` |
| Figtree (400,500,600) | Google Fonts CDN | same |

Preconnect hints at `index.html:8-9`. These are the **only** external requests. Fonts have `system-ui, -apple-system, sans-serif` fallbacks in the token definitions (`styles.css:29-30`).

All icons are inline SVG — no icon library, no sprite sheet.

## Configuration

Runtime config lives in one object, `CT_CONFIG` at `app.js:9-15`:

| Key | Default | Purpose |
|-----|---------|---------|
| `whatsapp` | `"56912345678"` | International format, no `+`. **Placeholder — must be replaced.** |
| `whatsappDisplay` | `"+56 9 1234 5678"` | Human-readable form |
| `modoCalculadora` | `"pasos"` | `"pasos"` (guided 3-step) \| `"directo"` (all visible) |
| `mostrarPrecios` | `true` | Toggles price display to "Cotizar" |
| `moneda` | `"es-CL"` | Locale passed to `toLocaleString` |

Product catalog is a second literal, `CT_CATALOGO` at `app.js:18-27` — 8 entries, each `{marca, modelo, btu, m2, desde, tipo}`.

**PHP override path:** WordPress can replace any config key (and the whole catalog) via `wp_localize_script` exposing a global `CT_WP`, merged at `app.js:30-39`. See INTEGRATIONS.md.

## Assets

- `assets/img/logo.png` — placeholder; README calls for SVG replacement
- `assets/img/instalacion-1.jpg`, `-2.jpg`, `-3.jpg` — **referenced in comments but do not exist**. CSS renders a dashed placeholder with `data-label` text when absent (`styles.css:255-259`).
- No favicon.

## Versioning

WordPress asset cache-busting uses a hardcoded `$ver = '1.0.0'` string (`functions-snippet.php:18`), manually bumped. No automated versioning anywhere.
