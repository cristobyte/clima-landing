#!/usr/bin/env bash
#
# Genera el .zip del plugin de WordPress a partir de index.html + assets/.
#
#   ./build.sh            → dist/climatecnologia-landing-<version>.zip
#
# index.html es la única fuente de verdad del markup: el bloque <div class="ct-page">
# se extrae tal cual y se escribe en templates/parts/landing-markup.php. Ese archivo
# generado no se edita a mano.

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLUG="climatecnologia-landing"
FUENTE="$RAIZ/wordpress/$SLUG"
DIST="$RAIZ/dist"
STAGE="$DIST/$SLUG"

rojo()  { printf '\033[31m%s\033[0m\n' "$*" >&2; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }
info()  { printf '  %s\n' "$*"; }

abortar() { rojo "✗ $*"; exit 1; }

# ---------- 1. Comprobaciones previas ----------

[ -f "$RAIZ/index.html" ]     || abortar "No encuentro index.html en $RAIZ"
[ -d "$RAIZ/assets" ]         || abortar "No encuentro assets/ en $RAIZ"
[ -d "$FUENTE" ]              || abortar "No encuentro el plugin en wordpress/$SLUG"
command -v zip >/dev/null     || abortar "Hace falta el comando 'zip'"

# La versión manda desde la cabecera del plugin: un solo sitio que tocar al publicar.
VERSION="$(sed -n 's/^ \* Version:[[:space:]]*\(.*\)$/\1/p' "$FUENTE/$SLUG.php" | head -1 | tr -d '[:space:]')"
[ -n "$VERSION" ] || abortar "No pude leer 'Version:' de $SLUG.php"

echo "ClimaTecnología — build $VERSION"

# ---------- 2. Extraer el bloque .ct-page de index.html ----------

MARKUP="$(awk '/^<div class="ct-page"/,/^<\/div>$/' "$RAIZ/index.html")"

[ -n "$MARKUP" ] || abortar "No pude extraer el bloque <div class=\"ct-page\"> de index.html"

# Guardas: si el markup se reorganiza y la extracción se queda corta, mejor fallar aquí
# que publicar un zip con media landing.
for marca in 'ct-header' 'ct-footer' 'ct-fab' 'id="cotizar"' '^</div>$'; do
	grep -qE "$marca" <<<"$MARKUP" || abortar "El markup extraído no contiene '$marca'. Revisa la estructura de index.html."
done

LINEAS="$(wc -l <<<"$MARKUP" | tr -d ' ')"
info "markup: $LINEAS líneas extraídas de index.html"

# ---------- 3. Preparar el staging ----------

rm -rf "$STAGE"
mkdir -p "$STAGE/templates/parts"

cp "$FUENTE/$SLUG.php" "$STAGE/"
cp -R "$FUENTE/includes" "$STAGE/"
cp "$FUENTE/templates/fullscreen.php" "$STAGE/templates/"
cp -R "$RAIZ/assets" "$STAGE/"

find "$STAGE" -name '.DS_Store' -delete

# ---------- 4. Escribir el markup como parte de plantilla ----------

PARTE="$STAGE/templates/parts/landing-markup.php"

cat > "$PARTE" <<'PHP'
<?php
/**
 * GENERADO POR build.sh — NO EDITAR A MANO.
 * Fuente: index.html, bloque <div class="ct-page"> … </div>.
 * Para cambiar el contenido, edita index.html y vuelve a ejecutar ./build.sh.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
PHP

# Las rutas de imagen del bloque son relativas (assets/img/…); dentro de WordPress
# tienen que resolverse contra la URL del plugin.
sed -e 's|src="assets/|src="<?php echo esc_url( CT_LANDING_URL ); ?>assets/|g' \
    -e 's|href="assets/|href="<?php echo esc_url( CT_LANDING_URL ); ?>assets/|g' \
    <<<"$MARKUP" >> "$PARTE"

IMGS="$(grep -c 'CT_LANDING_URL' "$PARTE" || true)"
info "rutas de assets reescritas: $IMGS"

# Nada dentro del markup debería seguir apuntando a rutas relativas.
if grep -nE '(src|href)="assets/' "$PARTE" >/dev/null; then
	abortar "Quedaron rutas relativas sin reescribir en landing-markup.php"
fi

# ---------- 5. Validar el PHP ----------

if command -v php >/dev/null; then
	while IFS= read -r archivo; do
		php -l "$archivo" >/dev/null || abortar "PHP inválido: ${archivo#$STAGE/}"
	done < <(find "$STAGE" -name '*.php')
	info "php -l: sin errores de sintaxis"
else
	info "php no está instalado, me salto la comprobación de sintaxis"
fi

# ---------- 6. Empaquetar ----------

ZIP="$DIST/$SLUG-$VERSION.zip"
rm -f "$ZIP"
( cd "$DIST" && zip -rq "$(basename "$ZIP")" "$SLUG" -x '*.DS_Store' )

PESO="$(du -h "$ZIP" | cut -f1 | tr -d ' ')"

verde "✓ dist/$(basename "$ZIP") ($PESO)"
echo
echo "  Subir en:  Plugins → Añadir nuevo → Subir plugin"
echo "  Después:   Páginas → Atributos de página → Plantilla → «ClimaTecnología — Pantalla completa»"
echo "  Ajustes:   Ajustes → ClimaTecnología (número de WhatsApp)"
