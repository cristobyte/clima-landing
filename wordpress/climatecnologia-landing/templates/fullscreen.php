<?php
/**
 * Documento completo de la landing.
 *
 * Aquí no hay get_header(), get_sidebar() ni get_footer() a propósito: este archivo emite
 * el <html> entero, así que el layout del tema desaparece por completo.
 *
 * wp_head(), wp_body_open() y wp_footer() sí se mantienen: sin ellos se rompen la barra de
 * administración, la analítica y cualquier otro plugin que inyecte ahí.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php
	// Si el tema declara soporte de title-tag, el <title> lo imprime wp_head().
	// Si no, lo emitimos aquí: wp_get_document_title() pasa por los mismos filtros,
	// así que Yoast, Rank Math y compañía lo siguen controlando.
	if ( ! current_theme_supports( 'title-tag' ) ) {
		echo '<title>' . esc_html( wp_get_document_title() ) . '</title>' . "\n";
	}
	wp_head();
	?>
</head>
<body <?php body_class( 'ct-fullscreen' ); ?>>
<?php wp_body_open(); ?>

<?php
// El markup lo genera build.sh a partir de index.html. Si el zip se armó a mano y esa parte
// falta, la página sale vacía en vez de con un error 500.
$ct_parte = CT_LANDING_DIR . 'templates/parts/landing-markup.php';
if ( file_exists( $ct_parte ) ) {
	require $ct_parte;
}
?>

<?php wp_footer(); ?>
</body>
</html>
