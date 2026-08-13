<?php
/**
 * Plugin Name:       ClimaTecnología — Landing
 * Plugin URI:        https://climatecnologia.cl/
 * Description:       Plantilla de página a pantalla completa que reemplaza por completo el layout del tema (header, barra lateral, contenido y pie) por la landing de ClimaTecnología. Funciona con cualquier tema, sin tema hijo ni editar functions.php.
 * Version:           1.0.0
 * Requires at least: 5.9
 * Requires PHP:      7.2
 * Author:            ClimaTecnología
 * Text Domain:       climatecnologia-landing
 *
 * Uso:
 *   1. Plugins → Añadir nuevo → Subir plugin → este .zip → Activar.
 *   2. Páginas → Añadir nueva → Atributos de página → Plantilla →
 *      "ClimaTecnología — Pantalla completa" → Publicar.
 *   3. Ajustes → ClimaTecnología → número de WhatsApp y opciones.
 *
 * Este archivo y los de includes/ y templates/ se editan en el repositorio de la landing;
 * el .zip se regenera con ./build.sh. No los edites dentro de WordPress.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CT_LANDING_VER', '1.0.0' );
define( 'CT_LANDING_FILE', __FILE__ );
define( 'CT_LANDING_DIR', plugin_dir_path( __FILE__ ) );
define( 'CT_LANDING_URL', plugin_dir_url( __FILE__ ) );

/** Slug de la plantilla, guardado en el meta _wp_page_template de la página. */
define( 'CT_LANDING_TEMPLATE', 'ct-fullscreen' );

require_once CT_LANDING_DIR . 'includes/class-ct-settings.php';
require_once CT_LANDING_DIR . 'includes/class-ct-template.php';

CT_Landing_Settings::init();
CT_Landing_Template::init();
