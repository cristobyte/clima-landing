<?php
/**
 * ClimaTecnología — snippet para functions.php del tema hijo.
 * Encola CSS/JS solo en la página que usa la plantilla de la landing,
 * y pasa la configuración (número de WhatsApp, precios, catálogo) desde PHP a JS.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

function clima_landing_assets() {

	// Solo en la página con la plantilla de la landing.
	if ( ! is_page_template( 'page-climatecnologia.php' ) ) {
		return;
	}

	$base = get_stylesheet_directory_uri() . '/climatecnologia';
	$ver  = '1.0.0'; // súbelo al publicar cambios para romper la caché

	// Tipografías (quítalas si ya las carga el tema o si las autoalojas).
	wp_enqueue_style(
		'clima-fonts',
		'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Figtree:wght@400;500;600&display=swap',
		array(),
		null
	);

	wp_enqueue_style( 'clima-landing', $base . '/assets/css/styles.css', array(), $ver );
	wp_enqueue_script( 'clima-landing', $base . '/assets/js/app.js', array(), $ver, true );

	// Configuración editable desde PHP (o desde ACF / opciones del tema).
	wp_localize_script( 'clima-landing', 'CT_WP', array(
		'whatsapp'        => '56912345678',
		'whatsappDisplay' => '+56 9 1234 5678',
		'mostrarPrecios'  => true,
		'modoCalculadora' => 'pasos', // 'pasos' | 'directo'
		// 'catalogo'     => clima_catalogo_desde_woocommerce(), // ver README
	) );
}
add_action( 'wp_enqueue_scripts', 'clima_landing_assets' );

/**
 * Opcional: alimentar el catálogo desde productos de WooCommerce.
 * Requiere campos personalizados _btu y _m2 en cada producto.
 */
function clima_catalogo_desde_woocommerce() {

	if ( ! class_exists( 'WooCommerce' ) ) {
		return array();
	}

	$productos = wc_get_products( array(
		'status'   => 'publish',
		'limit'    => 24,
		'category' => array( 'aire-acondicionado' ),
	) );

	$salida = array();

	foreach ( $productos as $producto ) {
		$salida[] = array(
			'marca'  => $producto->get_attribute( 'marca' ),
			'modelo' => $producto->get_name(),
			'btu'    => (int) $producto->get_meta( '_btu' ),
			'm2'     => (int) $producto->get_meta( '_m2' ),
			'desde'  => (float) $producto->get_price(),
			'tipo'   => $producto->get_attribute( 'tipo' ),
		);
	}

	return $salida;
}
