export const CHANGELOG = [
  {
    version: "2.15.1",
    date: "2026-07-20",
    changes: [
      "RTL: overrides para story-panel, setup-card, story-title",
      "aria-invalid en input guestNames + role=alert en errores RSVP",
      "console.warn eliminado de GalleryArrayEditor (toast basta)",
      "async innecesario eliminado de DataTab",
    ],
  },
  {
    version: "2.15.0",
    date: "2026-07-20",
    changes: [
      "SEO: meta description, OG tags (title, description, url, type), theme-color",
      "PWA: manifest.json creado (instalable, standalone, iconos 96/192/512)",
      "Fonts: preload para Playfair Display y Lora en index.html",
      "Eliminado @sentry/react (DSN placeholder, nunca funcionaba)",
      "GallerySection + HeroSection: loading=lazy en todas las imágenes",
      "Title actualizado a 'Wedingo — Invitaciones de boda'",
    ],
  },
  {
    version: "2.14.3",
    date: "2026-07-20",
    changes: [
      "Refactor: DataTab migrado de inline styles a clases CSS (data-tab-*, admin-*)",
      "Eliminadas constantes thStyle/tdStyle no usadas",
    ],
  },
  {
    version: "2.14.2",
    date: "2026-07-20",
    changes: [
      "Refactor: utility classes CSS para reducir inline styles en admin (admin-flex, admin-text-mono, etc.)",
      "TokensTab: migrados inline styles a clases CSS",
    ],
  },
  {
    version: "2.14.1",
    date: "2026-07-20",
    changes: [
      "Fix: revert lazy LegalModal/ChangelogModal (importados estáticamente por UIContext/SupportTab)",
    ],
  },
  {
    version: "2.14.0",
    date: "2026-07-20",
    changes: [
      "CSS muerto eliminado: support-section, cookie-settings, body::before duplicado, bg-shimmer",
      "font-display: swap añadido a OpenDyslexic",
      "Touch targets: .modal-close y .toast__close a 44px mínimos (WCAG)",
      "RTL: toast-container añadido a rtl.css",
      "aria-label en botón eliminar de GalleryManager",
      "role=alert en error de nombres de RSVP",
      "Lazy loading: AccessibilityPanel, LegalModal, ChangelogModal",
    ],
  },
  {
    version: "2.13.7",
    date: "2026-07-20",
    changes: [
      "PrintPage: añadida ubicación y hora debajo de la fecha",
    ],
  },
  {
    version: "2.13.6",
    date: "2026-07-20",
    changes: [
      "PrintPage simplificada: solo muestra mensaje de invitación + fecha (sin enlace, ubicación ni countdown)",
    ],
  },
  {
    version: "2.13.5",
    date: "2026-07-20",
    changes: [
      "Fix: RSVP form responsive (choice grid 1 col en móvil, gap reducido)",
      "Fix: input type=date min-height para móviles",
    ],
  },
  {
    version: "2.13.4",
    date: "2026-07-20",
    changes: [
      "Fix: input fecha nacimiento en móviles (min-height + appearance auto para type=date)",
    ],
  },
  {
    version: "2.13.3",
    date: "2026-07-20",
    changes: [
      "Fix: navbar restaurado a display flex (estaba block, rompía layout idioma/accesibilidad/legales)",
    ],
  },
  {
    version: "2.13.2",
    date: "2026-07-20",
    changes: [
      "Admin: contenedores ocupan toda la altura de pantalla (flex column + overflow-y)",
    ],
  },
  {
    version: "2.13.1",
    date: "2026-07-20",
    changes: [
      "Fix: PanelTab inviteToken venía de props en vez de props.config (mostraba 'undefined')",
    ],
  },
  {
    version: "2.13.0",
    date: "2026-07-20",
    changes: [
      "OPTIMIZACIÓN: bundle 9.0MB → 6.1MB (-32%)",
      "Fuentes subseteadas a Latin-only (7 imports en vez de 15, ahorro ~2MB)",
      "Vendor chunk: React/i18n separados del bundle principal",
      "Dependencias muertas eliminadas: i18next-icu, @sentry/vite-plugin",
      "Imágenes comprimidas: eucalyptus 379→117KB, rings 265→100KB",
      "CSS muerto eliminado: animaciones sin referencia, clases support/cookies sin uso",
    ],
  },
  {
    version: "2.12.20",
    date: "2026-07-20",
    changes: [
      "PrintPage reescrita: reutiliza los componentes reales de sección (HeroSection, DetailsSection, etc.)",
      "Print: réplica exacta de la invitación digital en papel, sin navbar/footer/RSVP/audio",
    ],
  },
  {
    version: "2.12.19",
    date: "2026-07-19",
    changes: [
      "Fix: warnings de oxlint — imports sin uso eliminados (path, vi, useTranslation, heroBackdropSrc, compressAudio)",
      "Fix: AttendanceTab depende de entries que cambiaba cada render",
      "Fix: AuthContext missing dep 'auth' en useEffect",
    ],
  },
  {
    version: "2.12.18",
    date: "2026-07-19",
    changes: [
      "PrintPage reescrita desde cero: recrea la invitación con todo detalle para invitados",
      "Print: secciones con fecha, hora, lugar, horario, código de vestimenta, niños, historia, regalos, alojamiento",
      "Print: oculta navbar, footer, RSVP, botón de audio, decorations, lightbox y modales",
      "PrintCSS: diseño renovado con bordes, iconos, tipografía temática y saltos de página",
    ],
  },
  {
    version: "2.12.17",
    date: "2026-07-19",
    changes: [
      "Revertido navbar a position: fixed con body padding-top y --navbar-height en :root",
      "Corregido desbordamiento inferior de contenedores (setup-card, app-scene con offset correcto)",
    ],
  },
  {
    version: "2.12.16",
    date: "2026-07-19",
    changes: [
      "MusicPlayer oculto si no hay música subida (no aparece botón ♪ sin audio)",
    ],
  },
  {
    version: "2.12.15",
    date: "2026-07-19",
    changes: [
      "Admin-bar también cambiado a sticky top, .app-scene con top: var(--navbar-height)",
    ],
  },
  {
    version: "2.12.14",
    date: "2026-07-19",
    changes: [
      "Navbar cambiado de position: fixed a position: sticky; top: 0",
      "App-footer movido antes de <main> en el DOM para sticky top",
      "Eliminado padding-top correctivo del body y top offset del .app-scene",
    ],
  },
  {
    version: "2.12.13",
    date: "2026-07-19",
    changes: [
      "Definido --navbar-height: 2.2rem en :root, body con padding-top para no solaparse con navbar",
      "MusicPlayer desplazado debajo del navbar (top: calc(var(--navbar-height) + 0.75rem))",
      "Admin/setup ya usaban var(--navbar-height) pero sin definir — ahora funciona correctamente",
    ],
  },
  {
    version: "2.12.12",
    date: "2026-07-19",
    changes: [
      "FAB del MusicPlayer se desplaza a la izquierda al abrir el reproductor con animación smooth",
      "Card aparece desde la misma posición del FAB con fade+scale",
    ],
  },
  {
    version: "2.12.11",
    date: "2026-07-19",
    changes: [
      "MusicPlayer: animaciones elegantes en show/hide, play/stop, glow pulsante",
      "FAB con bounce en apertura, equalizer con fade, glow en play, card con slide+fade",
    ],
  },
  {
    version: "2.12.10",
    date: "2026-07-19",
    changes: [
      "Navbar (app-footer) cambiado a display: block con alineación centrada",
    ],
  },
  {
    version: "2.12.9",
    date: "2026-07-19",
    changes: [
      "MusicPlayer z-index subido a 10002 (por encima de modales y lightbox)",
    ],
  },
  {
    version: "2.12.8",
    date: "2026-07-19",
    changes: [
      "MusicPlayer rediseñado: botón lateral con corchea, play/pausa + volumen, sin seek bar",
      "Ecualizador animado en el FAB cuando suena la música",
    ],
  },
  {
    version: "2.12.7",
    date: "2026-07-19",
    changes: [
      "Fondo animado con luces moviéndose desde arriba/abajo hacia la profundidad",
    ],
  },
  {
    version: "2.12.6",
    date: "2026-07-19",
    changes: [
      "Panel /admin: solo botones de copia de seguridad y restauración",
    ],
  },
  {
    version: "2.12.5",
    date: "2026-07-19",
    changes: [
      "Eliminado botón 'Como invitado' del panel /admin",
    ],
  },
  {
    version: "2.12.4",
    date: "2026-07-19",
    changes: [
      "Eliminado botón 'Vista previa' del panel /admin",
    ],
  },
  {
    version: "2.12.3",
    date: "2026-07-19",
    changes: [
      "Fix: AttendanceTab crash completo — rsvpEntries.length directo sin guard",
    ],
  },
  {
    version: "2.12.2",
    date: "2026-07-19",
    changes: [
      "Fix: AttendanceTab crash cuando filteredEntries es undefined (.length en null)",
    ],
  },
  {
    version: "2.12.1",
    date: "2026-07-19",
    changes: [
      "Fix: AttendanceTab crash cuando rsvpEntries es undefined (filter en null)",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-07-19",
    changes: [
      "ELIMINADO SoundCloud Picker — se reemplaza por subida de archivo de audio propio",
      "Nuevo AudioUploadPicker: sube MP3/WAV/OGG/M4A (máx 5 MB) como música de fondo",
      "MusicPlayer simplificado: solo reproducción nativa <audio>, sin iframe SoundCloud",
      "musicFile: nuevo campo cifrado en Firestore para almacenar el audio subido",
      "Traducciones actualizadas: eliminadas claves de SoundCloud, añadidas de audio",
      "Eliminada variable de entorno VITE_SOUNDCLOUD_CLIENT_ID",
    ],
  },
  {
    version: "2.11.4",
    date: "2026-07-19",
    changes: [
      "Fondo animado de página con más profundidad radial y animación más brillante",
      "Segunda capa de profundidad (body::after) con vignette sutil y movimiento propio",
    ],
  },
  {
    version: "2.11.3",
    date: "2026-07-19",
    changes: [
      "Sombra en la parte superior de la solapa (drop-shadow sobre clip-path triangular)",
    ],
  },
  {
    version: "2.11.2",
    date: "2026-07-19",
    changes: [
      "Sello de cera subido ligeramente hacia arriba en la solapa",
    ],
  },
  {
    version: "2.11.1",
    date: "2026-07-19",
    changes: [
      "Nombres de los novios movidos al borde inferior del envelope",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-07-19",
    changes: [
      "Sello de cera realista en la solapa del envelope: rojo con corazón repujado",
      "Fuentes del envelope aumentadas (nombres, dirección, mensaje interior)",
      "Bugfix: variable message restaurada en EnvelopeOverlay (ReferenceError en producción)",
      "Bugfix: CSP font-src añadido data: para fuentes base64 inlineadas por Vite",
      "Bugfix: crypto-utils ITER_LEN 2→3 bytes (600K iteraciones truncadas a 16 bits)",
      "Tests: +113 tests en 9 módulos, 21 test files, 255 tests pasando",
    ],
  },
  {
    version: "2.10.0",
    date: "2026-07-19",
    changes: [
      "Envelope rediseñado a sobre de invitación realista: papel crema con textura, bordes dorados, solapa triangular con pliegue",
      "Envelope más grande: 400px de ancho (antes 300px) con aspect-ratio 1.43:1",
      "Sombra oscura notable (box-shadow 0 18px 60px rgba(0,0,0,0.5)) para dar profundidad realista",
      "Carta interior con línea de pliegue y aspecto de cartulina gruesa",
      "Brillo/shimmer eliminado, sustituido por 3 luces redondas que orbitan suavemente",
      "Blur de fondo subido a 50px para ocultar completamente el contenido tras el sobre",
      "Todos los estilos de envelope migrados de index.css a envelope.css",
    ],
  },
  {
    version: "2.9.0",
    date: "2026-07-19",
    changes: [
      "CRÍTICO: Firestore rules corregidas — session hijacking bloqueado, galleryData ya no es público",
      "CRÍTICO: Cifrado mejorado — 600K iteraciones PBKDF2 + salt aleatorio, compatible con datos existentes",
      "AppContext dividido en 4 providers separados (ConfigContext, AuthContext, RsvpContext, UIContext)",
      "SetupForm dividido en 7 sub-formularios (de 646 a ~80 líneas)",
      "Migración completa a TypeScript (~90 archivos .js/.jsx → .ts/.tsx)",
      "SoundCloud Picker: buscador de canciones con preview para música de fondo",
      "Traducción automática del navegador activada (translate=yes)",
      "Media queries rotas restauradas en decorations.css, admin.css, lang.css",
      "GalleryArrayEditor: grid responsive (5 col → 3 → 2 → 1)",
      "Handlers inline extraídos con useCallback en 6 componentes (re-renders reducidos)",
      "Galería: auto-avance migrado de setInterval a requestAnimationFrame",
      "useReducedMotion hook creado e integrado en galería",
      "Envelope accesible por teclado (tabIndex, role, onKeyDown)",
      "rtl.css creado con overrides para 6 idiomas RTL",
      "CookieConsent con useFocusTrap",
      "ChangelogModal: useEffect reemplazado por useEscapeKey",
      "9 translation keys faltantes añadidas a 80+ idiomas",
      "AttendanceChart: componente React con traducciones reales (reemplaza chart-utils)",
      "Constantes extraídas: CACHE_TTL_MS, MAX_TEXTAREA_LENGTH, SESSION_RENEW_INTERVAL_MS, etc.",
      "TypeScript configurado (tsconfig.json strict mode + script typecheck)",
      "Test infra: vitest.setup.js + tests de CollapsibleSection y Fireflies",
      "Sentry configurado (DSN pendiente)",
      "firebase-tools como devDependency, scripts actualizados",
      "Superadmin route rotada, tailwind.config.js eliminado, paquetes muertos removidos",
      "Fix: admin-utils calcRSVPSummary/getDietarySummary manejaban null entries (crash en PanelTab)",
      "Fix: galleryData read rule pública (se rompió al requerir hasActiveSession)",
    ],
  },
  {
    version: "2.8.0",
    date: "2026-07-18",
    changes: [
      "HeroSection unificada: usa story-card como el resto de secciones, eliminado invite-shell",
      "Animaciones de entrada uniformes en todas las secciones (story-card-enter + hero-fade-up escalonado)",
      "Hover glow en todos los story-card (box-shadow + scale), no solo en hero",
      "Eliminado cifrado de descripciones de galería — se guardan en texto plano en el campo description",
      "Galería: contenedor de imagen con aspect-ratio fijo 16:10, sin saltos de layout",
      "Galería: blur→unblur 1.8s al cargar imagen, oculta el resize brusco",
      "Galería: auto-avance a 5s (antes 3s)",
      "Galería: animación de caption con fade+slide al cambiar de imagen",
      "Corregido Firestore rules: diff().affectedKeys() en updates, resource.data para inviteToken",
      "Corregido stale closure en descripciones con useRef",
      "story-title y story-copy unificados con -webkit-text-stroke y text-shadow del hero",
      "backdrop-filter unificado a blur(2px) en todos los contenedores",
    ],
  },
  {
    version: "2.7.0",
    date: "2026-07-18",
    changes: [
      "Envelope rediseñado: terciopelo rojo con bordados dorados, blur de fondo que deja ver la invitación",
      "Envelope: dos clics — el primero abre la solapa, el segundo activa la animación de salida",
      "Envelope: flash blanco a mitad de la apertura, texto dorado con brillo que flota al cielo al salir",
      "Galería: lightbox a pantalla completa al hacer clic en la imagen, con navegación por teclado y botones",
      "Galería: transición más suave entre imágenes (550ms, cross-fade con escala, cubic-bezier)",
      "Descripciones de galería cifradas en descriptionEncrypted con fallback al campo legacy",
      "Corregido: handleDescriptionBlur lee el valor del evento, no del closure (evita stale data)",
      "Mapas: botones de Google/Apple Maps siempre visibles aunque no haya coordenadas (búsqueda por nombre)",
      "story-card y story-section con overflow hidden y scroll interior cuando el contenido desborda",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-07-18",
    changes: [
      "La galería ahora muestra 10 slots fijos en una cuadrícula, cada uno con su propio botón de subir y campo de descripción",
      "Las imágenes se guardan directamente en la colección galleryData de Firestore con su posición (0–9)",
      "Eliminado el campo galleryImages del documento de invitación y de todo el flujo de guardado",
      "GallerySection carga siempre desde Firestore, sin depender de datos hidratados",
      "Añadida clave setup.replaceImage a los locales (fallback a es)",
    ],
  },
  {
    version: "2.5.2",
    date: "2026-07-18",
    changes: [
      "Corregido ReferenceError en GalleryArrayEditor: persistOrder se usaba antes de su declaración const (TDZ)",
    ],
  },
  {
    version: "2.5.1",
    date: "2026-07-18",
    changes: [
      "El formulario RSVP ahora tiene scroll interior controlado con overflow-y: auto y max-height dinámico",
      "Corregido el desbordamiento del formulario fuera de la tarjeta en pantallas pequeñas",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-07-18",
    changes: [
      "Nueva colección galleryData para almacenar imágenes de galería con posición individual y metadatos",
      "Nuevo GalleryArrayEditor conectado a galleryData con subida, borrado y ordenación",
      "Bloqueada la subcolección antigua gallery en las reglas de Firestore",
      "Simplificado SetupForm al eliminar la lógica de subcolección antigua",
    ],
  },
  {
    version: "2.4.19",
    date: "2026-07-17",
    changes: [
      "Corregido: se generaban tokens de setup duplicados cada vez que se cargaba la página",
      "refreshSetupToken ahora verifica _activeSetupToken en el documento de la invitación antes de generar uno nuevo",
      "El token generado se persiste en _activeSetupToken para mantenerlo estable entre sesiones",
      "Añadida espera a isConfigLoading para no generar tokens antes de que termine la carga",
    ],
  },
  {
    version: "2.4.18",
    date: "2026-07-17",
    changes: [
      "Nuevo GalleryArrayEditor: componente separado para gestionar el array de la galería (añadir, eliminar, reordenar con ↑↓)",
      "La galería se hidrata en todas las rutas, no solo en admin, para que esté disponible en la invitación pública",
      "GallerySection usa los datos pre-hidratados en lugar de cargar desde Firestore directamente",
      "Eliminado GalleryManager antiguo y lógica duplicada de subida en SetupForm",
    ],
  },
  {
    version: "2.4.9",
    date: "2026-07-17",
    changes: [
      "Glow radial por tema como fondo general de página con latido sutil",
      "Luciérnagas animadas con box-shadow que flotan lentamente por toda la pantalla",
      "Eliminado el fondo animado por sección, ahora es global en body",
    ],
  },
  {
    version: "2.4.8",
    date: "2026-07-17",
    changes: [
      "Nueva compilación para renovar la caché del navegador",
    ],
  },
  {
    version: "2.4.6",
    date: "2026-07-17",
    changes: [
      "El fondo de la página ahora tiene dos capas: el degradado está fijo y una luz tenue se desplaza suavemente en diagonal, sin bordes ni escalados",
    ],
  },
  {
    version: "2.4.5",
    date: "2026-07-17",
    changes: [
      "Corregido: el contenido de las secciones estaba invisible porque una regla de opacidad cero del sistema de navegación antiguo se seguía aplicando",
    ],
  },
  {
    version: "2.4.4",
    date: "2026-07-17",
    changes: [
      "El fondo de los temas ahora cubre toda la pantalla con un pseudo-elemento fijo, sin dejar bordes visibles",
      "El contenedor principal tiene el color del tema para evitar huecos entre secciones",
      "Añadida altura mínima de pantalla completa a las secciones para que funcionen correctamente en Safari",
    ],
  },
  {
    version: "2.4.3",
    date: "2026-07-17",
    changes: [
      "Actualización de versión para forzar la recarga de los archivos JavaScript en el navegador",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-07-17",
    changes: [
      "Añadido el dominio google.com a la política de seguridad para que no bloquee las peticiones internas de Firebase",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-07-17",
    changes: [
      "Corregido: todas las secciones estaban invisibles porque una norma CSS del anterior sistema de navegación les aplicaba opacidad cero",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-17",
    changes: [
      "La navegación entre secciones ahora usa el desplazamiento nativo del navegador (scroll-snap) en lugar de JavaScript",
      "Eliminados los manejadores de eventos y los estilos en línea que causaban conflictos",
      "Las secciones se apilan una detrás de otra y el navegador las encaja automáticamente al hacer scroll",
    ],
  },
  {
    version: "2.3.10",
    date: "2026-07-17",
    changes: [
      "Las transiciones entre secciones combinan clases CSS con estilos en línea solo durante la animación, evitando conflictos",
    ],
  },
  {
    version: "2.3.9",
    date: "2026-07-17",
    changes: [
      "La visibilidad de las secciones se controla exclusivamente con clases CSS, eliminando los estilos en línea que daban problemas",
    ],
  },
  {
    version: "2.3.8",
    date: "2026-07-17",
    changes: [
      "Al hacer scroll con el ratón, el teclado o la pantalla táctil, ahora se evita que el navegador desplace la página por su cuenta",
    ],
  },
  {
    version: "2.3.7",
    date: "2026-07-17",
    changes: [
      "Corregido el fondo de página en Safari eliminando el anclaje fijo del fondo",
      "Corregido un error que bloqueaba el guardado automático: el indicador de guardado se quedaba siempre activo",
      "El formulario RSVP ahora se muestra en cuanto la invitación tiene nombre, sin necesidad de ?invitar",
      "La sección RSVP ahora se carga directamente (no de forma diferida) para garantizar que siempre funcione",
      "Añadido un envoltorio Suspense para que las secciones con carga diferida no bloqueen toda la página",
    ],
  },
  {
    version: "2.3.6",
    date: "2026-07-17",
    changes: [
      "Añadido Suspense para aislar las secciones con carga diferida y permitir que la navegación entre secciones funcione correctamente",
    ],
  },
  {
    version: "2.3.5",
    date: "2026-07-17",
    changes: [
      "Corregido: el autoguardado dejaba bloqueado el sistema de guardado, impidiendo guardar cualquier cambio posterior",
    ],
  },
  {
    version: "2.3.4",
    date: "2026-07-17",
    changes: [
      "La sección RSVP ahora se carga al mismo tiempo que el resto de la página, evitando problemas de carga diferida",
    ],
  },
  {
    version: "2.3.3",
    date: "2026-07-17",
    changes: [
      "El formulario RSVP se muestra automáticamente cuando la invitación tiene datos guardados",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-07-17",
    changes: [
      "Forzada la visibilidad del formulario RSVP para que aparezca en todas las invitaciones configuradas",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-07-16",
    changes: [
      "Corregido: las decoraciones laterales tenían una posición relativa que descolocaba todo el diseño de la invitación",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-07-16",
    changes: [
      "Cada tema tiene su propio fondo de página con un degradado de colores personalizado",
      "Añadidas decoraciones florales animadas que cambian de color según el tema seleccionado",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-07-16",
    changes: [
      "RSVP: nuevos campos acompañantes y recuento por menú",
      "Animación de sobre al abrir la invitación",
      "Fondos animados con tema dinámico en cada sección",
      "Corregido CORS Firestore con long-polling",
      "Desactivado App Check (tokens demasiado grandes)",
      "Corregido bug isSavingRef que bloqueaba guardados",
      "Añadidas validaciones server-side faltantes",
      "Corregido handleClearBackground (backgroundImageStorage)",
      "Sincronizada galería entre formData y config",
    ],
  },
  {
    version: "2.1.27",
    date: "2026-07-15",
    changes: [
      "Versión clickable: muestra el changelog completo en un modal",
    ],
  },
  {
    version: "2.1.26",
    date: "2026-07-15",
    changes: [
      "Alineada versión de APP_VERSION (constants.js) con package.json",
    ],
  },
  {
    version: "2.1.25",
    date: "2026-07-15",
    changes: [
      "Auditoría: traducciones fr/de/pt/it/nl, 25 keys faltantes, manualChunks",
      "Verificado TTL de sessionExpiresAt",
      "Import estático de getDoc en PanelTab",
    ],
  },
  {
    version: "2.1.22–24",
    date: "2026-07-13",
    changes: [
      "Carga dinámica de i18n, chunk -87%",
      "Accesibilidad: contraste, teclado galería, aria-live",
      "61 keys muertas eliminadas de 84 locales",
    ],
  },
  {
    version: "2.1.21",
    date: "2026-07-12",
    changes: [
      "README actualizado con versión y estado de auditoría",
    ],
  },
  {
    version: "2.1.20",
    date: "2026-07-12",
    changes: [
      "Auditoría: resueltos 9 críticos y 12 altos",
    ],
  },
  {
    version: "2.1.19",
    date: "2026-07-12",
    changes: [
      "Resueltos 22 hallazgos medios; ErrorBoundary hook; dead code eliminado",
    ],
  },
  {
    version: "2.1.18",
    date: "2026-07-12",
    changes: [
      "Fix desbordamiento: padding en layout en vez de margin en card /admin",
      "Galería: thumbnails 5rem fijos, carrusel 3s, contenedor más ancho 56rem",
    ],
  },
  {
    version: "2.1.17",
    date: "2026-07-12",
    changes: [
      "Fix line-height en accesibilidad: calc unitless en vez de rem",
    ],
  },
  {
    version: "2.1.16",
    date: "2026-07-12",
    changes: [
      "Modal legal más ancho y sin scroll horizontal",
      "Fix race condition en login superadmin, añadida traducción login",
    ],
  },
  {
    version: "2.1.15",
    date: "2026-07-12",
    changes: [
      "Full-width/height en /admin, /setup y superadmin loading",
      "Unificados estilos full-width/height en todos los paneles superadmin",
      "Fix inglés en DataTab",
    ],
  },
  {
    version: "2.1.14",
    date: "2026-07-11",
    changes: [
      "Panel datos superadmin: export y eliminación individual, masiva y completa",
    ],
  },
  {
    version: "2.1.13",
    date: "2026-07-11",
    changes: [
      "i18n: 50+ claves nuevas en 84 idiomas, cadenas hardcodeadas eliminadas",
      "Carrusel automático 1.5s, descripciones editables en galería, contador",
    ],
  },
  {
    version: "2.1.12",
    date: "2026-07-11",
    changes: [
      "Imágenes de galería se adaptan al contenedor sin recorte fijo",
    ],
  },
  {
    version: "2.1.11",
    date: "2026-07-11",
    changes: [
      "Carga galería existente al abrir /admin, límite 10 imágenes",
    ],
  },
  {
    version: "2.1.10",
    date: "2026-07-11",
    changes: [
      "Miniaturas de galería se actualizan en tiempo real en /admin al subir",
    ],
  },
  {
    version: "2.1.9",
    date: "2026-07-11",
    changes: [
      "Fade elegante en galería al cambiar de imagen",
    ],
  },
  {
    version: "2.1.8",
    date: "2026-07-11",
    changes: [
      "Regla Firestore para subcolección gallery",
    ],
  },
  {
    version: "2.1.7",
    date: "2026-07-11",
    changes: [
      "Cifrado de imágenes: chunked base64 evita overflow",
    ],
  },
  {
    version: "2.1.6",
    date: "2026-07-11",
    changes: [
      "Toast con barra de progreso real en subida de imágenes",
      "Quitado spinner del icono de subida en toast de progreso",
    ],
  },
  {
    version: "2.1.5",
    date: "2026-07-10",
    changes: [
      "Extraído useStoryNavigation, documentado con JSDoc",
      "CSS duplicado e imports limpiados",
      "Tests: useStoryNavigation, crypto, tokens, storage",
      "Fix guard en event listeners",
    ],
  },
  {
    version: "2.1.4",
    date: "2026-07-10",
    changes: [
      "Fix: decrypt devuelve vacío en fallo en vez de ciphertext",
    ],
  },
  {
    version: "2.1.3",
    date: "2026-07-10",
    changes: [
      "Fix shadowing de t en ToastContext.map",
    ],
  },
  {
    version: "2.1.2",
    date: "2026-07-10",
    changes: [
      "Fix: footer convertido en navbar superior, legal unificado",
    ],
  },
  {
    version: "2.1.1",
    date: "2026-07-10",
    changes: [
      "Eliminados idioma y legal del landing, ya en footer",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-07-10",
    changes: [
      "Bump de versión menor",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-07-10",
    changes: [
      "Primera versión estable con versionado semántico",
    ],
  },
  {
    version: "< 2.0.0",
    date: "2026-06 — 2026-07",
    changes: [
      "Desarrollo inicial de la plataforma Wedingo",
      "React 19 + Vite + Tailwind CSS + Firebase",
      "Sistema de invitaciones con RSVP, galería, mapa, música",
      "Panel admin con edición en vivo y autoguardado",
      "67 temas visuales con previsualización",
      "84 idiomas con i18next",
      "Superadmin con dashboard, tokens y compliance GDPR",
      "Panel de accesibilidad con 8 opciones",
      "Reproductor de música con ecualizador",
      "Cifrado AES-256-GCM de imágenes y datos sensibles",
      "Sistema de sesiones con renovación automática",
      "Página de impresión /print",
      "Modales legales con políticas de privacidad",
      "Selector de idiomas agrupado por región",
      "Y mucho más...",
    ],
  },
];
