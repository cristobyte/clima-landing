# Structure

## Directory Layout

```
clima-landing/
├─ index.html                       # 372 lines — the entire page
├─ README.md                        # 106 lines — setup + WordPress deploy guide (Spanish)
├─ assets/
│  ├─ css/styles.css                # 325 lines — tokens + all components
│  ├─ js/app.js                     # 277 lines — all behavior
│  └─ img/logo.png                  # placeholder logo
├─ wordpress/
│  ├─ page-climatecnologia.php      #  30 lines — page template shell
│  └─ functions-snippet.php         #  72 lines — enqueue + config bridge
└─ .claude/settings.local.json      # Claude Code permissions
```

6 source files, 1,182 lines total. No `.git` — **this directory is not a git repository.**

## Key Locations

| Need to change… | Go to |
|-----------------|-------|
| Any visible copy | `index.html` — all text is here except calculator results and WhatsApp messages |
| Colors, radii, fonts, container width | `:root` tokens, `styles.css:7-31` |
| A specific component's styling | Search its `ct-` prefix: `.ct-calc`, `.ct-prod`, `.ct-form`, `.ct-hero`, `.ct-result` |
| WhatsApp number | `CT_CONFIG.whatsapp`, `app.js:10` (and `functions-snippet.php:33` for WP) |
| Product catalog | `CT_CATALOGO`, `app.js:18-27` |
| BTU calculation math | `calcular()`, `app.js:67-74`, plus `SOL`/`USO`/`ESCALONES`, `app.js:41-43` |
| Calculator result copy | `textos` object, `app.js:105-114` |
| WhatsApp message body | `armarMensaje()`, `app.js:216-231` |
| Responsive behavior | `styles.css:306-325` — three breakpoints |

## index.html Section Order

Everything sits inside a single `<div class="ct-page" id="ct-top">` wrapper (`index.html:19`) — this wrapper is load-bearing for the WordPress isolation strategy and must not be removed.

| Lines | Section | Anchor |
|-------|---------|--------|
| 21-40 | Sticky header + nav | — |
| 43-147 | Hero + calculator (side by side) | `#calculadora` |
| 150-155 | Stats band (4 figures) | — |
| 158-207 | Services (3 cards) | `#servicios` |
| 210-239 | Process (4 steps) | `#proceso` |
| 242-252 | Equipment grid + filters | `#equipos` |
| 255-276 | Trust / photos | — |
| 279-299 | Testimonial + brands (dark band) | — |
| 302-355 | Contact + quote form | `#cotizar` |
| 357-363 | Footer | — |
| 365-367 | Floating WhatsApp button | — |

Script loads deferred at `index.html:370`.

## app.js Section Order

Numbered comment blocks, in dependency order:

| Lines | Section |
|-------|---------|
| 8-44 | 1. Config, catalog, `CT_WP` merge, lookup tables |
| 46-53 | 2. Utilities (`$`, `$$`, `miles`, `clp`) + root guard |
| 55-74 | 3. State object + `calcular()` |
| 76-126 | 4. Calculator render + navigation |
| 128-140 | 5. Option groups (sol / uso / servicio) |
| 142-211 | 6. Equipment list + filters + `setServicio` |
| 213-255 | 7. Form → WhatsApp message assembly |
| 257-267 | 8. Mobile menu |
| 269-276 | 9. Boot + `window.ClimaTecnologia` export |

## styles.css Section Order

| Lines | Section |
|-------|---------|
| 7-31 | Tokens (`:root`) |
| 33-59 | Base / reset / shell / icon sizes |
| 61-73 | Typography scale |
| 75-96 | Buttons |
| 98-106 | Header |
| 108-136 | Hero, pill, check lists |
| 138-196 | Calculator (incl. result card, `@keyframes ct-rise`) |
| 198-223 | Sections, stats, grids, cards, steps |
| 225-244 | Equipment filters + product cards |
| 246-259 | Trust / photo placeholders |
| 261-269 | Dark testimonial band |
| 271-291 | Form + message preview |
| 293-303 | Footer + floating action button |
| 305-325 | Responsive + reduced motion |

## Naming Conventions

- **CSS classes:** `ct-` prefix, BEM-ish — `.ct-block__element`, `.ct-block--modifier`. State classes are `.is-*` (`.is-active`, `.is-open`).
- **JS hooks:** `data-ct-*` attributes, never classes. Read via `[data-ct-thing]` selectors. This cleanly separates styling from behavior — a class rename won't break JS.
- **Value carriers:** `data-value` on choice buttons, `data-filtro` on filters, `data-ct-equipo` on product CTAs.
- **Form field IDs:** `f-` prefix (`#f-nombre`, `#f-fono`, `#f-comuna`, `#f-m2`, `#f-msg`).
- **Calculator IDs:** `ct-` prefix (`#ct-m2`, `#ct-m2-out`, `#ct-nav`, `#ct-top`).
- **Spanish throughout** — identifiers, comments, copy, and commit-facing docs. `marca`, `modelo`, `pintarEquipos`, `armarMensaje`, `calcular`. Keep new code in Spanish for consistency.
