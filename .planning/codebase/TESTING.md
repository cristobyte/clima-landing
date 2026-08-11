# Testing

## Current State

**There are no tests.** No test framework, no test files, no test directory, no assertions, no CI pipeline, no linter, no formatter config.

This is consistent with the project's constraints — no `package.json` means no dev dependencies, and adding a test runner would introduce the Node toolchain the project deliberately avoids (README line 3, 33).

## How Verification Actually Happens

Manual, in-browser:

1. Open `index.html` directly in a browser — no server needed
2. Exercise the calculator, filters, and form by hand
3. Inspect state via `window.ClimaTecnologia` in the console (`app.js:276`)
4. Call `window.ClimaTecnologia.refrescar()` to re-render after editing config/catalog live

The debug export exists precisely because there is no automated harness — it is the project's testing affordance.

## What Would Need Coverage

If tests are ever added, these are the units with real logic worth asserting on:

**`calcular(m2)`** — `app.js:67-74`. Pure function, trivially testable, the highest-value target. Edge cases:

| Input | Expected |
|-------|----------|
| `m2=6, sol=baja, uso=dormitorio` | `bruto=2880` → `btu=9000` (floor tier) |
| `m2=24, sol=media, uso=living` | `bruto=14880` → `btu=18000` |
| `m2=80, sol=alta, uso=oficina` | `bruto=62400` → `excede=true` |
| Boundary: `bruto` exactly `12000` | `btu=12000`, not `18000` (uses `>=`) |
| Unknown `sol`/`uso` key | Falls back to `media`/`living` |

**`armarMensaje()`** — `app.js:216-231`. Asserts the placeholder-substitution branches (`[tu nombre]` when blank) and the form-m2-overrides-slider-m2 rule at line 218-220.

**`miles(n)` / `clp(n)`** — `app.js:49-50`. Locale-dependent; `toLocaleString("es-CL")` then a `,`→`.` replace. Worth a regression test since the replace assumes a specific locale output format.

**`urlWhatsApp(texto)`** — `app.js:235-237`. Encoding correctness for Spanish accents and emoji.

**Catalog/tier consistency** — a data-integrity check that every `ESCALONES` tier has at least one matching `CT_CATALOGO` entry would catch the existing 24000 BTU gap (see CONCERNS.md).

## Manual QA Checklist

Derived from the code's own branches — these are the paths a change could plausibly break:

**Calculator**
- [ ] Slider updates the `m²` output live
- [ ] Progress bar reaches 100% at step 3
- [ ] "Atrás" is disabled on step 0
- [ ] "Siguiente" relabels to "Ver resultado" on step 2
- [ ] Result card animates in, disclaimer appears with it
- [ ] "Volver al paso 1" resets to step 0
- [ ] `modoCalculadora: "directo"` shows all 3 questions + result simultaneously, hides progress/nav/restart

**Equipment**
- [ ] All 5 filters render; active pill is dark
- [ ] Filtering narrows the grid correctly
- [ ] "Cotizar con instalación" scrolls to `#cotizar`, sets service to Instalación, and prefills the detail textarea

**Form**
- [ ] Preview text updates on every keystroke
- [ ] Blank fields produce `[tu nombre]` / `[tu comuna]` placeholders
- [ ] Form `m²` overrides slider `m²` in the message
- [ ] Submit opens `wa.me` in a new tab with the message prefilled

**Responsive** (three breakpoints: >900, ≤900, ≤560)
- [ ] Hamburger appears ≤900px; menu opens/closes; tapping a link closes it
- [ ] Choice groups stack to 1 column ≤560px
- [ ] FAB shrinks and repositions ≤560px

**Accessibility**
- [ ] Keyboard-only pass: focus ring visible on every interactive element
- [ ] `aria-pressed` toggles on choice buttons
- [ ] `aria-expanded` toggles on the nav button
- [ ] `prefers-reduced-motion: reduce` suppresses the result animation

**WordPress** (once deployed)
- [ ] Assets load only on the landing page
- [ ] `CT_WP` overrides reach the JS
- [ ] Image paths resolve (this is the most likely breakage — see INTEGRATIONS.md)
- [ ] Theme styles don't bleed into `.ct-page`, and vice versa

## Recommended Approach If Adding Tests

Given the no-build constraint, the options that preserve it:

1. **A plain HTML test page** (`test.html`) loading `app.js` with hand-rolled assertions logged to console — zero dependencies, matches project philosophy. Requires refactoring `calcular` etc. onto `window.ClimaTecnologia` for access.
2. **Playwright** for end-to-end — runs against `index.html` directly, tests the real DOM, and needs no source changes. Introduces `node_modules`, but only as a dev concern that never ships.

Option 2 gives more value for the effort, since most of this codebase's risk is in DOM wiring rather than pure logic.
