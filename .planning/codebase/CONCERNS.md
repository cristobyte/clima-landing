# Concerns

Ordered by severity. Every item below was verified against the source, not inferred.

---

## 🔴 Blockers — must fix before launch

### 1. Placeholder WhatsApp number in 4 places

The entire site's only conversion path points at a fake number.

| File | Line | Value |
|------|------|-------|
| `assets/js/app.js` | 10 | `whatsapp: "56912345678"` |
| `assets/js/app.js` | 11 | `whatsappDisplay: "+56 9 1234 5678"` |
| `index.html` | 310 | `+56 9 1234 5678` (visible link text) |
| `wordpress/functions-snippet.php` | 33-34 | both keys |

There's a subtle coupling worth knowing: `app.js:254` replaces the link text **only if it exactly matches** the string `"+56 9 1234 5678"`. Edit `index.html:310` to some other placeholder and the JS silently stops syncing it — you'd have two different numbers on the page. Change `CT_CONFIG` rather than the markup, or change both together.

### 2. Fabricated social proof

Marketing claims presented as fact, none sourced:

- `index.html:48` — "5,0 en Google · +1.200 instalaciones en la RM"
- `index.html:151-154` — stats band repeating 5,0 / +1.200 / SEC·TE1 / 3 años
- `index.html:289-290` — a full testimonial attributed to "Carolina M. · Ñuñoa · reseña de Google"
- `index.html:294-296` — six brand names (Samsung, Midea, Hisense, LG, TCL, Anwo) claimed as "Marcas oficiales"

The README itself flags these as placeholders needing real data (lines 29, 103). Publishing invented reviews and certification claims is a consumer-protection exposure in Chile (SERNAC), independent of the SEO/trust cost. The TE1/SEC certification claims in particular are regulated.

### 3. Missing images

`assets/img/` contains only `logo.png`. The three installation photos referenced at `index.html:266-268` and README line 26 (`instalacion-1.jpg`, `-2.jpg`, `-3.jpg`) do not exist.

This degrades gracefully — `styles.css:255-259` renders a dashed placeholder with the `data-label` text — so it isn't visually broken, but the "Trabajos reales, no renders" section currently shows three empty boxes, which undercuts the exact claim it's making.

---

## 🟠 Correctness

### 4. 24000 BTU tier has no catalog entry

`ESCALONES` (`app.js:43`) lists `[9000, 12000, 18000, 24000, 36000]`. `CT_CATALOGO` (`app.js:18-27`) has entries for 9000, 12000, 18000, and 36000 — **verified: zero 24000 entries**.

A space calculating to 24000 BTU (roughly 36-46 m² depending on sun/use) hits the fallback branch at `app.js:110-112` and shows:

> Equipo sugerido — **a pedido** / "24.000 BTU a pedido" / "No publicado en tienda, lo conseguimos"

Not a crash, and the copy handles it, but it's a dead end in the funnel for a common apartment size. The `FILTROS` array (`app.js:44`) also omits 24000, so the equipment grid offers no way to browse that tier either.

Fix: add a 24000 product, or drop 24000 from `ESCALONES` so those spaces round up to 36000.

### 5. `miles()` locale assumption is fragile

```js
function miles(n) { return Math.round(n).toLocaleString(CT_CONFIG.moneda).replace(/,/g, "."); }
```
`app.js:49`

This calls `toLocaleString("es-CL")` — which **already** returns `12.000` with dot separators — then replaces commas with dots anyway. The replace is a no-op for the configured locale and only exists as insurance if `moneda` is changed to a comma-separator locale. But if someone sets `moneda: "en-US"`, `1,234.56` becomes `1.234.56`. Since `moneda` is overridable from PHP (`CT_CONFIG` merge at `app.js:30-39`), this is reachable.

### 6. WooCommerce integration will produce broken data if enabled

`clima_catalogo_desde_woocommerce()` (`functions-snippet.php:46-72`) reads `_btu` and `_m2` from post meta and casts with `(int)`. Missing meta yields `0`.

