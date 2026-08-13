<?php
/**
 * Plantilla a pantalla completa.
 *
 * La toma de control es total por dos vías:
 *
 * 1. Markup — templates/fullscreen.php NO llama a get_header() ni a get_footer(), así que
 *    el tema nunca llega a imprimir su cabecera, su barra lateral ni su pie.
 * 2. CSS — filtrar_estilos() deja pasar solo las hojas de la landing. Ni WordPress, ni el
 *    tema, ni ningún plugin aportan un byte de CSS a esta página: se ve exactamente igual
 *    que index.html abierto en el navegador.
 *
 * El JavaScript ajeno sí se respeta (analítica, GTM, píxeles); solo se quita el del tema y
 * el detector de emojis, que existe únicamente para el CSS de emojis que ya no cargamos.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CT_Landing_Template {

	/**
	 * Único CSS admitido en la página, además del propio de la landing (prefijo 'ct-').
	 * La barra de administración solo la ven usuarios con sesión iniciada; sin sus estilos
	 * se vería rota, y no llega a las visitas anónimas.
	 */
	private static $preservar = array( 'admin-bar', 'dashicons' );

	public static function init() {
		add_filter( 'theme_page_templates', array( __CLASS__, 'registrar_plantilla' ) );
		add_filter( 'template_include', array( __CLASS__, 'cargar_plantilla' ), 99 );
		add_action( 'template_redirect', array( __CLASS__, 'quitar_css_del_nucleo' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'encolar' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'desencolar_js_del_tema' ), 100 );
		add_filter( 'print_styles_array', array( __CLASS__, 'filtrar_estilos' ) );
	}

	/** ¿La petición actual es la página con nuestra plantilla? */
	public static function es_nuestra_pagina() {
		if ( ! is_page() ) {
			return false;
		}

		return CT_LANDING_TEMPLATE === get_page_template_slug( get_queried_object_id() );
	}

	/** Añade la plantilla al selector de Atributos de página, sea cual sea el tema. */
	public static function registrar_plantilla( $plantillas ) {
		$plantillas[ CT_LANDING_TEMPLATE ] = 'ClimaTecnología — Pantalla completa';

		return $plantillas;
	}

	public static function cargar_plantilla( $plantilla ) {
		if ( ! self::es_nuestra_pagina() ) {
			return $plantilla;
		}

		$nuestra = CT_LANDING_DIR . 'templates/fullscreen.php';

		return file_exists( $nuestra ) ? $nuestra : $plantilla;
	}

	/**
	 * CSS del núcleo que no viaja por la cola de estilos y que, por tanto, filtrar_estilos()
	 * no puede interceptar: hay que desengancharlo en origen.
	 *
	 * Si una versión futura de WordPress renombra estas funciones, remove_action simplemente
	 * no hace nada — no rompe la página.
	 */
	public static function quitar_css_del_nucleo() {
		if ( ! self::es_nuestra_pagina() ) {
			return;
		}

		// Estilos globales del theme.json: desde WP 6.9 se imprimen en wp_footer y se suben
		// a la cabecera sustituyendo un marcador, así que desencolarlos no basta.
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_global_styles' );
		remove_action( 'wp_footer', 'wp_enqueue_global_styles', 1 );
		remove_action( 'wp_footer', 'wp_enqueue_global_styles_custom_css' );

		// Con temas de bloques: las @font-face del theme.json (que pueden declarar la misma
		// familia que nuestras fuentes) y el enlace «saltar al contenido», que apunta a un
		// #content que esta plantilla no tiene.
		remove_action( 'wp_head', 'wp_print_font_faces', 50 );

		// El skip-link tiene dos vías: la moderna y una antigua que normalmente desengancha
		// la moderna al ejecutarse. Al quitar la moderna hay que quitar también la antigua,
		// o imprime sus estilos en el pie.
		remove_action( 'wp_enqueue_scripts', 'wp_enqueue_block_template_skip_link' );
		remove_action( 'wp_footer', 'the_block_template_skip_link' );

		// «CSS adicional» del Personalizador: es CSS del tema aunque no viva en su carpeta.
		remove_action( 'wp_head', 'wp_custom_css_cb', 101 );

		// Detector de emojis: solo existe para el CSS de emojis que ya no cargamos.
		remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	}

	public static function encolar() {
		if ( ! self::es_nuestra_pagina() ) {
			return;
		}

		wp_enqueue_style(
			'ct-fonts',
			'https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Figtree:wght@400;500;600&display=swap',
			array(),
			null // phpcs:ignore WordPress.WP.EnqueuedResourceParameters -- URL ya versionada por Google.
		);

		wp_enqueue_style( 'ct-landing', CT_LANDING_URL . 'assets/css/styles.css', array( 'ct-fonts' ), CT_LANDING_VER );
		wp_enqueue_script( 'ct-landing', CT_LANDING_URL . 'assets/js/app.js', array(), CT_LANDING_VER, true );

		$o = CT_Landing_Settings::get();

		wp_localize_script(
			'ct-landing',
			'CT_WP',
			array(
				'whatsapp'        => $o['whatsapp'],
				'whatsappDisplay' => $o['whatsappDisplay'],
				// '1'/'0' y no true/false: wp_localize_script convierte false en cadena
				// vacía, y app.js ignora las claves vacías (sección 1). Con '0' sí apaga.
				'mostrarPrecios'  => empty( $o['mostrarPrecios'] ) ? '0' : '1',
				'modoCalculadora' => $o['modoCalculadora'],
			)
		);
	}

	/**
	 * Lista blanca de CSS: en esta página solo se imprime el de la landing.
	 *
	 * Se filtra 'print_styles_array' —la lista final de handles, justo antes de imprimirlos—
	 * en lugar de desencolar en 'wp_enqueue_scripts' porque este punto se aplica tanto en la
	 * cabecera como en el pie y atrapa lo que se encole en cualquier prioridad, incluidos los
	 * plugins que encolan tarde. Al quitar un handle desaparecen también sus estilos en línea
	 * (wp_add_inline_style), que es como el núcleo imprime los de emojis y los de img
	 * auto-sizes.
	 *
	 * Una lista blanca no se desfasa: da igual cómo renombre WordPress sus handles.
	 *
	 * @param string[] $handles Handles a punto de imprimirse.
	 * @return string[]
	 */
	public static function filtrar_estilos( $handles ) {
		if ( ! self::es_nuestra_pagina() ) {
			return $handles;
		}

		/**
		 * Permite readmitir el CSS de un plugin concreto en la landing.
		 *
		 * @param string[] $permitidos Handles admitidos además de los que empiezan por 'ct-'.
		 */
		$permitidos = apply_filters( 'ct_landing_estilos_permitidos', self::$preservar );

		return array_values(
			array_filter(
				(array) $handles,
				static function ( $handle ) use ( $permitidos ) {
					return 0 === strpos( $handle, 'ct-' ) || in_array( $handle, $permitidos, true );
				}
			)
		);
	}

	/**
	 * El markup del tema ya no se imprime, así que su JavaScript se queda sin objeto y puede
	 * dar errores buscando elementos que no existen (menús, sliders, lazy-load propios).
	 *
	 * Aquí no se aplica lista blanca: el JS ajeno —analítica, GTM, píxeles— sí se respeta,
	 * porque el formulario de la landing dispara un evento 'generate_lead' vía gtag.
	 */
	public static function desencolar_js_del_tema() {
		if ( ! self::es_nuestra_pagina() ) {
			return;
		}

		// Los src registrados pueden ser absolutos o relativos a la raíz del sitio,
		// así que comparamos contra la URL completa y contra su ruta.
		$raices = array();
		foreach ( array( get_template_directory_uri(), get_stylesheet_directory_uri() ) as $uri ) {
			$raices[] = $uri;
			$ruta     = wp_parse_url( $uri, PHP_URL_PATH );
			if ( $ruta ) {
				$raices[] = $ruta;
			}
		}
		$raices = array_unique( array_filter( $raices ) );

		$scripts = wp_scripts();

		foreach ( (array) $scripts->queue as $handle ) {
			if ( 0 === strpos( $handle, 'ct-' ) || empty( $scripts->registered[ $handle ]->src ) ) {
				continue;
			}

			foreach ( $raices as $raiz ) {
				if ( false !== strpos( $scripts->registered[ $handle ]->src, $raiz ) ) {
					wp_dequeue_script( $handle );
					break;
				}
			}
		}
	}
}
