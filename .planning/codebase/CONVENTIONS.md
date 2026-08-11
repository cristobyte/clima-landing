# Conventions

## Language

**Spanish for everything** — identifiers, comments, copy, docs. `pintarEquipos`, `armarMensaje`, `calcular`, `marca`, `modelo`, `escalones`. The only English is a handful of structural HTML comments (`index.html:15-18`) and standard API names.

New code should stay in Spanish.

## JavaScript Style

Deliberately conservative ES5-flavored style. Match it:

- `var` only — no `const`/`let` anywhere
- `function` expressions — no arrow functions
- String concatenation with `+` — no template literals
- `"use strict"` at the IIFE top (`app.js:6`)
- Everything wrapped in one IIFE; exactly one intentional global (`window.ClimaTecnologia`)
- 2-space indent
- Semicolons always
- Double-quoted strings in JS; single-quoted inside generated HTML strings

**Numbered section comments** divide the file:
```js
/* ---------- 4. Calculadora ---------- */
```
Nine sections, in dependency order. New logic goes in the matching section, or gets a new numbered one.

**Compact one-liners are idiomatic here.** Guard-and-act on a single line is the norm:
```js
if (elOut) elOut.textContent = state.m2 + " m²";
if (elRange) elRange.addEventListener("input", function () { state.m2 = Number(this.value); pintarCalculadora(); });
```

**Null-guard every DOM reference.** Elements are cached at module scope (`app.js:77-81`) and every use is guarded with `if (el...)`. This is what lets the same script run against the full `index.html` and against a partial WordPress paste where sections may be missing. Preserve this — it is load-bearing, not defensive noise.

**Utilities** (`app.js:47-50`): `$(sel, ctx)` / `$$(sel, ctx)` wrap `querySelector`/`querySelectorAll`; `miles(n)` formats thousands with `.` separators; `clp(n)` prefixes `$`.

## DOM Access

**JS never selects by CSS class.** Behavior hooks are `data-ct-*` attributes exclusively:

```js
var elResult = $("[data-ct-result]");
```

Classes are for styling only. The two exceptions are state classes JS *writes* (`.is-active`, `.is-open`) and `.ct-choice` / `.ct-page`, which are read in `closest()` calls (`app.js:132`, `:52`).

This separation means a designer can rename `.ct-prod__price` freely without breaking anything.

## Rendering

Two techniques, used consistently:

**innerHTML with `.map().join("")`** for list rebuilds — filters (`app.js:147-151`) and product cards (`app.js:157-174`). String-concatenated HTML, one line per element, indented to mirror the resulting tree.

**`textContent` for text swaps** — never `innerHTML` for user-facing strings. The result card uses a selector→text map object then loops it (`app.js:105-115`):

```js
var textos = { "[data-ct-btu]": miles(r.btu), ... };
Object.keys(textos).forEach(function (sel) { var el = $(sel); if (el) el.textContent = textos[sel]; });
```

**Visibility via the `hidden` property**, paired with a CSS `[hidden] { display: none }` rule per component (`styles.css:149`, `:156`, `:162`, `:185`) — needed because those elements have `display: flex/grid` which would otherwise beat `hidden`'s default.

## State Discipline

Mutate `state.*` then call the paint function. Never write DOM directly from an event handler:

```js
if (elNext) elNext.addEventListener("click", function () {
  state.paso = Math.min(state.paso + 1, 3);
  pintarCalculadora();
});
```

Handlers that affect the message preview but not the calculator call `pintarPreview()` alone (`app.js:138`, `:199`).

## CSS Style

**Token-first.** All colors, radii, fonts, and container width are `--ct-*` custom properties on `:root` (`styles.css:7-31`). Hard-coded values appear only for one-off shadow rgba and a few gradient stops. Change the palette in one place.

**BEM-ish with `ct-` prefix:** `.ct-block`, `.ct-block__element`, `.ct-block--modifier`. State is `.is-*`.

**Everything scoped under `.ct-page`** — including the reset (`styles.css:44-52`). Never write an unscoped selector; it would leak into the WordPress theme. The sole exception is `html:has(.ct-page)` for smooth scroll (`styles.css:33`), which is intentional and scoped by the `:has()`.

**Multi-declaration single lines** are the norm for compact rules:
```css
.ct-h3 { font-size: 23px; font-weight: 700; margin-bottom: 10px; }
```
Longer rules break across lines with 2-space indent.

**Section dividers** mirror the JS:
```css
/* ---------- Botones ---------- */
```

**Fluid sizing with `clamp()`** for anything that scales — type (`styles.css:62-63`), section padding (`:199`), grid gaps (`:247`). Prefer `clamp()` over adding a breakpoint.

**Grid with `auto-fit`/`minmax`** for all multi-column layouts, so most responsive behavior is automatic. Explicit breakpoints (`styles.css:306`, `:316`) handle only what intrinsic sizing can't: the mobile nav, single-column overrides, and padding reductions.

## Accessibility Conventions

Consistently applied, worth maintaining:

- `aria-pressed="true"` on active choice buttons, **removed** (not set to `"false"`) when inactive (`app.js:134-136`, `:207-209`)
- `aria-expanded` on the nav toggle, synced as a string (`app.js:262`)
- `role="group"` + `aria-label` on every choice cluster (`index.html:96`, `:106`, `:250`, `:325`)
- `:focus-visible` with a blue ring, globally scoped (`styles.css:51`)
- `--ct-orange-cta: #cf3d08` is the AA-compliant orange used for all CTA text; `--ct-orange` (`#ff5a14`) is decorative only. Comment at `styles.css:12` records this.
- `prefers-reduced-motion` kill-switch (`styles.css:323-325`)
- `aria-hidden="true"` on decorative arrow glyphs (`index.html:176`)

## Error Handling

Essentially absent by design — no `try`/`catch`, no validation, no error states. The strategy is total null-tolerance: guard every DOM lookup, fall back to defaults on missing data (`SOL[state.sol] || SOL.media`, `app.js:68`), and degrade to a "cotización a medida" branch when no catalog match exists (`app.js:110-113`).

The form carries `novalidate` (`index.html:323`) and no field is required — deliberate, since the WhatsApp message is built with `[tu nombre]` / `[tu comuna]` placeholders for whatever the user left blank (`app.js:223-224`).

## PHP Style

WordPress conventions, distinct from the JS/CSS style: tabs for indent, `snake_case` with a `clima_` prefix, Yoda-free conditionals, `array()` long syntax, spaces inside parens `( ... )`. `ABSPATH` guard at the top of both files.
