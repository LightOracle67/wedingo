export const CHANGELOG = [
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
