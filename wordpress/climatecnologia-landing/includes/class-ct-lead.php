<?php
/**
 * Recepción de solicitudes del formulario y envío por correo.
 *
 * El formulario tiene dos salidas: WhatsApp (abre wa.me, no toca el servidor) y correo.
 * Esta clase es la segunda: un endpoint REST que recibe los datos y los manda a la casilla
 * de contacto con wp_mail(). No guarda nada en la base de datos.
 *
 * @package climatecnologia-landing
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class CT_Landing_Lead {

	const REST_NS   = 'climatecnologia/v1';
	const REST_RUTA = '/lead';

	/** Casilla que recibe las solicitudes. Filtrable con 'ct_landing_correo_destino'. */
	const DESTINO = 'contacto@climatecnologia.cl';

	/** Anti-abuso: como máximo LIMITE envíos por IP cada VENTANA segundos. */
	const LIMITE  = 3;
	const VENTANA = 600;

	/** Un humano no llena el formulario en menos de esto (milisegundos). */
	const MIN_MS = 3000;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'registrar_ruta' ) );
	}

	public static function registrar_ruta() {
		register_rest_route(
			self::REST_NS,
			self::REST_RUTA,
			array(
				'methods'  => WP_REST_Server::CREATABLE,
				'callback' => array( __CLASS__, 'recibir' ),
				// Formulario público: cualquiera puede enviarlo. El control de abuso está
				// en recibir(), no acá. Un nonce no sirve: WP Super Cache sirve el HTML
				// cacheado a los visitantes anónimos y el nonce llegaría compartido y vencido.
				'permission_callback' => '__return_true',
				'args'                => self::esquema(),
			)
		);
	}

	/**
	 * Campos aceptados. Todo se sanea acá; recibir() ya trabaja con datos limpios.
	 * Los topes de largo existen para que nadie use el formulario como megáfono.
	 */
	private static function esquema() {
		$texto = function ( $largo ) {
			return function ( $valor ) use ( $largo ) {
				return mb_substr( sanitize_text_field( (string) $valor ), 0, $largo );
			};
		};

		return array(
			'servicio' => array( 'sanitize_callback' => $texto( 40 ) ),
			'nombre'   => array( 'sanitize_callback' => $texto( 80 ) ),
			'email'    => array(
				'required'          => true,
				'sanitize_callback' => 'sanitize_email',
			),
			'fono'     => array( 'sanitize_callback' => $texto( 30 ) ),
			'comuna'   => array( 'sanitize_callback' => $texto( 80 ) ),
			'm2'       => array( 'sanitize_callback' => 'absint' ),
			'btu'      => array( 'sanitize_callback' => 'absint' ),
			'detalle'  => array(
				'sanitize_callback' => function ( $valor ) {
					return mb_substr( sanitize_textarea_field( (string) $valor ), 0, 1500 );
				},
			),
			'pagina'   => array( 'sanitize_callback' => 'esc_url_raw' ),
			// Trampa para bots: invisible para personas, así que debe llegar vacía.
			'sitio'    => array( 'sanitize_callback' => $texto( 100 ) ),
			// Milisegundos transcurridos desde que cargó la página.
			'ms'       => array( 'sanitize_callback' => 'absint' ),
		);
	}

	public static function recibir( WP_REST_Request $req ) {
		// --- Filtros anti-bot -------------------------------------------------
		// A un bot no se le avisa que lo pillamos: se le responde exactamente lo
		// mismo que a un envío bueno para que no aprenda a esquivar la trampa.
		if ( '' !== trim( (string) $req->get_param( 'sitio' ) ) ) {
			return self::ok();
		}

		if ( (int) $req->get_param( 'ms' ) < self::MIN_MS ) {
			return self::ok();
		}

		// --- Límite por IP ----------------------------------------------------
		// Acá sí hay una persona al otro lado, así que el error es real y visible.
		$clave = 'ct_lead_' . md5( self::ip() );
		$veces = (int) get_transient( $clave );

		if ( $veces >= self::LIMITE ) {
			return new WP_Error(
				'ct_lead_limite',
				'Ya recibimos varias solicitudes desde este equipo. Espere unos minutos o escríbanos por WhatsApp.',
				array( 'status' => 429 )
			);
		}

		// --- Validación real --------------------------------------------------
		$email = (string) $req->get_param( 'email' );

		if ( ! is_email( $email ) ) {
			return new WP_Error(
				'ct_lead_email',
				'Necesitamos un correo válido para poder responderle.',
				array( 'status' => 400 )
			);
		}

		set_transient( $clave, $veces + 1, self::VENTANA );

		$enviado = wp_mail(
			apply_filters( 'ct_landing_correo_destino', self::DESTINO ),
			self::asunto( $req ),
			self::cuerpo( $req ),
			self::cabeceras( $req )
		);

		if ( ! $enviado ) {
			return new WP_Error(
				'ct_lead_envio',
				'No pudimos enviar el correo en este momento.',
				array( 'status' => 500 )
			);
		}

		return self::ok();
	}

	private static function ok() {
		// WP Super Cache no deberia tocar un POST a wp-json, pero si alguna capa de
		// cache guardara esta respuesta, todos los visitantes verian el «ok» de otro.
		nocache_headers();

		return rest_ensure_response( array( 'ok' => true ) );
	}

	private static function asunto( WP_REST_Request $req ) {
		$nombre = $req->get_param( 'nombre' );
		$nombre = '' !== trim( (string) $nombre ) ? $nombre : 'sin nombre';

		return sprintf( 'Nueva solicitud: %s — %s', self::servicio( $req ), $nombre );
	}

	/**
	 * El servicio se acota a la lista del formulario para que nadie escriba lo que
	 * quiera en el asunto del correo.
	 */
	private static function servicio( WP_REST_Request $req ) {
		$validos = array( 'Instalación', 'Mantención', 'Reparación', 'Solo equipo' );
		$valor   = (string) $req->get_param( 'servicio' );

		return in_array( $valor, $validos, true ) ? $valor : 'Consulta';
	}

	/**
	 * Cabeceras del correo. Acá está el detalle que decide si esto llega o cae en spam:
	 *
	 * - From va en NUESTRO dominio. La IP del servidor está autorizada en el SPF de
	 *   climatecnologia.cl, así que pasa la verificación. Poner el correo del visitante
	 *   en From (el error clásico) rompería SPF/DMARC de su dominio y Gmail lo marcaría.
	 * - Reply-To sí lleva al visitante: por eso el correo es obligatorio en el formulario.
	 *   Responder desde la bandeja le llega directo a él.
	 */
	private static function cabeceras( WP_REST_Request $req ) {
		$dominio = wp_parse_url( home_url(), PHP_URL_HOST );
		$dominio = preg_replace( '/^www\./', '', (string) $dominio );

		$nombre = trim( (string) $req->get_param( 'nombre' ) );
		$email  = (string) $req->get_param( 'email' );

		$responder = '' !== $nombre
			? sprintf( '%s <%s>', $nombre, $email )
			: $email;

		return array(
			'Content-Type: text/plain; charset=UTF-8',
			sprintf( 'From: ClimaTecnología <no-reply@%s>', $dominio ),
			'Reply-To: ' . $responder,
		);
	}

	private static function cuerpo( WP_REST_Request $req ) {
		$m2  = (int) $req->get_param( 'm2' );
		$btu = (int) $req->get_param( 'btu' );

		$filas = array(
			'Servicio'  => self::servicio( $req ),
			'Nombre'    => $req->get_param( 'nombre' ),
			'Correo'    => $req->get_param( 'email' ),
			'Teléfono'  => $req->get_param( 'fono' ),
			'Comuna'    => $req->get_param( 'comuna' ),
			'Superficie' => $m2 > 0 ? $m2 . ' m²' : '',
			'BTU sugeridos' => $btu > 0 ? number_format( $btu, 0, ',', '.' ) : '',
		);

		$lineas = array();

		foreach ( $filas as $etiqueta => $valor ) {
			if ( '' !== trim( (string) $valor ) ) {
				$lineas[] = sprintf( '%-14s %s', $etiqueta . ':', $valor );
			}
		}

		$detalle = trim( (string) $req->get_param( 'detalle' ) );

		if ( '' !== $detalle ) {
			$lineas[] = '';
			$lineas[] = 'Detalle:';
			$lineas[] = $detalle;
		}

		$lineas[] = '';
		$lineas[] = '--';
		$lineas[] = 'Enviado desde el formulario de ' . home_url();
		$lineas[] = 'Página:  ' . ( $req->get_param( 'pagina' ) ? $req->get_param( 'pagina' ) : '—' );
		$lineas[] = 'Fecha:   ' . wp_date( 'd-m-Y H:i' );
		$lineas[] = 'IP:      ' . self::ip();

		return implode( "\n", $lineas );
	}

	private static function ip() {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? wp_unslash( $_SERVER['REMOTE_ADDR'] ) : '';

		return filter_var( $ip, FILTER_VALIDATE_IP ) ? $ip : '0.0.0.0';
	}
}