A catalog entry with `btu: 0` never matches any `ESCALONES` tier, so it can never be recommended, and `String(0)` matches no filter, so it never appears in the grid — it becomes an invisible row. There's no validation or filtering of zero-BTU products.

Currently dormant (the `'catalogo'` key is commented out at line 37), so this is a landmine rather than an active bug.

---

## 🟡 SEO & Performance

### 7. No structured data, no social cards, no favicon

The `<head>` (`index.html:3-12`) has title, description, and viewport — nothing else. Missing:

- `LocalBusiness` + `AggregateRating` JSON-LD (README line 104 flags this) — the highest-value SEO gap for a local service business
- Open Graph / Twitter Card tags — links shared to WhatsApp, the site's own primary channel, will render with no preview image
- `<link rel="canonical">`
- Favicon (README line 106)
- `lang="es-CL"` is set correctly (`index.html:2`) ✓

### 8. Render-blocking font CDN

Google Fonts loads as a blocking `<link rel="stylesheet">` (`index.html:10`) before the local stylesheet. Preconnects are present (lines 8-9), which helps, but self-hosting would remove a third-party round trip on the critical path — and would also address the GDPR angle the README raises (line 80-81), though that's not a Chilean legal requirement.

### 9. No image optimization strategy

`logo.png` is loaded twice (`index.html:24`, `:359`) with no `width`/`height` attributes — a CLS contributor. The planned installation photos have no `loading="lazy"` in the template comment's example beyond a bare mention (`index.html:267`), and no `srcset` guidance.

---

## 🟢 Maintainability

### 10. Not a git repository

`git status` fails — there is no `.git` directory. No version history, no branches, no ability to review or revert changes. For a site about to be hand-edited (numbers, copy, catalog, then pasted into WordPress), this is the highest-leverage fix available and takes one command.

### 11. WordPress markup must be duplicated by hand

`page-climatecnologia.php:23-25` contains an empty `.ct-page` wrapper with an instruction comment to paste ~350 lines of markup from `index.html`. Once deployed, `index.html` and the PHP template are two copies of the same content that must be updated in lockstep.

This is inherent to the no-build constraint. Mitigations, in order of effort: (a) treat `index.html` as canonical and re-paste on every change, accepting drift risk; (b) have the template `include` a separate `content.php` partial shared between both; (c) introduce a minimal build step, which contradicts the project's stated philosophy.

Worth deciding deliberately before the first WordPress deploy, because the cost compounds.

### 12. Manual cache-busting

`$ver = '1.0.0'` (`functions-snippet.php:18`) must be bumped by hand on every asset change. Forgetting it serves stale CSS/JS to returning visitors. `filemtime()` on the asset path would automate this.

### 13. Duplicated config between JS and PHP

`CT_CONFIG` defaults (`app.js:9-15`) and the `wp_localize_script` array (`functions-snippet.php:32-38`) declare the same four keys. They can drift. The merge logic means PHP wins, so the JS values become dead defaults in production — but a developer reading `app.js` alone would not know that.

---

## Non-Concerns

Things that look like problems but are deliberate and correct:

- **`innerHTML` in `pintarEquipos`/`pintarFiltros`** — the interpolated data comes from a hardcoded catalog, not user input. Not an XSS vector as written. It *would* become one if the WooCommerce path is enabled, since product names would then be admin-controlled — worth revisiting then.
- **`novalidate` + no required fields** (`index.html:323`) — intentional. `armarMensaje()` substitutes `[tu nombre]` / `[tu comuna]` placeholders, so a half-filled form still produces a usable WhatsApp message. Lowering form friction is the right call for this funnel.
- **No backend / no lead storage** — a deliberate architectural choice, documented at README line 39-41 with the extension point identified (`app.js:241`). README line 105 lists lead capture as a future improvement.
- **Exhaustive `if (el)` null guards** — not defensive clutter. They let the same script run against both the full `index.html` and a partial WordPress paste where sections may be missing.
- **ES5 style with `var`** — consistent and intentional, avoids any transpilation need. See CONVENTIONS.md.
