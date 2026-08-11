# Architecture

## Pattern

**Single-page static site with a render-on-state-change loop.** No framework, no virtual DOM, no reactivity system — just an in-memory state object and hand-written paint functions called explicitly after every mutation.

Three layers, cleanly separated:

1. **Content** (`index.html`) — all visible copy, semantic structure, `data-ct-*` behavior hooks
2. **Presentation** (`styles.css`) — token-driven, entirely scoped under `.ct-page`
3. **Behavior** (`app.js`) — one IIFE, one state object, four paint functions

## The Core Loop

```
user event → mutate state.* → call pintarX() → read state → write DOM
```

There is no observer, no diffing, no subscription. Every handler mutates state then calls the paint function(s) whose output depends on what changed. Getting this pairing right is the single most important convention in the codebase — a mutation without its paint call is a silent no-op.

**State** — `app.js:56-64`, seven fields:

| Field | Type | Drives |
|-------|------|--------|
| `m2` | number (6-80) | Calculator input |
| `sol` | `baja\|media\|alta` | Calculator multiplier |
| `uso` | `dormitorio\|living\|oficina` | Calculator additive |
| `paso` | 0-3 | Which step is visible; 3 = result |
| `filtro` | `todos\|9000\|12000\|18000\|36000` | Equipment grid |
| `servicio` | string | Form + WhatsApp message |
| `equipoElegido` | string | WhatsApp message |

**Paint functions:**

| Function | Lines | Renders |
|----------|-------|---------|
| `pintarCalculadora()` | 83-121 | Steps, progress bar, nav, result card. Calls `pintarPreview()` at the end. |
| `pintarFiltros()` | 145-152 | Filter pill row (innerHTML) |
| `pintarEquipos()` | 154-175 | Product card grid (innerHTML) |
| `pintarPreview()` | 233 | WhatsApp message preview text |

Boot sequence calls all four in order (`app.js:270-273`).

## Data Flow

```
CT_CONFIG ─┐
           ├─→ merged (CT_WP wins) ─→ module scope
CT_WP ─────┘        app.js:30-39

CT_CATALOGO ──→ pintarEquipos()  ──→ .ct-prod cards
            └─→ pintarCalculadora() ──→ recommendation in result card

state.m2 ──┐
state.sol ─┼──→ calcular() ──→ {bruto, btu, excede} ──→ result card
state.uso ─┘     app.js:67-74                        └─→ armarMensaje()

form inputs ──→ armarMensaje() ──→ preview text
                              └──→ wa.me URL (on submit)
```

**The calculation** (`app.js:67-74`): `m2 × (sol.base + uso.add)` produces a raw BTU figure, then rounds *up* to the first tier in `ESCALONES` (9000/12000/18000/24000/36000) that meets or exceeds it. Above 36000 it sets `excede: true`, which switches the entire result card into "needs two units or a cassette" copy rather than recommending a product.

Note `ESCALONES` includes 24000 but `CT_CATALOGO` has no 24000 BTU entry — that tier resolves to the "a pedido" (on request) fallback branch at `app.js:110-112`.

## Entry Points

| Context | Entry | Mechanism |
|---------|-------|-----------|
| Static / local | `index.html` | Open directly; `<script defer>` at line 370 |
| WordPress | `page-climatecnologia.php` | Template Name header → admin page-attribute selection |
| WordPress assets | `functions-snippet.php:10` | `wp_enqueue_scripts` action, gated on `is_page_template()` |

**Guard clause:** `app.js:52-53` bails immediately if `.ct-page` is absent. This makes the script inert on every other WordPress page even if the enqueue condition were to leak.

## Key Abstractions

**Scoping via `.ct-page`** — the central architectural decision. Every CSS selector is prefixed with or nested under `.ct-page`, and all JS queries run from the `root` element found at `app.js:52`. The landing cannot be styled by the host WordPress theme, and cannot leak styles into it. The wrapper `<div>` is structural, not cosmetic.

**Config override chain** — `CT_CONFIG` holds defaults; `window.CT_WP` (injected by `wp_localize_script`) selectively overrides. The merge at `app.js:30-39` skips empty strings and nulls, and treats `catalogo` specially (whole-array replacement, only if non-empty). This lets a site admin change the WhatsApp number in PHP without touching JS.

**Event delegation** — three delegated listeners instead of per-element binding:
- `[data-ct-group]` containers handle their choice buttons (`app.js:129-140`)
- `[data-ct-filters]` handles filter pills, which are re-rendered via innerHTML (`app.js:177-185`)
- `root` handles `[data-ct-equipo]` and `[data-ct-servicio]` anywhere on the page (`app.js:188-200`)

Delegation on `root` is what makes the innerHTML-rebuilt product cards work without rebinding.

**Dual calculator modes** — `pasosMode` (`app.js:65`) is read once at load. In `"pasos"`, `pintarCalculadora()` hides all but the current step and gates the result behind `paso >= 3`; in `"directo"`, `el.hidden` is set to `false` for every step and the result is always visible. One render path, one boolean.

## Backend

**None.** No server, no API, no database, no persistence. The form never POSTs — `submit` is `preventDefault`ed (`app.js:242`) and the handler opens `wa.me` in a new tab with the assembled message.

State is in-memory only; a refresh resets everything.

**Documented extension point:** the `submit` handler at `app.js:241-247` is the hook for adding lead persistence (README line 41). A `gtag('generate_lead')` call already fires there (`app.js:244`) if Google Analytics is present.

## Debug Surface

`window.ClimaTecnologia` (`app.js:276`) exposes `{config, catalogo, state, refrescar()}`. `refrescar()` re-runs the three main paint functions — useful for live-editing the catalog from a console. This is the only global the script creates.
