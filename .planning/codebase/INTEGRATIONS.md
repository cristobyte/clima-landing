# Integrations

## Summary

Four external touchpoints, all client-side. **No backend, no API calls, no database, no auth.** The site never makes a `fetch`/XHR request of any kind.

| Integration | Direction | Status |
|-------------|-----------|--------|
| WhatsApp (`wa.me`) | Outbound link | Active — placeholder number |
| Google Fonts | Inbound asset | Active |
| Google Analytics (`gtag`) | Outbound event | Conditional — fires only if `gtag` exists |
| WordPress / WooCommerce | Config + data injection | Written, not deployed |

## WhatsApp — primary conversion path

The entire site funnels to WhatsApp. There is no other lead channel.

**URL construction** (`app.js:235-237`):
```js
function urlWhatsApp(texto) {
  return "https://wa.me/" + CT_CONFIG.whatsapp + (texto ? "?text=" + encodeURIComponent(texto) : "");
}
```

**Three entry points:**

1. **Form submit** (`app.js:241-247`) — `preventDefault`, then `window.open(url, "_blank", "noopener")` with the full assembled message
2. **Floating action button** (`index.html:365`) — generic message
3. **Contact card link** (`index.html:310`) — generic message

Both (2) and (3) carry `data-ct-wa-link` and are wired in a single loop (`app.js:250-255`), which also sets `target="_blank"`, `rel="noopener"`, and swaps the hardcoded display number for `CT_CONFIG.whatsappDisplay`.

**Message assembly** (`armarMensaje()`, `app.js:216-231`) builds a Spanish sentence from form fields plus calculator state, with bracketed placeholders for anything blank:

```
Hola ClimaTecnología, necesito: Instalación. Soy [tu nombre]. Estoy en [tu comuna].
El espacio tiene unos 24 m². Según la calculadora necesito 12.000 BTU.
```

It re-runs `calcular()` against the form's `#f-m2` field if filled, otherwise falls back to `state.m2` (`app.js:218-220`) — so the message reflects the form, not the slider, when the two disagree.

A live preview of this exact string renders in the form (`[data-ct-preview]`, `index.html:346`), updated on every `input` event.

⚠️ **The number is a placeholder:** `56912345678` at `app.js:10`, duplicated at `functions-snippet.php:33` and as visible text at `index.html:310`. All three need updating before launch.

## Google Fonts

Loaded via CDN `<link>` (`index.html:8-10`), with `preconnect` hints to both `fonts.googleapis.com` and `fonts.gstatic.com`.

- **Manrope** 500/600/700/800 — headings (`--ct-font-head`)
- **Figtree** 400/500/600 — body (`--ct-font-body`)
- `display=swap`

In WordPress the same stylesheet is enqueued as handle `clima-fonts` with `null` version (`functions-snippet.php:21-26`).

README (line 80-81) flags self-hosting as a GDPR/performance improvement — Google Fonts CDN sends visitor IPs to Google, which has been ruled non-compliant in some EU jurisdictions. Chile has no equivalent restriction, so this is a performance consideration here rather than a legal one.

## Google Analytics / gtag

Single conditional event at `app.js:244`:

```js
if (typeof window.gtag === "function") window.gtag("event", "generate_lead", { method: "whatsapp", service: state.servicio });
```

**No analytics script is loaded anywhere in this codebase.** The event is a no-op until GA4 (or a tag manager) is added — presumably by the WordPress theme in production. The `generate_lead` event name is GA4's standard recommended-event name, so it will map correctly to conversion reporting once wired.

No Meta Pixel, no other tracking.

## WordPress

Two files, neither yet deployed. Three documented integration options (README lines 54-73); Option A (page template) is what the files implement.

**`page-climatecnologia.php`** — a template shell with `Template Name: ClimaTecnología — Landing` in its docblock, which is what makes it selectable in the WP admin's Page Attributes. Calls `get_header()` / `get_footer()` around an **empty** `.ct-page` wrapper (line 23-25). The markup from `index.html` must be pasted in manually — this file is a scaffold, not a working template.

**`functions-snippet.php`** — pasted into a child theme's `functions.php`:

- Hooks `wp_enqueue_scripts` (line 40)
- Gates on `is_page_template('page-climatecnologia.php')` (line 13) so assets load on one page only
- Expects assets at `{child-theme}/climatecnologia/assets/` (line 17)
- Manual cache-bust version `'1.0.0'` (line 18)
- Enqueues JS in the footer (`true` as the 5th arg, line 29)

**Config bridge** — `wp_localize_script` exposes a `CT_WP` global (lines 32-38), consumed at `app.js:30-39`. Any `CT_CONFIG` key can be overridden from PHP. The merge skips `""` and `null`, so a blank PHP value falls back to the JS default rather than clobbering it.

Path caveat (README line 77-79): image `src` attributes in the pasted markup are relative (`assets/img/...`) and will 404 under WordPress — they need `get_stylesheet_directory_uri()` prefixes or Media Library URLs.

Caching caveat (README line 82-83): aggressive JS combination/deferral in WP Rocket or LiteSpeed can break the calculator; `app.js` should be excluded.

## WooCommerce (optional, dormant)

`clima_catalogo_desde_woocommerce()` (`functions-snippet.php:46-72`) replaces the hardcoded `CT_CATALOGO` with live products:

- Guards on `class_exists('WooCommerce')`, returns `array()` if absent
- Queries up to 24 published products in the `aire-acondicionado` category
- Maps each to the catalog shape, reading `marca`/`tipo` from product attributes and `_btu`/`_m2` from post meta

**Currently disabled** — the `'catalogo'` key is commented out at `functions-snippet.php:37`. Activating it requires that every product carry `_btu` and `_m2` custom fields; missing meta casts to `0`, which would break both the filter matching and the calculator recommendation (see CONCERNS.md).
