export const CHANGELOG = [
  {
    version: "2.4.3",
    date: "2026-07-17",
    changes: [
      "Bump (cacheo de chunks, sin cambios de código)",
    ],
  },
  {
    version: "2.4.2",
    date: "2026-07-17",
    changes: [
      "Añadido www.google.com a connect-src CSP (cleardot.gif)",
    ],
  },
  {
    version: "2.4.1",
    date: "2026-07-17",
    changes: [
      "Fix opacity 0 ocultaba todas las secciones (código legacy del refactor anterior)",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-17",
    changes: [
      "Navegación por scroll-snap CSS nativo, eliminado JS navigation",
      "Eliminados inline styles conflictivos y event listeners",
      "Secciones apiladas verticalmente con scroll natural",
    ],
  },
  {
    version: "2.3.10",
    date: "2026-07-17",
    changes: [
      "CSS classes + inline styles solo en transición",
    ],
  },
  {
    version: "2.3.9",
    date: "2026-07-17",
    changes: [
      "Navegación por CSS classes, no inline styles",
    ],
  },
  {
    version: "2.3.8",
    date: "2026-07-17",
    changes: [
      "preventDefault en wheel/touch/keyboard para evitar scroll nativo",
    ],
  },
  {
    version: "2.3.7",
    date: "2026-07-17",
    changes: [
      "Fix body background Safari: eliminar background-attachment fixed",
      "Fix isSavingRef trabado por auto-save (nunca se reseteaba a false)",
      "showRsvp condicional a config.firstName/secondName",
      "RsvpSection eager load en lugar de lazy (solución definitiva)",
      "Suspense wrapper para lazy sections restante",
    ],
  },
  {
    version: "2.3.6",
    date: "2026-07-17",
    changes: [
      "Suspense wrapper para lazy sections, fix navegación entre secciones",
    ],
  },
  {
    version: "2.3.5",
    date: "2026-07-17",
    changes: [
      "Fix isSavingRef trabado por auto-save (nunca se reseteaba a false)",
    ],
  },
  {
    version: "2.3.4",
    date: "2026-07-17",
    changes: [
      "RsvpSection eager load en lugar de lazy",
    ],
  },
  {
    version: "2.3.3",
    date: "2026-07-17",
    changes: [
      "showRsvp condicional a config existente, removido Suspense interno",
    ],
  },
  {
    version: "2.3.2",
    date: "2026-07-17",
    changes: [
      "Fix showRsvp siempre true para que RSVP se renderice siempre",
    ],
  },
  {
    version: "2.3.1",
    date: "2026-07-16",
    changes: [
      "Fix position relative en decoraciones rompía layout invitación",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-07-16",
    changes: [
      "Fondos body por tema con gradiente personalizado",
      "Decoraciones florales CSS animadas por tema",
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
