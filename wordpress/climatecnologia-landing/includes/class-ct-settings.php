<?php
/**
 * Ajustes del plugin — Ajustes → ClimaTecnología.
 *
 * Los valores se entregan a assets/js/app.js como objeto global CT_WP; el JS ya sabe
 * fusionarlos sobre su CT_CONFIG interno (ver sección 1 de app.js).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CT_Landing_Settings {

	const OPTION = 'ct_landing_options';
	const GROUP  = 'ct_landing_group';
	const PAGE   = 'climatecnologia-landing';

	/** Mismos valores que trae CT_CONFIG en app.js. */
	public static function defaults() {
		return array(
			'whatsapp'        => '56912345678',
			'whatsappDisplay' => '+56 9 1234 5678',
			'mostrarPrecios'  => true,
			'modoCalculadora' => 'pasos',
		);
	}

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'registrar' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( CT_LANDING_FILE ), array( __CLASS__, 'enlace_ajustes' ) );
	}

	/** Opciones guardadas + valores por defecto para las claves que falten. */
	public static function get() {
		$guardadas = get_option( self::OPTION );

		return wp_parse_args( is_array( $guardadas ) ? $guardadas : array(), self::defaults() );
	}

	public static function menu() {
		add_options_page(
			'ClimaTecnología — Landing',
			'ClimaTecnología',
			'manage_options',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	public static function enlace_ajustes( $enlaces ) {
		$url = admin_url( 'options-general.php?page=' . self::PAGE );
		array_unshift( $enlaces, '<a href="' . esc_url( $url ) . '">Ajustes</a>' );

		return $enlaces;
	}

	public static function registrar() {
		register_setting(
			self::GROUP,
			self::OPTION,
			array(
				'type'              => 'array',
				'sanitize_callback' => array( __CLASS__, 'sanear' ),
				'default'           => self::defaults(),
			)
		);

		add_settings_section( 'ct_contacto', 'Contacto', array( __CLASS__, 'ayuda_contacto' ), self::PAGE );
		add_settings_section( 'ct_landing', 'Landing', '__return_false', self::PAGE );

		add_settings_field( 'whatsapp', 'Número de WhatsApp', array( __CLASS__, 'campo_whatsapp' ), self::PAGE, 'ct_contacto' );
		add_settings_field( 'whatsappDisplay', 'Número visible', array( __CLASS__, 'campo_display' ), self::PAGE, 'ct_contacto' );
		add_settings_field( 'mostrarPrecios', 'Precios', array( __CLASS__, 'campo_precios' ), self::PAGE, 'ct_landing' );
		add_settings_field( 'modoCalculadora', 'Calculadora', array( __CLASS__, 'campo_modo' ), self::PAGE, 'ct_landing' );
	}

	public static function sanear( $entrada ) {
		$defaults = self::defaults();
		$entrada  = is_array( $entrada ) ? $entrada : array();

		// Solo dígitos: formato internacional que espera wa.me (56912345678).
		$whatsapp = isset( $entrada['whatsapp'] ) ? preg_replace( '/\D/', '', $entrada['whatsapp'] ) : '';

		$modo = isset( $entrada['modoCalculadora'] ) ? $entrada['modoCalculadora'] : '';
		if ( ! in_array( $modo, array( 'pasos', 'directo' ), true ) ) {
			$modo = $defaults['modoCalculadora'];
		}

		$display = isset( $entrada['whatsappDisplay'] ) ? sanitize_text_field( $entrada['whatsappDisplay'] ) : '';

		return array(
			'whatsapp'        => '' !== $whatsapp ? $whatsapp : $defaults['whatsapp'],
			'whatsappDisplay' => '' !== $display ? $display : $defaults['whatsappDisplay'],
			'mostrarPrecios'  => ! empty( $entrada['mostrarPrecios'] ),
			'modoCalculadora' => $modo,
		);
	}

	public static function ayuda_contacto() {
		echo '<p>Alimenta el botón flotante, la ficha de contacto y el mensaje que arma el formulario.</p>';
	}

	public static function campo_whatsapp() {
		$o = self::get();
		printf(
			'<input type="text" class="regular-text" name="%s[whatsapp]" value="%s" placeholder="56912345678"> <p class="description">Formato internacional, solo dígitos, sin <code>+</code> ni espacios.</p>',
			esc_attr( self::OPTION ),
			esc_attr( $o['whatsapp'] )
		);
	}

	public static function campo_display() {
		$o = self::get();
		printf(
			'<input type="text" class="regular-text" name="%s[whatsappDisplay]" value="%s" placeholder="+56 9 1234 5678"> <p class="description">Cómo se muestra el número en la página.</p>',
			esc_attr( self::OPTION ),
			esc_attr( $o['whatsappDisplay'] )
		);
	}

	public static function campo_precios() {
		$o = self::get();
		printf(
			'<label><input type="checkbox" name="%s[mostrarPrecios]" value="1" %s> Mostrar los precios «desde» en las fichas de equipos</label>',
			esc_attr( self::OPTION ),
			checked( ! empty( $o['mostrarPrecios'] ), true, false )
		);
	}

	public static function campo_modo() {
		$o      = self::get();
		$modos  = array(
			'pasos'   => 'Guiada en 3 pasos (recomendado)',
			'directo' => 'Todo a la vista, se actualiza en vivo',
		);
		$salida = '<select name="' . esc_attr( self::OPTION ) . '[modoCalculadora]">';
		foreach ( $modos as $valor => $etiqueta ) {
			$salida .= sprintf(
				'<option value="%s" %s>%s</option>',
				esc_attr( $valor ),
				selected( $o['modoCalculadora'], $valor, false ),
				esc_html( $etiqueta )
			);
		}
		$salida .= '</select>';

		echo $salida; // phpcs:ignore WordPress.Security.EscapeOutput -- ya escapado arriba.
	}

	public static function render() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1>ClimaTecnología — Landing</h1>
			<p>
				Crea una página y elige la plantilla <strong>«ClimaTecnología — Pantalla completa»</strong>
				en <em>Atributos de página</em>. Esa página reemplaza por completo el layout del tema:
				cabecera, barra lateral, contenido y pie.
			</p>
			<?php if ( $paginas = self::paginas_con_plantilla() ) : ?>
				<p>
					Páginas usando la plantilla:
					<?php foreach ( $paginas as $p ) : ?>
						<a href="<?php echo esc_url( get_permalink( $p ) ); ?>"><?php echo esc_html( get_the_title( $p ) ); ?></a>&nbsp;
					<?php endforeach; ?>
				</p>
			<?php else : ?>
				<p><em>Todavía no hay ninguna página usando la plantilla.</em></p>
			<?php endif; ?>
			<form action="options.php" method="post">
				<?php
				settings_fields( self::GROUP );
				do_settings_sections( self::PAGE );
				submit_button();
				?>
			</form>
			<p class="description">
				El catálogo de equipos se edita en <code>assets/js/app.js</code> del plugin
				(<code>CT_CATALOGO</code>) y se vuelve a generar el .zip con <code>build.sh</code>.
			</p>
		</div>
		<?php
	}

	/** IDs de las páginas que ya tienen asignada la plantilla, para el aviso del panel. */
	private static function paginas_con_plantilla() {
		return get_posts(
			array(
				'post_type'      => 'page',
				'post_status'    => 'any',
				'posts_per_page' => 10,
				'fields'         => 'ids',
				'meta_key'       => '_wp_page_template',
				'meta_value'     => CT_LANDING_TEMPLATE,
			)
		);
	}
}
