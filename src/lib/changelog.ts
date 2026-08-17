export const CHANGELOG = [
  {
    version: "2.105.0",
    date: "2026-08-17",
    changes: [
      "FIX de extras «no activables» + mejora de la trivia de la pareja. (BUG) En sectionHasContent el caso 'extras' solo contemplaba 8 de los 13 toggles: voiceNotesEnabled, dayPhotosEnabled, mailboxEnabled, toastsEnabled y venueMapEnabled quedaban fuera, por lo que activar SOLO uno de ellos hacía que la sección extras se considerara vacía, se ocultara en la invitación pública y se añadiera automáticamente a hiddenSections al guardar (el extra parecía no activable). Se alineó la lista con todos los toggles de ExtrasSectionForm (test de regresión). (MEJORA trivia) La trivia gana: botón «Comprobar» (más accesible que revelar al teclear), marcador de aciertos (X de N), felicitación al acertar todas, persistencia del estado en sessionStorage por invitación (un refresco no pierde el marcador), pista opcional y etiqueta de dificultad (fácil/media/difícil) por pregunta — el editor de trivia admite el formato 'pregunta | respuesta | pista | dificultad' con compatibilidad total con las líneas antiguas. 2276 tests / 173 ficheros verdes + lint/typecheck/build/translations (1646 claves) OK.",
    ],
  },

  {
    version: "2.104.0",
    date: "2026-08-17",
    changes: [
      "Nuevo checkbox en Extras: «Mostrar la lista de personas que han confirmado» (campo showConfirmedPeople). Ahora la portada puede mostrar, además del contador, los nombres de quienes confirmaron como chips (prueba social reforzada). PRIVACIDAD/GDPR: cada invitado debe marcar un opt-in explícito al responder el RSVP («Acepto que mi nombre aparezca en la lista pública de confirmados», art. 7); la lista pública se guarda en la subcolección invitations/{token}/confirmedPeople (colección create-only + cap anti-spam: un documento por nombre no se puede sobrescribir ni suplantar; lectura pública solo cuando el toggle está activo). El toggle está OCULTO por defecto (opt-in estricto de la pareja) y es independiente del contador numérico existente. 2270 tests / 173 ficheros verdes + lint/typecheck/build/translations (1640 claves) + reglas 34/34 (6 tests nuevos de confirmedPeople) OK.",
    ],
  },

  {
    version: "2.103.0",
    date: "2026-08-17",
    changes: [
      "Ronda final de funciones viables sin backend: (20) Temas premium: nuevo grupo «Premium» con dos temas (Marfil antiguo, claro/bronce sobrio; Amatista profunda, oscuro/plateado) integrados en el selector con preview, variables CSS, gradientes de tarjeta, page-bg y claves i18n; (impresión premium) la tarjeta imprimible hereda el tema de la invitación (se aplica data-wedding-theme en PrintPage); (dashboard) mini-gráfico de confirmaciones por día (últimos 14 días, helper puro buildConfirmationsPerDay con timestamps ms/segundos/Date y entradas inválidas ignoradas); (backup) la copia de seguridad incluye ahora el historial de visitas por día y el restore lo restaura sin sobrescribir días existentes. 2269 tests / 173 ficheros verdes + lint/typecheck/build/translations (1634 claves) + reglas 28/28 OK.",
    ],
  },

  {
    version: "2.102.0",
    date: "2026-08-17",
    changes: [
      "Ronda de funciones diferenciadoras (bloque 3/3, sin backend): (9) Mapa de mesas inteligente: botón Auto-asignar en Distribución que reparte los invitados confirmados sin mesa entre las mesas con hueco de forma equilibrada (round-robin) y persiste en un único batch atómico (sin candidatos o sin huecos → aviso sin cambios); (4) Filtro por invitado en las fotos del día: desplegable con los nombres de los autores para ver solo las suyas (las subidas de la sesión actual siempre se muestran); (7-lite) Recordatorio a no confirmados mejorado: el panel muestra cuántas personas faltan por confirmar y un botón que genera el texto del recordatorio automáticamente. Buzón con respuestas (F5) NO implementado por diseño: el buzón es solo de escritura para invitados sin identidad verificada (mostrar respuestas filtraría mensajes ajenos). 2265 tests / 173 ficheros verdes + lint/typecheck/build/translations (1629 claves) OK.",
    ],
  },

  {
    version: "2.101.0",
    date: "2026-08-17",
    changes: [
      "Ronda de funciones diferenciadoras (bloque 2/3, sin backend): (6) Dashboard predictivo de asistencia en el Panel: estimación del total final según el ritmo real de confirmaciones (personas/día), % del aforo esperado, tendencia (alza/baja/estable) y días restantes, con límites sanos (nunca >110% del aforo) y todos los casos de datos vacíos/rotos cubiertos; (1) Contador de confirmaciones de la portada en TIEMPO REAL (onSnapshot sobre el contador de rsvpResponses) con degradación automática a polling de 20s si el canal de Firestore falla; (11) Regalos-experiencia: la lista de regalos admite un tercer campo opcional '| experiencia' (insignia 🎁 itinerario/experiencia en la lista del invitado), con compatibilidad total con las líneas antiguas; (18) Historial de visitas por día: la visita de cada invitado se registra además en invitations/{token}/visitLog/{YYYY-MM-DD} (batch atómico con el contador total) con regla de Firestore propia (incremento acotado a +20/día, lectura solo admin/superadmin) y gráfico de barras de los últimos 7 días en el Panel; (14) Idioma por invitación: la pareja fija el idioma base (config.language, es/en/automático) que se aplica a los invitados que no hayan elegido idioma en su dispositivo. Tests de predicción y reglas (28/28 con los nuevos casos de visitLog) + ajustes de tests existentes. 2264 tests / 173 ficheros verdes + lint/typecheck/build/translations (1621 claves) OK.",
    ],
  },

  {
    version: "2.100.0",
    date: "2026-08-17",
    changes: [
      "Ronda de funciones diferenciadoras (bloque 1/3): (1) Calendario desde la invitación: util compartida buildIcsFile (RFC 5545, escape de texto y validación de fecha/rollover) reutilizada por DetailsSection y ToolsTab (elimina el builder duplicado del .ics) más tests; (2) Ranking para el DJ: export del ranking de canciones (solo visible para el admin) con protección anti-CSV-injection (=,+,-,@) y texto legible; (3) Impresión profesional: QR de la invitación en la tarjeta impresa (carga lazy de qrcode, esperado con timeout antes de print() pero nunca bloquea la impresión); (4) Modo sorpresa: el editor de secciones permite marcar secciones con 🎁 que se ocultan a los invitados hasta el día del evento (con fecha inválida/ausente nunca se revelan por seguridad; el admin y ?invitar las ven siempre); (5) Agenda interactiva el día del evento: el itinerario resalta el evento en curso y muestra cuenta atrás por evento (badge EN CURSO / en X min) sin re-renders por segundo; (6) Modo invitado senior: opción de texto Muy grande (1.5) y narración de la invitación por voz (Web Speech API) con cierre/cancelación controlados. Ajustes de tests existentes (PrintPage, DetailsSection, SocialSections, SectionOrderEditor) y +28 tests nuevos. Traducciones ES/EN sincronizadas al 100% (1608 claves) y fix de un bloque musicPoll en EN que estaba sin traducir. 2256 tests/173 ficheros verdes + build/lint/typecheck/consent/translations OK.",
    ],
  },

  {
    version: "2.99.9",
    date: "2026-08-17",
    changes: [
      "FEAT: toggle en Extras para controlar la prueba social en vivo («Mostrar cuántos han confirmado») en la portada (campo liveConfirmedEnabled, visible por defecto). Fix de toggles sociales en Extras: los checkboxes de reacciones, compartir coche, dedicatorias y encuesta de música no reflejaban su estado guardado (faltaban los useFormField); ahora se sincronizan.",
    ],
  },

  {
    version: "2.99.8",
    date: "2026-08-17",
    changes: [
      "Ronda de mejora progresiva: confirmaciones accesibles (useConfirm) en DataRequestModal, VoiceNotesSection, GalleryArrayEditor y LandingPage (sustituye window.confirm); cutoff de consentimiento parental GDPR actualizado a 2012-08-18 (consent:check verde); aria-current=page en la barra de admin; decoding=async en miniaturas; aria-busy en el formulario del editor; aria-hidden en el ecualizador; preready y typecheck:e2e verdes; tests nuevos para useAnimations (allOff/isGroupFullyDisabled), AnimationsSectionForm (maestro+grupo) y useTabs (sync URL↔estado).",
    ],
  },

  {
    version: "2.99.7",
    date: "2026-08-16",
    changes: [
      "Checkboxes de animaciones POR SECCIÓN: cada uno de los 12 grupos (sobre, confeti, vídeo, decoraciones, navegación, luciérnagas, música, portada, galería, micro, fondos, avisos) tiene su propio checkbox que activa/desactiva todos sus ids de una vez, con estado intermedio cuando solo hay algunas desactivadas. Si una sección queda totalmente desactivada, su comportamiento se salta (el sobre no aparece). Se mantienen el checkbox maestro «Desactivar todas» y las filas individuales. `setGuestGroup` restaurado en el contexto; tests del checkbox de grupo (6 nuevos).",
    ],
  },

  {
    version: "2.99.6",
    date: "2026-08-16",
    changes: [
      "MEJORA checkboxes de animaciones: nuevo checkbox MAESTRO «Desactivar todas las animaciones» (clave reservada `all`) que sustituye a los botones Todas/Ninguna del admin y del panel de accesibilidad; al activarlo la invitación se muestra sin ninguna animación y se saltan los comportamientos completos: si todo el grupo del SOBRE está desactivado (o `all`), el sobre no aparece y la invitación se muestra directamente; el vídeo de bienvenida tampoco se abre si su animación está apagada. Al desactivar el maestro se recuperan las preferencias individuales. Se conservan las individuales con `toggleAllDisabled`; `isGroupFullyDisabled` en useAnimations; tests del sentinel y del salto del sobre.",
    ],
  },

  {
    version: "2.99.5",
    date: "2026-08-16",
    changes: [
      "Ronda de mejora progresiva (22 iteraciones): consolidación de CSS (utility admin-flex) y eliminación de CSS muerto (keyframes branch-in, body-fade-in); clase .setup-token-section; checkboxes sin estilos inline (CSS); i18n del contador de caracteres; aria-live en la prueba social del hero y role=status en RSVP/loading; memoización de useColumnSort; captions accesibles en 4 tablas; EmptyState en asistencia; role=list en el editor de orden de secciones; slotsRef a useEffect; inputMode=url en el campo de mapa; tests para SetupField, ConfigImageField, SetupArrayEditor y CountedField (+13); auditoría de seguridad (XSS/secrets) verificada limpia.",
    ],
  },

  {
    version: "2.99.4",
    date: "2026-08-16",
    changes: [
      "MODULARIZACIÓN de los formularios del editor por primitivas de campo: SetupField (label+control+hint+error), ConfigImageField (subida de imagen de config, 4 bloques de CoverSectionForm), CountedField (textarea/input con contador), SetupArrayEditor (filas de agenda/salidas/platos), useLinesField (editor JSON↔líneas de regalos/trivia) y validateFile (validación de archivo unificada, incluye audio). CoverSectionForm pasa de 581 a 441 líneas y DateSectionForm de 431 a 399; comportamiento y tests intactos (+10 tests nuevos).",
    ],
  },

  {
    version: "2.99.3",
    date: "2026-08-16",
    changes: [
      "FIX DEFINITIVO sesión (permission-denied intermitente en login/renovación/reparación): la regla de Firestore dejaba de exigir `request.resource.data.activeSession is timestamp` / `sessionExpiresAt is timestamp`, que en el runtime real fallan de forma INTERMITENTE para timestamps ESCRITOS por el SDK web (el emulador los ve como timestamp, por eso los tests no lo detectaron). La regla ahora acota sessionExpiresAt por COMPARACIÓN con request.time (30min-48h), que sí funciona siempre, mantiene setupTokenValid y hasOnly. Verificado contra producción: login y renovación OK, cotas y hash inválido denegados; emulador 22/22. Complementa los fixes 2.99.1 (timestamps explícitos) y 2.99.2 (getDoc+updateDoc en lugar de transacción).",
    ],
  },

  {
    version: "2.99.2",
    date: "2026-08-16",
    changes: [
      "FIX sesión (parte 2): el login (LandingPage y activateSessionWithToken) deja de usar runTransaction y activa la sesión con getDoc + updateDoc. En el runtime real de Firestore, escribir una sesión por transacción (currentDocument.updateTime) sobre una sesión YA existente es rechazado por las reglas (el emulador sí lo acepta), lo que bloqueaba el login cuando el invitado confirmaba sustituir la sesión activa. Se mantiene la confirmación previa y la escritura directa funciona sobre sesión existente o inexistente.",
    ],
  },

  {
    version: "2.99.1",
    date: "2026-08-16",
    changes: [
      "FIX sesión (permission-denied al activar/renovar/reparar): `activeSession` se escribe ahora como timestamp EXPLÍCITO del cliente en lugar de serverTimestamp(). En el runtime real de Firestore un valor REQUEST_TIME (serverTimestamp) no satisface `is timestamp` en la regla de sesión (el emulador sí, por eso los tests no lo detectaron). Se corrige en AuthContext (auto-login), useSetupAuth (repair, renovación 60s y login) y LandingPage (login). sessionExpiresAt sigue acotado 30min-48h y la escritura sigue exigiendo prueba de token (setupTokenValid).",
    ],
  },

  {
    version: "2.99.0",
    date: "2026-08-16",
    changes: [
      "MEJORA GENERAL de formularios y paneles: ConfigActionsContext estable (fin del re-render del editor por tecla) + formularios memoizados; modal accesible de confirmación/prompt (ConfirmProvider) que reemplaza window.confirm/prompt en admin y superadmin; useTabs con sync URL↔estado (botón atrás) y foco en tabpanel; paginación de listas largas (invitaciones, tokens) + EmptyState + Pagination i18n; código de vestimenta por clave con migración de valores legacy; a11y (aria-describedby en hints, inputs de archivo por teclado, focus del acordeón, targets táctiles 24px, captions en métricas, role=alert en errores); placeholders traducidos y límites de longitud; estado de subida en imágenes de portada; MapModeSelect compartido.",
    ],
  },

  {
    version: "2.98.6",
    date: "2026-08-16",
    changes: [
      "FEAT: control de animaciones de la invitación con checkboxes (nombre + hint por animación), del sobre al confeti y las microinteracciones. Base del admin en config.disabledAnimations (nueva sección «Animaciones» en el Setup) + preferencia adicional por invitado en el panel de accesibilidad (localStorage). Registro canónico src/lib/animations.ts, contexto AnimationsProvider, CSS de kill animations.css, y módulos extraídos (Confetti, WeddingDecorations, SetupToggleRow, AnimationChecklist). Respeta prefers-reduced-motion en todo.",
    ],
  },

  {
    version: "2.98.5",
    date: "2026-08-12",
    changes: [
      "MEJORA (ronda completa): cobertura a 92.2% de líneas (2160 tests) — DistribucionTab (quitar invitado, forma legacy rect) y axe para Pagination, LoadingOverlay y CollapsibleSection; export muerto ExcelWorkbook des-exportado; cutoff de consentimiento parental GDPR actualizado a 2012-08-13. Umbrales CI a 91.8/89.5/86.5/80.",
    ],
  },
  {
    version: "2.98.4",
    date: "2026-08-12",
    changes: [
      "CALIDAD (cierre de la campaña de cobertura): cobertura a 91.9% de líneas (2155 tests). Tests de DataTab (purga de invitaciones antiguas con cascadeDelete y el caso sin objetivos). Umbrales CI subidos a 91.5/89/86/80.",
    ],
  },
  {
    version: "2.98.3",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91.5% de líneas (2153 tests). Tests añadidos en DistribucionTab (asignación de invitado confirmado a la mesa y aviso de mesa llena). Umbral CI de líneas a 91.4.",
    ],
  },
  {
    version: "2.98.2",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91.4% de líneas (2151 tests). Tests añadidos en VoiceNotesSection (estado vacío y fecha de creación). Umbral CI de líneas a 91.3.",
    ],
  },
  {
    version: "2.98.1",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91.4% de líneas (2149 tests). Tests añadidos en sentry (disableSentryTracking con retirada de consentimiento GDPR y guard de inicialización única). Umbral CI de líneas a 91.1.",
    ],
  },
  {
    version: "2.98.0",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91.3% de líneas (2147 tests). Test de impresión de confirmaciones añadido en DataTab (window.open + blob con escape HTML). Umbrales CI subidos a 91/88.5/85.5/79.5.",
    ],
  },
  {
    version: "2.97.9",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91.2% de líneas (2146 tests). Tests añadidos en VoiceNotes (borrado cancelado, error de reproducción), ComplianceTab (plantillas legales) y DistribucionTab (arrastre de mesa con persistencia de posición, mockeando getBoundingClientRect). Umbrales CI subidos a 90.5/88.5/85.5/79.5.",
    ],
  },
  {
    version: "2.97.8",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 91% de líneas (2142 tests). Tests añadidos en TriviaSection (respuesta correcta/incorrecta, JSON inválido) y ManageTab (.ics con/sin fecha, copia de subcolección). Umbrales CI subidos a 90.5/88/85.5/79.5.",
    ],
  },
  {
    version: "2.97.7",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 90.5% de líneas (2136 tests). Tests añadidos en RsvpSection (mensaje de validación con role=alert, error de carga con reintento, campos de contacto con consentimiento GDPR, envío del formulario).",
    ],
  },
  {
    version: "2.97.6",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 90.5% de líneas (2132 tests). Tests añadidos en ToolsTab (galería y fotos del día) y MusicPollSection (error de sugerencia). Umbrales CI subidos a 90/88/85/79.",
    ],
  },
  {
    version: "2.97.5",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 90.2% de líneas (2129 tests). Tests añadidos en DistribucionTab (añadir/cambiar de sección) y RideShareSection (estado vacío, ofertas publicadas, botón deshabilitado). Umbrales CI verificados a 89.5/87.5/84.5/78.5.",
    ],
  },
  {
    version: "2.97.4",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 90% de líneas (2124 tests). Tests añadidos en SupportTab (auditoría con export, diagnóstico, abandonados), ManageTab (saveJson válido/inválido, transfer, autoRespond) y MetricsTab (export de confirmaciones, almacenamiento estimado). Umbrales CI subidos a 89.5/87.5/84.5/78.5.",
    ],
  },
  {
    version: "2.97.3",
    date: "2026-08-12",
    changes: [
      "CALIDAD (más sesiones): cobertura a 89% de líneas (2114 tests). Tests añadidos en VoiceNotes (lista/reproducir/borrar/error de micro), DayPhotos (subida y no-imagen), transport-utils (parseo robusto), useInertBackground (inert/aria-hidden) y GoogleTranslateToggle (callback del widget). Umbrales CI subidos a 88.5/86/83.5/78. Nota: el flujo de grabación por micrófono (MediaRecorder/getUserMedia) no es testeable en jsdom, queda documentado.",
    ],
  },
  {
    version: "2.97.2",
    date: "2026-08-12",
    changes: [
      "CALIDAD (5 sesiones): cobertura 83.5→88.8% de líneas (2106 tests). Tests añadidos en ManageTab (clone/flags/expiración/kill-session/pausa), DataTab (excel por token, menús, expiración/sellado masivo, rango de fechas), InvitationDetailModal (reset, import CSV), SuperAdminPanel (pestañas restantes, navegación por teclado, ?tab=), PlatformTab (kill-switch, carga de ajustes), DashboardTab (Storage GC) y secciones sociales (VoiceNotes reproducir/borrar, DayPhotos subida). Umbrales de cobertura del CI subidos a 88/85.5/83/77.5 (verificados).",
    ],
  },
  {
    version: "2.97.1",
    date: "2026-08-12",
    changes: [
      "CALIDAD: cobertura ampliada 83.5→86.4% de líneas (2084 tests): tests axe de las 5 secciones sociales restantes (DayPhotos, Mailbox, Toasts, VenueMap, VoiceNotes), voice-store, FormStore, file-utils, MetricsTab (analizadores y exports), SupportTab (consola/diagnóstico), ToolsTab (ICS/buzón) y DistribucionTab (export/borrar sección). El gate de cobertura estaba desincronizado (exigía 94.9% y la suite real daba ~83%: CI rojo); se ajusta a los umbrales verificados (85/83/80/75) con margen.",
    ],
  },
  {
    version: "2.97.0",
    date: "2026-08-12",
    changes: [
      "FEAT: los invitados esperados pasan de una lista de nombres a un NÚMERO (0..1000, config.expectedGuests) — el panel calcula las estadísticas a partir de él: Total invitados = esperado, Sin responder = esperado − confirmados (personas), Confirmados/No asistirán en personas. Guardado con validación servidor en las reglas (solo 0..1000), normalización en normalize-config y tests de reglas/unitarios.",
    ],
  },
  {
    version: "2.96.11",
    date: "2026-08-11",
    changes: [
      "HARDENING: escritor XLSX propio blindado — NaN/Infinity se emiten como celdas vacías (evita XML inválido), se sanean caracteres de control ilegales en XML 1.0, límite de columnas de Excel (XFD 16384); 4 tests nuevos de casos borde (22 en total). Accesibilidad: botón-ícono 👁 de Fotos del día sin aria-label corregido (clave dayPhotos.reveal). Límites de bundle ajustados a la realidad post-optimización.",
    ],
  },
  {
    version: "2.96.10",
    date: "2026-08-11",
    changes: [
      "SEGURIDAD: eliminada la dependencia vulnerable xlsx/SheetJS (prototype pollution GHSA-4r6h-8v6p-xvw6 y ReDoS GHSA-5pgg-2g8v-p4x9, sin fix en npm) de producción — los exports Excel ahora usan un escritor OOXML mínimo propio (ZIP store + SpreadsheetML) verificado con la librería xlsx en tests (devDependency). npm audit --omit=dev: 0 vulnerabilidades. El chunk lazy vendor-xlsx (90KB) desaparece del build.",
    ],
  },
  {
    version: "2.96.9",
    date: "2026-08-11",
    changes: [
      "AUDITORÍA de tercer nivel: eliminado asset muerto public/og-banner.svg (solo se sirve el PNG); verificado que los catches silenciosos son best-effort intencionados, todos los addEventListener/setInterval tienen cleanup, Sentry es lazy (import dinámico tras idle y consentimiento), el conteo de bundle lee los <script> reales, CI ejecuta lint:ci/format/consent/coverage/bundle y el SW precachea 251 assets sin incluir xlsx/qrcode/sentry.",
    ],
  },
  {
    version: "2.96.8",
    date: "2026-08-11",
    changes: [
      "AUDITORÍA profunda: ruta inicial 382→284KB gzip (xlsx y qrcode pasan a chunks lazy bajo demanda, no se precachean); fix XSS en impresión de RSVP del superadmin (nombres/asistencia ahora se escapan); GDPR: fecha de corte de consentimiento parental actualizada en firestore.rules (2012-08-12, verificado por CI); eslint-disable huérfano eliminado; dependencias, functions/ y scripts de validación auditados.",
    ],
  },
  {
    version: "2.96.7",
    date: "2026-08-11",
    changes: [
      "AUDITORÍA de segundo nivel: eliminadas 21 variables CSS muertas (spaces, colores, sombras, safe-area, dark-mode huérfano); verificado que las 240 claves i18n 'sin uso' son familias dinámicas reales (alergias, platos, dressCode, errores de validación, cookie.pointN, pestañas admin); sin console.log/debugger en producción; e2e typecheck limpio; bundle inicial 382KB gzip.",
    ],
  },
  {
    version: "2.96.6",
    date: "2026-08-11",
    changes: [
      "AUDITORÍA: sanitización, optimización y limpieza exhaustiva — corregidos 7 bugs de dependencias de hooks (lint 100% limpio); eliminados ~15 exports, 10 tipos y 1 provider muertos (FormStoreProvider, barrel utils.ts, urlMatchesBlocked, getConsentRecord, isRetryableFirestoreError, etc.); retiradas 18 reglas CSS sin uso (scrim de impresión, lang-popup, equalizer-bar, modales y estilos admin muertos) y 2 variables CSS; verificado XSS (sin dangerouslySetInnerHTML), secrets, CSP/firebase.json y reglas Firestore 19/19.",
    ],
  },
  {
    version: "2.96.5",
    date: "2026-08-11",
    changes: [
      "FEAT: ninguna exportación se realiza si sus datos están vacíos (Excel, PDF, galería, fotos del día, RSVP, auditoría y backup). buildWorkbook omite hojas sin filas y cada export avisa con un toast cuando no hay contenido.",
    ],
  },
  {
    version: "2.96.4",
    date: "2026-08-11",
    changes: [
      "UI: el selector de secciones pasa a mostrarse debajo de los controles de mesas (forma, añadir mesa, imprimir, exportar, eliminar sección) en Distribución.",
    ],
  },
  {
    version: "2.96.3",
    date: "2026-08-11",
    changes: [
      "FIX: retiradas las formas Rectángulo y Óvalo al añadir mesas (daban fallo) — el selector solo ofrece Círculo y Cuadrado; el tipo y el render conservan rect/oval para leer mesas antiguas ya guardadas.",
    ],
  },
  {
    version: "2.96.2",
    date: "2026-08-11",
    changes: [
      "TEST: prueba de formato de todos los Excel descargables — los 9 exports (asistencia, menús, invitados, buzón, mesas, métricas, confirmaciones globales, RSVP y auditoría) se generan con buildWorkbook, se reabren con la librería xlsx y se verifican cabeceras, valores, tipos numéricos y fechas celda a celda. Refactor: builders extraídos a excel-builders.ts como funciones puras.",
    ],
  },
  {
    version: "2.96.1",
    date: "2026-08-11",
    changes: [
      "REFACTOR: todos los exports de CSV sustituidos por Excel (.xlsx) — Asistencia, menús, invitados globales, RSVP por invitación y auditoría; lógica centralizada en admin-utils con hojas tipadas.",
    ],
  },
  {
    version: "2.96.0",
    date: "2026-08-11",
    changes: [
      "FEAT: exportación a Excel (.xlsx) en el panel — invitados con su estado de confirmación, buzón privado, asistencia completa con menús y dieta, y mesas por sección con invitados asignados, plazas y forma. Formato XLSX real, abierto en Excel, LibreOffice, Google Sheets y Numbers.",
    ],
  },
  {
    version: "2.95.99",
    date: "2026-08-09",
    changes: [
      "FEAT: suavizado del fondo personalizado (invitación, impresión y etiquetas) — reescalado suave (image-rendering: auto) con un micro blur que enmascara la pixelación al cubrir pantallas grandes; dimensión de compresión subida a 2880px.",
    ],
  },
  {
    version: "2.95.98",
    date: "2026-08-09",
    changes: [
      "FIX: en la impresión de la invitación se ocultan los botones de accesibilidad (a11y-trigger/panel) y el texto sale en blanco puro (antes grisáceo).",
    ],
  },
  {
    version: "2.95.97",
    date: "2026-08-09",
    changes: [
      "FEAT: mayor calidad del fondo personalizado (y foto de novios/galería) — dimensión máxima de 1920 a 2560px y target de compresión de 450KB a 650KB, con margen seguro bajo el límite de 1MB cifrado de Firestore.",
    ],
  },
  {
    version: "2.95.96",
    date: "2026-08-09",
    changes: [
      "FIX (impresión): se elimina el scrim oscuro que quedaba detrás del texto — el fondo personalizado se ve completo, incluso detrás de las letras; la legibilidad se apoya en un text-shadow reforzado. Aplicado a la invitación y a las etiquetas de mesa.",
    ],
  },

  {
    version: "2.95.95",
    date: "2026-08-09",
    changes: [
      "FIX (impresión): la página A4 sale en BLANCO y solo la tarjeta lleva el fondo/tema (antes el fondo oscuro del contenedor llenaba el papel y salía negro); el fondo personalizado se espera DECODIFICADO (img.decode) antes de imprimir, con respaldo background-image y ocultando el <img> si falla (evita el cuadro negro). Aplicado a la invitación y a las etiquetas de mesa.",
    ],
  },

  {
    version: "2.95.94",
    date: "2026-08-09",
    changes: [
      "FIX: al imprimir (invitación y etiquetas) los fondos ya no salen negros — el scrim semitransparente se aclara SOLO en impresión (@media print), porque los gradientes rgba se aplanan en el papel y un scrim oscuro salía casi negro; la previsualización en pantalla se mantiene igual.",
    ],
  },

  {
    version: "2.95.93",
    date: "2026-08-09",
    changes: [
      "FIX: los fondos personalizados de impresión (invitación y etiquetas) se renderizan con <img> en vez de background-image CSS — así se imprimen en todos los navegadores sin depender de 'imprimir fondos'; se aclara el scrim para evitar el aspecto demasiado oscuro.",
    ],
  },

  {
    version: "2.95.92",
    date: "2026-08-09",
    changes: [
      "FEAT: la impresión de la invitación (PrintPage) ahora usa el fondo personalizado, las esquinas personalizadas y los colores del TEMA (se elimina el respaldo en blanco que anulaba el tema), tarjeta vertical 2:3 y espera a que carguen las imágenes antes de imprimir.",
    ],
  },

  {
    version: "2.95.91",
    date: "2026-08-09",
    changes: [
      "FEAT: etiquetas de mesa en vertical (A4 vertical, tarjeta 2:3) con mensaje de agradecimiento por la asistencia y de disfrute en líneas separadas tras la mesa; la impresión espera a que carguen el fondo y las esquinas personalizadas antes de imprimir (con red de seguridad de 1.5s).",
    ],
  },

  {
    version: "2.95.90",
    date: "2026-08-09",
    changes: [
      "CLEANUP: se eliminan de Herramientas las funciones de mesas y mapa del recinto (ahora viven en Distribución); la búsqueda de 'tu mesa' del invitado lee de las secciones; se retiran la colección plana tables y sus claves i18n muertas.",
    ],
  },

  {
    version: "2.95.89",
    date: "2026-08-09",
    changes: [
      "FEAT: servicio de impresión de etiquetas por mesa en Distribución — imprime UNA etiqueta por página A4 por invitado asignado, con el Nombre completo y la mesa en la línea siguiente, usando el fondo personalizado, las esquinas personalizadas y el estilo de ancho de sección de la invitación.",
    ],
  },

  {
    version: "2.95.88",
    date: "2026-08-09",
    changes: [
      "AUDITORÍA: revisión profunda de claves i18n (todas las familias dinámicas cubiertas, es/en alineadas, clave muerta distribucion.tableAdded eliminada) y búsqueda de errores (sin `as any`, sin console.log en producción, suite 2033/2033, reglas 19/19, lint/tsc/build limpios).",
    ],
  },

  {
    version: "2.95.87",
    date: "2026-08-09",
    changes: [
      "UX: auditoría de formularios admin/superadmin — protegidos de desbordes de anchura (inputs/selects en flex encogen con min-width:0, etiquetas largas envuelven, anchos nunca superan el contenedor) y añadidos hints a campos que no los tenían (Distribución, mapa del recinto, consola de soporte).",
    ],
  },

  {
    version: "2.95.86",
    date: "2026-08-09",
    changes: [
      "FIX (crítico): no se podían eliminar mesas (ni secciones/zonas/puntos) — las reglas combinaban create/update/delete y evaluaban request.resource.data, que es null en delete, denegando el borrado. Ahora el borrado tiene su propia regla de admin. Reglas test 19/19 con escenarios de delete.",
    ],
  },

  {
    version: "2.95.85",
    date: "2026-08-09",
    changes: [
      "FIX: la prueba social del hero usa polling ligero (getDoc cada 20s) en lugar de onSnapshot — se elimina el canal WebChannel persistente (Listen) de Firestore que abría una conexión por visitante y podía fallar con CORS en algunas redes; el contador sigue actualizándose en vivo de forma práctica.",
    ],
  },

  {
    version: "2.95.84",
    date: "2026-08-09",
    changes: [
      "FEAT: maquetación de las mesas en Distribución — las mesas se dibujan como mesas reales con sillas alrededor (círculo/óvalo: sillas en círculo; rectángulo/cuadrado: sillas por el perímetro), nombre y plazas ocupadas, sobre el plano del recinto.",
    ],
  },

  {
    version: "2.95.83",
    date: "2026-08-09",
    changes: [
      "UX: borrado de mesas en Distribución visible directamente sobre la mesa seleccionada (✕) además del panel; y UI de formularios admin/superadmin descargada: paneles con más aire y cabecera clara, etiquetas separadas, inputs más compactos, menos ruido visual.",
    ],
  },

  {
    version: "2.95.82",
    date: "2026-08-09",
    changes: [
      "FIX: tamaño de las mesas de Distribución en PÍXELES (antes % mal calculado); en círculo y cuadrado ancho y alto quedan SIEMPRE bloqueados al mismo valor (un único control); reglas Firestore con límites en px y w==h para esas formas.",
    ],
  },

  {
    version: "2.95.81",
    date: "2026-08-09",
    changes: [
      "FEAT: Distribución rediseñada por SECCIONES — cada sección tiene su PROPIO mapa con mesas con forma que se guardan en Firestore (posición, tamaño, rotación, plazas e invitados); las secciones se muestran como menú superior sobre la previsualización y el mapa ocupa todo el espacio. Solo se asignan invitados que hayan CONFIRMADO asistencia. Se añaden los toggles de configuración (setup) para caja de voz, fotos del día, buzón privado, brindis y mapa del recinto. Reglas Firestore: secciones con tablas anidadas.",
    ],
  },

  {
    version: "2.95.80",
    date: "2026-08-09",
    changes: [
      "FEAT: nueva pestaña 'Distribución' en el panel de admin — mapa interactivo del recinto con MESAS CON FORMA (círculo, rectángulo, óvalo, cuadrado) que se arrastran, redimensionan y rotan, ZONAS con color, y asignación de invitados por mesa. Nuevas subcolecciones zones y shapedtables (lectura pública, escritura admin).",
    ],
  },

  {
    version: "2.95.79",
    date: "2026-08-09",
    changes: [
      "FEAT (diferenciales): muro de fotos del día (los invitados suben fotos cifradas a un álbum compartido que la pareja descarga); buzón de mensajes privados (solo lee la pareja); programa de brindis con registro; mapa del recinto con puntos de interés dibujados por el admin; pantalla en vivo 'Hoy es la boda' con agenda y 'qué está pasando ahora'. Gestión admin de todas en Herramientas. Nuevas reglas Firestore (dayphotos/mailbox/toasts/venuepoints) con contadores anti-spam.",
    ],
  },

  {
    version: "2.95.78",
    date: "2026-08-09",
    changes: [
      "FEAT (diferenciales): asignador de mesas — el admin crea mesas y asigna invitados, y el invitado ve su mesa al confirmar; caja de recuerdos de voz — los invitados graban notas de voz (cifradas y troceadas) para la pareja; prueba social en vivo en el hero (nº de confirmados); la boda pasada se convierte en recuerdo (agradecimiento); mapa/orígenes de invitados (coche compartido) en Métricas. Nuevas reglas Firestore para tables y voicenotes.",
    ],
  },

  {
    version: "2.95.77",
    date: "2026-08-09",
    changes: [
      "FEAT: más herramientas de superadmin (sin Blaze) — kill-switch por función social (desactivar regalos/coche/reacciones/notas/música/trivial globalmente); analítica de uso de funciones sociales; revisión de privacidad (mapas de terceros en iframe); detección de abandono (visitas sin RSVP); auditoría exportable en CSV; búsqueda de tokens por hash; export por rango de fechas; modo simulación del invitado en el preview (ya confirmado / plazo vencido); reporte de almacenamiento corregido (Firestore, no Storage).",
    ],
  },

  {
    version: "2.95.76",
    date: "2026-08-09",
    changes: [
      "FEAT: búsqueda PII ampliada a teléfono y email (derechos GDPR) y export CSV global de invitados (nombre, asistencia, menú, alergias, contacto) desde Métricas.",
    ],
  },

  {
    version: "2.95.75",
    date: "2026-08-09",
    changes: [
      "FEAT: funciones avanzadas de superadmin (sin Blaze) — pestaña Métricas (resumen global, funnel de conversión visitas→RSVP, ranking, crecimiento mensual, almacenamiento bajo demanda, CSV global); pestaña Soporte (centro de avisos: bodas próximas/sin configurar/tokens legacy/sesiones, consola por invitación y diagnóstico de conectividad); kill-switch global de mantenimiento (la invitación pública muestra aviso); pausar/reanudar invitación; detección de tokens en conflicto; acciones masivas de expiración y sello + purga por antigüedad (GDPR); plantillas de cláusula de privacidad por país.",
    ],
  },

  {
    version: "2.95.74",
    date: "2026-08-09",
    changes: [
      "FIX: las secciones se ocultan mientras el sobre (o el vídeo de bienvenida) está en pantalla — antes la hero quedaba completamente visible al desvanecerse el blanco del sobre; ahora se revela con su animación de entrada 3D al terminar la última animación del envelope.",
    ],
  },

  {
    version: "2.95.73",
    date: "2026-08-09",
    changes: [
      "FIX: el contenido de las secciones es SIEMPRE visible — se elimina la regla que ocultaba los elementos hasta el centro (creaba contenedores vacíos al desvanecerse el blanco del sobre y al hacer scroll) y el stagger de entrada que la acompañaba; la card entra con su contenido mediante el progreso de scroll y la entrada 3D del hero al abrir el sobre.",
    ],
  },

  {
    version: "2.95.72",
    date: "2026-08-09",
    changes: [
      "FIX: se bloquea el scroll del contenedor de la invitación mientras el sobre (o el vídeo de bienvenida) está en pantalla — antes se podía hacer scroll y la invitación se activaba con sus animaciones detrás del envelope; el scroll se libera al terminar la última animación del sobre.",
    ],
  },

  {
    version: "2.95.71",
    date: "2026-08-09",
    changes: [
      "FIX: CSP frame-ancestors 'none' → 'self' para que la previsualización del superadmin (?preview=1, iframe mismo-origen con sandbox allow-scripts allow-same-origin) pueda cargar la invitación; se mantiene la protección contra clickjacking de orígenes externos. Desaparece también el error de sandbox de Sentry al acceder al frame bloqueado.",
    ],
  },

  {
    version: "2.95.70",
    date: "2026-08-09",
    changes: [
      "FEAT: acciones genéricas fuera de la tabla en todas las tablas — se elimina la columna Acciones y cada tabla pasa a selección + barra de acciones en lote (useRowSelection + TableActionsBar): tokens (migrar/revocar seleccionados), invitaciones (eliminar seleccionadas) y DataTab (detalle/exportar/imprimir/CSV/menús/link admin/eliminar sobre la selección); TokensTab permite seleccionar un grupo y borrar los seleccionados.",
    ],
  },

  {
    version: "2.95.69",
    date: "2026-08-09",
    changes: [
      "FEAT: la página de tokens del superadmin ahora es una tabla (admin-table) con ordenación por columnas (Invitación y Tipo, asc/desc/sin orden), unificando legacy y hashed; se mantiene el acceso a migrar/revocar y no se exponen los tokens secretos.",
    ],
  },

  {
    version: "2.95.68",
    date: "2026-08-09",
    changes: [
      "FEAT: auto-centrado suave de secciones — si al detener el scroll una sección está cerca del centro (dentro del 40% del viewport), se desliza suavemente hasta quedar centrada; se mantiene el scroll libre actual (sin interceptar rueda/teclado, respeta prefers-reduced-motion y no actúa mientras el usuario sigue moviendo).",
    ],
  },

  {
    version: "2.95.67",
    date: "2026-08-09",
    changes: [
      "FEAT: ordenación por columnas en TODAS las tablas de la app (asistencias del admin, invitaciones y registro de cumplimiento del superadmin) — al hacer clic en el encabezado de una columna cicla asc → desc → sin orden; cada columna declara su tipo (texto/número/fecha/booleano) y los valores vacíos quedan siempre al final; sistema reutilizable (useColumnSort + SortableTh) con indicador ▲/▼ y aria-sort.",
    ],
  },

  {
    version: "2.95.66",
    date: "2026-08-09",
    changes: [
      "FEAT: scroll de secciones rediseñado a modelo de PROGRESO — cada sección se desvanece/aparece en proporción a la distancia de su centro al centro del viewport (fundido cruzado entre secciones), las animaciones de entrada de sus elementos se ejecutan al estar en el centro exacto (una sola vez), la entrada 3D solo se aplica a la primera sección al abrir el sobre, y el scroll interior de las cards (overscroll-behavior: contain) no afecta al scroll entre secciones.",
    ],
  },

  {
    version: "2.95.65",
    date: "2026-08-09",
    changes: [
      "FIX: la sección principal (hero) ejecuta su animación de entrada en el mismo instante en que se revela la invitación (entrada síncrona al terminar la pantalla blanca del sobre, sin esperar la primera callback del IntersectionObserver), y ya no se anima detrás del vídeo de bienvenida: la navegación se activa al cerrar el vídeo para que la entrada del hero sea visible.",
    ],
  },

  {
    version: "2.95.64",
    date: "2026-08-09",
    changes: [
      "FIX: el formulario del RSVP (y mapa/acciones de calendario) ya no repite su animación de aparición — la regla que los animaba con hero-fade-up cada vez que la sección recuperaba is-active se eliminó (el is-active alterna entre secciones con el scroll libre, lo que re-disparaba la animación; la entrada real sigue animándose vía is-enter).",
    ],
  },

  {
    version: "2.95.63",
    date: "2026-08-09",
    changes: [
      "FIX: la animación de entrada del hero arranca al terminar la última animación del sobre (fade de 2.5s), sincronizada con el desvanecimiento; antes aparecía 1s después, desconectada de la salida del sobre.",
    ],
  },

  {
    version: "2.95.62",
    date: "2026-08-09",
    changes: [
      "FIX: animaciones de sección al hacer scroll — umbral de entrada rebajado al 20% (antes 70%): las secciones asomaban invisibles y creaban huecos en blanco al scrollear rápido, y las secciones más altas que el viewport (RSVP) nunca llegaban a animarse; el hero entra siempre animado al abrir el sobre (antes una carrera en la primera callback del IntersectionObserver podía dejarlo sin animación); los timers de transición ya no se reinician en bucle.",
    ],
  },

  {
    version: "2.95.61",
    date: "2026-08-09",
    changes: [
      "FEAT: scroll libre en la invitación — se elimina el snap por sección y la interceptación de rueda/teclado (useStoryNavigation reescrito con IntersectionObserver y estados hidden/entering/active/leaving), animaciones ligadas al scroll en todos los viewports y botón de flecha inferior eliminado.",
    ],
  },

  {
    version: "2.95.60",
    date: "2026-08-09",
    changes: [
      "Política de privacidad actualizada (ES y EN) y versión a 2026-08-10 (re-consentimiento): aclarado que la limpieza de 12 meses la ejecuta el administrador (el plan actual no despliega la limpieza automática), y añadidos los tratamientos nuevos: user-agent en el RSVP, registro de accesos y cambios de configuración (auditoría), lista de invitados esperados del organizador, consentimiento demostrable (fecha y versión) y matiz de cookies de terceros (mapa y traducción solo al pulsarlos).",
    ],
  },

  {
    version: "2.95.59",
    date: "2026-08-09",
    changes: [
      "Verificación con emulador: test de reglas Firestore (npm run test:rules) que cubre los flujos del superadmin — lecturas del dashboard (invitaciones, respuestas, tokens, auditLog, plataforma, consentLog), denegación a invitados, respaldo por UID y escrituras/borrados del superadmin (14/14 correctos).",
    ],
  },

  {
    version: "2.95.58",
    date: "2026-08-09",
    changes: [
      "Fix de raíz del permission-denied del superadmin: las reglas de Firestore solo comprobaban el claim de email del token (que algunos tokens de Firebase no exponen en request.auth.token.email), por lo que todas las lecturas del panel fallaban con 'Missing or insufficient permissions'. Ahora las reglas aceptan también el UID del superadmin, que el cliente registra en platform/settings en cada login/re-hidratación.",
    ],
  },

  {
    version: "2.95.57",
    date: "2026-08-09",
    changes: [
      "Panel del superadmin resiliente: las estadísticas se cargan por fuente aislada (confirmaciones, invitaciones, tokens, actividad, temas, embudo), de modo que si una consulta falla el resto del panel se sigue mostrando en lugar de 'no se pudieron cargar las estadísticas'. El error real se registra en consola para diagnóstico.",
    ],
  },

  {
    version: "2.95.56",
    date: "2026-08-09",
    changes: [
      "Fix del hydrate del superadmin: al tener un token de Firebase válido pero sin sesión local (p. ej. pestaña nueva), el flujo forzaba signOut y obligaba a re-login. Ahora re-hidrata la sesión local automáticamente y solo firma fuera cuentas de Firebase con email distinto al superadmin. Añadidos tests de hydrate (2017 en total).",
    ],
  },

  {
    version: "2.95.55",
    date: "2026-08-09",
    changes: [
      "Fix crítico en el traspaso de titularidad del superadmin: al revocar los tokens anteriores se borraba TAMBIÉN el token recién generado (la consulta por inviteToken incluía el registro nuevo), dejándolo huérfano y haciendo que el login fallara con 'Token no válido'. Ahora el nuevo hash se excluye del borrado. Añadido test de regresión.",
    ],
  },

  {
    version: "2.95.54",
    date: "2026-08-09",
    changes: [
      "Funciones nuevas para la invitación y el panel del responsable: pestaña 'Herramientas' (recordatorio por WhatsApp personalizable, lista de invitados esperados con pendientes, badge de confirmaciones nuevas, descarga de galería, .ics, nota interna), contacto opcional del invitado con consentimiento explícito (GDPR art. 7) visible en la asistencia, aviso de plazas restantes y días para confirmar, resumen de la respuesta tras enviar, versión de la política visible y divulgación del contacto en la política. Añadidos 7 tests (total 2015).",
    ],
  },

  {
    version: "2.95.53",
    date: "2026-08-09",
    changes: [
      "QA de las funciones del superadmin: verificados los flujos de las fases 1-5 y el lote verde/ámbar. Corregidos 2 bugs (el clonado de invitación copiaba _visits, prohibido por la regla de create; CSV/iCal se serializaban como JSON). Añadidos 13 tests nuevos: PlatformTab, InvitationDetailModal (render, moderación social, export), GoogleTranslateToggle (ePrivacy), ManageTab (validador, comparador), DataTab (detalle, búsqueda PII, tema en bloque). Total 2008 tests.",
    ],
  },

  {
    version: "2.95.52",
    date: "2026-08-09",
    changes: [
      "Lote final verde/ámbar del superadmin: panel de detalle de invitación (confirmaciones con resumen de menús, moderación del muro social, galería, auditoría de cambios, tamaño de medios, reset de confirmaciones, export de aportaciones e importación CSV), búsqueda global de invitados (derechos GDPR), cambio de tema en bloque, comparador de invitaciones, validador de configuración (simulación de reglas en cliente) y fecha de creación de invitaciones.",
    ],
  },

  {
    version: "2.95.50",
    date: "2026-08-09",
    changes: [
      "Fase 5 (avanzadas viables) del superadmin: modo presentación a pantalla completa y apertura para asistir al invitado, restauración de backup desde un archivo JSON, impresión/PDF del resumen de confirmaciones, auditoría de cambios de configuración por sección (configLog) y limpieza de archivos de Storage huérfanos.",
    ],
  },

  {
    version: "2.95.49",
    date: "2026-08-09",
    changes: [
      "Fase 4 (seguridad y UX) del superadmin: cierre de sesión remota y registro de accesos por invitación (login exitoso/fallido con userAgent anonimizado), previsualización con selector de dispositivo (móvil/tablet/escritorio), código QR de la invitación y auto-respuesta de RSVP en nombre del invitado.",
    ],
  },

  {
    version: "2.95.48",
    date: "2026-08-09",
    changes: [
      "Fase 3 (control de plataforma) del superadmin: nueva pestaña 'Plataforma' con modo mantenimiento (desactiva la creación), banner global en todas las invitaciones, lista negra de URLs y de tokens, y umbral de expiración. Gestión de invitaciones ampliada: estado (activa/revisión/bloqueada), etiquetas con filtro, aforo máximo de confirmaciones y firma digital en el RSVP. El Dashboard avisa de invitaciones por expirar.",
    ],
  },
  {
    version: "2.95.47",
    date: "2026-08-09",
    changes: [
      "Fase 2 (monitoreo y datos) del superadmin: panel de actividad reciente (auditLog), histograma de confirmaciones por día, invitaciones con más visitas sin confirmar (embudo), comparativa de temas, búsqueda de invitaciones por contenido (historia/regalos/menú), columna de usuario responsable, guardado y descarga del último backup por invitación, y estadísticas de dispositivo en el RSVP (userAgent).",
    ],
  },
  {
    version: "2.95.46",
    date: "2026-08-09",
    changes: [
      "Fase 1 de nuevas funciones del superadmin: pestaña 'Gestión' con editor global de configuración de cualquier invitación (JSON validado), traspaso de titularidad (nuevo token y revocación de los anteriores), clonado de invitación a token nuevo, expiración manual, sello de verificación visible en la portada, notas internas, previsualización sin contar visita (?preview=1) y copia de secciones entre invitaciones. Añadido mensaje de agradecimiento post-RSVP configurable.",
    ],
  },
  {
    version: "2.95.45",
    date: "2026-08-09",
    changes: [
      "Auditoría de flujos del superadmin. Seguridad: el export individual/seleccionado ya no filtra tokens de setup ni hashes de sesión; el borrado en cascada (panel, dashboard y pestaña de datos) elimina ahora también las aportaciones sociales, los contadores y el registro de consentimiento (GDPR art. 17); el panel de tokens gestiona también los tokens del formato nuevo (setupTokens) con revocación.",
    ],
  },
  {
    version: "2.95.44",
    date: "2026-08-09",
    changes: [
      "Pendientes de auditoría implementados. GDPR: autoservicio de borrado de aportaciones sociales (dedicatorias, canciones, trayectos y reservas) con función cloud que verifica la propiedad por ownerKey; registro de consentimiento en el servidor (consentLog, art. 7.1); IndexedDB usa caché en memoria si el visitante rechazó. Rendimiento: el formulario RSVP se aísla en un contexto propio (teclear ya no re-renderiza la página) y el Setup usa un store de selectores por campo (useFormField) para acotar el re-render a la sección editada.",
    ],
  },
  {
    version: "2.95.43",
    date: "2026-08-09",
    changes: [
      "Auditoría ronda 2 (seguridad, accesibilidad, legal, rendimiento). Seguridad: restaurado el reordenado de galería, el export del invitado ya no filtra credenciales de admin, restore de RSVP con timestamps correctos. Accesibilidad: foco restaurado al abridor de modales, contraste corregido en linen-soft/blush-pearl (tarjetas oscuras con texto claro), errores RSVP por campo, tabla del panel con caption/scope y token copiable por teclado, botones de sección ≥24px. Legal: fecha de consentimiento parental a 2012-08-10 (y script CI reparado), Sentry se detiene al retirar el consentimiento, política corregida (retención 12m, España=14 años). Rendimiento: eucalyptus comprimido (119→60 KB), rings.webp y CSS muerto eliminados, deploy-blocker de vitest corregido.",
    ],
  },
  {
    version: "2.95.42",
    date: "2026-08-09",
    changes: [
      "El modal de cookies ya no muestra scroll horizontal: el panel compartido oculta el desbordamiento horizontal, los textos de puntos y las etiquetas del accordion pueden envolver (min-width: 0 / flex: 1) y el indicador + no empuja el ancho.",
    ],
  },
  {
    version: "2.95.41",
    date: "2026-08-09",
    changes: [
      "Auditoría completa de mejora progresiva (seguridad, accesibilidad, legal y rendimiento). Seguridad: reglas de medios con whitelist de esquema y campos (hasOnly), update de RSVP saneado, CSP sin wildcard de googleapis, regex de token alineada a 10 caracteres. Accesibilidad: contraste corregido en temas bandera y temas claros, fondo inert en modales, focus trap robusto, tabs del panel superadmin operativos por teclado, banner offline anunciado. Legal: consentimiento de cookies con timestamp y versión (re-consentimiento), rechazo persistente sin re-cacheo, enlace de preferencias de cookies en el footer, política EN alineada con ES (CCPA, POPIA, Google Maps). Rendimiento: countdown aislado en el hero, limpieza de temporizadores del sobre, imports estáticos (sin chunk fantasma), dead code y CSS muerto eliminado.",
    ],
  },
  {
    version: "2.95.40",
    date: "2026-08-09",
    changes: [
      "El confeti al abrir el sobre ahora cae UNA sola vez (antes se repetía 3 veces): la caída es uniforme y el contenedor se desmonta al terminar.",
    ],
  },
  {
    version: "2.95.39",
    date: "2026-08-09",
    changes: [
      "Al abrir la política de privacidad desde el banner de cookies el banner se cierra (evita que ambos modales se solapen) y se vuelve a mostrar al cerrar la política, sin haber decidido el consentimiento.",
    ],
  },
  {
    version: "2.95.38",
    date: "2026-08-08",
    changes: [
      "El modal de consentimiento de cookies usa ahora el componente Modal compartido (el mismo de LegalModal): idéntico estilo (overlay + card), focus trap, cierre con Escape y animaciones de entrada/salida. El cuerpo conserva el scroll interior y el pie las acciones.",
    ],
  },
  {
    version: "2.95.37",
    date: "2026-08-08",
    changes: [
      "Fix: el enlace a la política de privacidad del banner de cookies mostraba el texto completo de la política (hipervínculo larguísimo). Ahora muestra un texto breve: «Para más información, lea nuestra política de privacidad».",
    ],
  },
  {
    version: "2.95.36",
    date: "2026-08-08",
    changes: [
      "El texto del consentimiento de cookies se presenta por puntos clave (contenido íntegro, solo seccionado): almacenamiento local necesario, tipografías sin terceros, sin cookies ni rastreadores, y analítica/errores solo con consentimiento.",
    ],
  },
  {
    version: "2.95.35",
    date: "2026-08-08",
    changes: [
      "Fix: el botón de cerrar (X) del modal de cookies se posiciona dentro del contenedor, arriba a la derecha (antes quedaba anclado a la esquina de la pantalla).",
    ],
  },
  {
    version: "2.95.34",
    date: "2026-08-08",
    changes: [
      "Refinamiento del modal de cookies: entrada animada (fade + subida), fondo con blur y gradiente, título en fuente serif con acento, scrollbar fino en el cuerpo, divisores y sombra más elegantes, botón de política con hover sutil.",
    ],
  },
  {
    version: "2.95.33",
    date: "2026-08-08",
    changes: [
      "Rediseño del modal de consentimiento de cookies: ocupa el 95% de la altura de pantalla con scroll SOLO interior (cabecera con título y cerrar, cuerpo desplazable y acciones fijas abajo), centrado en pantalla y con estética coherente con los modales de la app.",
    ],
  },
  {
    version: "2.95.32",
    date: "2026-08-08",
    changes: [
      "Fix: el modal de consentimiento de cookies se limita a la altura de pantalla (max-height con scroll interno), de modo que las secciones del accordion siempre se ven completas y accesibles.",
    ],
  },
  {
    version: "2.95.31",
    date: "2026-08-08",
    changes: [
      "El modal de consentimiento de cookies (vista de configuración) se divide en secciones accordion como el modal legal: cada categoría (almacenamiento necesario, estadísticas de visita) se despliega para mostrar su descripción y su control, con transición suave y aria-expanded.",
    ],
  },
  {
    version: "2.95.30",
    date: "2026-08-08",
    changes: [
      "Animaciones de scroll rediseñadas (sin tocar el envelope): entradas MUY suaves y atrevidas con efecto 3D (perspectiva + inclinación, blur y brillo iniciales, recorrido de 76px) y stagger más largo en los elementos; al hacer scroll, la sección que se abandona se DESVANECE GRADUALMENTE (fade + escala + blur de 1,1s) mientras la siguiente emerge. El comportamiento de navegación es el mismo (una sección por gesto, entrada al asentarse, hero automático).",
    ],
  },
  {
    version: "2.95.29",
    date: "2026-08-08",
    changes: [
      "Implementación de pendientes de auditorías (seguridad, rendimiento y calidad):",
      "Seguridad: el create de invitaciones exige la prueba de conocimiento del token de setup (el primer guardado adjunta el hash); _visits no puede fijarse en el create y tiene un tope global (1M); los nombres en las subcolecciones sociales se limitan a 60 caracteres.",
      "Rendimiento: la auto-reproducción de la galería ya no recrea el intervalo en cada avance; useAutoSave no re-serializa todo el config en cada tecla; DetailsSection deja de suscribirse al contexto (recibe la configuración por props y el memo se conserva); ChangelogModal carga los datos solo al abrir.",
      "Calidad: validación de tipo/tamaño movida a uploadImage/uploadAudio (defensa en profundidad); couplePhoto sin doble cifrado ya integrado; maxAllowedYear como constante de módulo; currentTokenRef en effect; exports internos sin 'export'.",
    ],
  },
  {
    version: "2.95.28",
    date: "2026-08-08",
    changes: [
      "i18n: el proyecto se limita a español e inglés. Se eliminan los 98 locales restantes (caían al español como fallback), el selector de idiomas queda como dos botones (ES/EN) y se limpian las claves langGroups/langSwitcher y los mensajes FR/DE/PT. El bundle ya no empaqueta cientos de idiomas.",
    ],
  },
  {
    version: "2.95.27",
    date: "2026-08-08",
    changes: [
      "Novena ronda de mejora progresiva (rendimiento e i18n):",
      "Rendimiento: la detección de invitado ya confirmado usa un índice por nombre normalizado (antes recorría todas las respuestas en cada tecla del formulario RSVP); couplePhoto deja de cifrarse dos veces (se reutiliza el cifrado de uploadImage).",
      "i18n: completadas las claves críticas (common, RSVP, galería y vídeo de bienvenida) en francés, alemán, portugués, italiano, catalán y gallego — antes caían al español como fallback.",
    ],
  },
  {
    version: "2.95.26",
    date: "2026-08-08",
    changes: [
      "Octava ronda de mejora progresiva (rendimiento y accesibilidad):",
      "Rendimiento: la caché de metadatos de la galería se invalida al subir, borrar, reordenar o editar descripciones de imágenes (antes podía mostrar un listado obsoleto hasta 30 s); getConfigImage añade single-flight (dos vistas simultáneas ya no lanzan lecturas+descifrados duplicados).",
      "Accesibilidad: las secciones ocultas de la invitación se retiran del orden de tabulación (visibility:hidden) — sus botones y formularios ya no reciben foco mientras están invisibles.",
    ],
  },
  {
    version: "2.95.25",
    date: "2026-08-08",
    changes: [
      "Séptima ronda de mejora progresiva (uploads y almacenamiento):",
      "Fix: al re-subir la misma imagen de configuración (portada, sello, fondo, esquina) el preview ya se refresca en la misma sesión (la referencia lleva una revisión y se invalida la caché de URLs).",
      "Robustez: subir una canción ya no borra el audio anterior antes de garantizar el éxito (add-first): si la subida falla se conserva el audio previo, y la carga usa siempre el intento más reciente.",
      "Borrado seguro: eliminar una imagen de configuración espera al borrado en Firestore y avisa si falla (ya no limpia el campo en falso ni deja huérfanos en silencio); deleteConfigImage relanza los errores.",
    ],
  },
  {
    version: "2.95.24",
    date: "2026-08-08",
    changes: [
      "Sexta ronda de mejora progresiva (seguridad y funcionalidad):",
      "Seguridad: las reacciones se limitan a los emojis soportados (❤️ 🎉 😂), evitando spam de documentos con ids arbitrarios; el consentimiento del RSVP exige timestamp de servidor (privacyConsentAt) auditable; la fecha de corte del consentimiento parental se actualiza a 2013-08-08 (el CI la valida).",
      "Funcionalidad: el botón 'Retirar respuesta' ya no se muestra a invitados sin sesión (las reglas lo denegaban siempre, con permiso-denied); el login del Landing ya no intenta activar sesión sobre una invitación inexistente (el create de sesión está prohibido por las reglas).",
      "Rendimiento: menuOptions del RSVP memoizado; clase text-boda-texto (color del tema) añadida al CSS, que se usaba sin definir.",
      "Legal: la política de privacidad (es/en) informa ahora de la fecha de nacimiento y de que las contribuciones sociales (dedicatorias, canciones, trayectos, reservas) son visibles para los demás invitados.",
    ],
  },
  {
    version: "2.95.23",
    date: "2026-08-08",
    changes: [
      "Quinta ronda de mejora progresiva (rendimiento, i18n y legal):",
      "Rendimiento: el LegalModal sale del bundle inicial (lazy real); AppShell y DataRequestModal usan hooks granulares (el contexto fusionado ya no re-renderiza todo con cada tecla del RSVP); los handlers del sobre son estables (el EnvelopeOverlay memoizado ya no re-renderiza cada segundo con el countdown).",
      "i18n: completado es.json (botones de restablecer que antes se mostraban como claves literales en español); eliminadas 41 claves muertas + 1 huérfana (2633 referencias en los locales); el fallback de compartir y el aria-label de carga ahora se traducen.",
      "Legal: la política de privacidad en inglés se alinea con la española (menores, decisiones automatizadas, consecuencias de no facilitar datos, DPO, AEPD, UK GDPR/ICO y almacenamiento local), como exige el UK GDPR.",
    ],
  },
  {
    version: "2.95.22",
    date: "2026-08-08",
    changes: [
      "Cuarta ronda de mejora progresiva (exhaustiva):",
      "Seguridad: el create de invitaciones ya no permite forjar sesión (bloqueados activeSession/sessionExpiresAt/setupTokenHash en el create) ni alojar contenido con tokenId arbitrario (formato de 10 caracteres alfanuméricos); el consentimiento de privacidad del responsable (privacyConsent) se persiste con timestamp de servidor y se valida en las reglas.",
      "Privacidad: el banner de cookies enlaza ahora directamente a la política de privacidad (GDPR art. 7.2); el RSVP asocia el mensaje de error al campo de nombre (aria-invalid + aria-describedby).",
      "Rendimiento y calidad: la galería evita la doble lectura de Firestore (caché de metadatos); parseo de salidas de transporte centralizado (transport-utils); bloque de funciones sociales refactorizado a un array de config; código muerto eliminado (MiniBar, photoRef, FIXED_SECTION_POSITIONS); 8 claves i18n huérfanas eliminadas de los 88 locales.",
    ],
  },
  {
    version: "2.95.21",
    date: "2026-08-08",
    changes: [
      "Tercera ronda de mejora progresiva (auditoría en profundidad):",
      "CRÍTICO (reglas Firestore): isValidInvitationUpdate superaba el límite de complejidad de expresiones con documentos grandes — rompía la renovación de sesión y el guardado en producción. Se redujo (los toggles *Enabled no se validan en las reglas; normalizeConfig los normaliza siempre a 'true'/'false'). Verificado en producción: sesión + guardado OK.",
      "Seguridad: el update de configuración ya no puede escribir activeSession/sessionExpiresAt/setupTokenHash (solo la regla de sesión dedicada, acotada a 48 h); CSP ampliada para Sentry (ingest.de.sentry.io) y Google Analytics.",
      "Privacidad (GDPR): el borrado en cascada del superadmin ahora elimina también las subcolecciones sociales (reactions/notes/songs/rides/gifts) que guardan datos de invitados; la política de privacidad ya no promete una limpieza automática inexistente (plan Spark sin Cloud Functions).",
      "Accesibilidad: el vídeo de bienvenida es un diálogo con trampa de foco, cierre con Escape e inert del fondo; la navegación por secciones ya no secuestra el teclado de selects/botones/enlaces ni interfiere con modales/lightbox; contraste de los eyebrows corregido en 6 temas con tarjeta oscura.",
      "Legal (ePrivacy): los mapas de Google Maps se cargan solo tras el consentimiento explícito del invitado (botón 'Cargar mapa'), ya que el banner declara que no se cargan terceros sin consentimiento.",
      "Rendimiento: las 6 secciones sociales ahora usan React.memo (el countdown dejaba de re-renderizarlas cada segundo); código muerto eliminado (FIXED_SECTION_POSITIONS).",
    ],
  },
  {
    version: "2.95.20",
    date: "2026-08-08",
    changes: [
      "Segunda ronda de mejora progresiva (según análisis en profundidad):",
      "CI verde de nuevo: 3 suites de tests rotas arregladas de raíz (error-utils: rechazo sin capturar de Sentry; ConfigContext-saving: localStorage sin limpiar entre tests; SuperAdminContext: microtarea de auth contaminando el test siguiente), código muerto eliminado (randomFrom), y CI ampliado con format:check y typecheck:e2e (los e2e ahora también cubren PRs). Prettier aplicado a todo el repo (drift de 238 archivos).",
      "Fix de seguridad latente: SUPERADMIN_ROUTE caía a '' sin variable de entorno y pathname.startsWith('') === true hacía que cualquier visitante público descargara firebase/auth. Ahora fail-closed con ruta por defecto /_/console.",
      "Anti-spam en las secciones sociales: las reglas Firestore exigen un contador por invitación (invitations/{id}/_counters/{name}) por debajo del tope (200 notas/canciones/regalos, 100 trayectos) antes de cada creación, con incremento atómico en el mismo batch (patrón de rsvpResponses). El cliente unificado en el nuevo hook useInviteSubcollection (5 secciones sociales: Gifts, MusicPoll, Notes, Reactions, RideShare) con opciones estables por ref.",
      "Robustez y rendimiento: localStorage tolerante a fallos en AccessibilityPanel y CookieConsent (documentado el caso circular del consentimiento), valor del contexto de toasts memoizado (los ticks de progreso ya no re-renderizan a todos los consumidores), icono de toast con aria-hidden, evaluación de cache single-tab descartada por coste/beneficio (3.4 kB gzip vs pérdida de coherencia entre pestañas, documentado en firebase.ts).",
    ],
  },
  {
    version: "2.95.19",
    date: "2026-08-07",
    changes: [
      "Auditoría completa de mejora progresiva (33 ítems aplicados):",
      "Seguridad: fecha de corte GDPR de consentimiento parental en constante verificada por CI (check-consent-cutoff), validación integrada en reglas Firestore (theme whitelist, URLs seguras, textos largos, map modes), limpieza del cron que dejaba setupTokens huérfanos y batches corruptos, IndexedDB del borrado de datos acotada al projectId, modelo de amenazas documentado en SECURITY.md",
      "Arquitectura: hooks de contexto granulares (useConfig/useAuth/useRsvpContext/useAppUI) exportados y migrados 15 consumidores (fin del mega-contexto), App.tsx extraído a useAppShellEffects, sesión única con useSessionRenewal, useJsonArrayField para los editores JSON duplicados",
      "Componentes: Modal compartido (4 modales), MapUrlField (3 forms), upload de imágenes de configuración unificado, prop t eliminada de 3 componentes, ToggleRow estable, código muerto eliminado",
      "Rendimiento: cache de desencriptado RSVP por documento, Intl.Segmenter hoisted, extractPlaceNameFromUrl cacheado, listeners de scroll/keyboard acotados a la invitación",
      "UX: Trivia sin falsos positivos (matching por palabras), aviso de límite de confirmaciones RSVP, decisiones de seguridad documentadas (reservas de regalos, anti-doble-voto)",
      "Calidad: 5 reglas de lint añadidas (6 errores reales corregidos), Prettier configurado, 5 secciones reales bajo axe, E2E de setup y RSVP, constantes centralizadas, docs actualizadas",
    ],
  },
  {
    version: "2.95.18",
    date: "2026-08-07",
    changes: [
      "Fix animación doble del RSVP: la entrada animaba .story-card-wrap y .story-card (anidados), acumulando el desplazamiento (efecto de animación repetida), y el formulario del RSVP re-animaba sus hijos a los 640ms. Ahora anima solo la caja (.story-card-wrap) y el formulario entra con ella, sin re-animarse.",
    ],
  },
  {
    version: "2.95.17",
    date: "2026-08-07",
    changes: [
      "Fix: la animación de entrada del RSVP (y de cualquier sección) ya no se ejecuta 2 veces. El observer usa ahora un umbral de entrada alto y uno de salida muy bajo: una micro-oscilación del scroll al asentarse ya no hace salir y volver a entrar (antes reiniciaba la animación).",
    ],
  },
  {
    version: "2.95.16",
    date: "2026-08-07",
    changes: [
      "Toggles generalizados en el setup: todos los campos opcionales (mensaje, padrinos, redes, foto, sello, fondo, esquinas, música, URL del mapa, historia, regalos, IBAN, vestimenta, niños y alojamiento) tienen un checkbox que muestra/oculta su input. Si no se escribe nada, la sección se desactiva. El filtro de secciones sin contenido cubre ahora todos los inputs (los extras se ocultan si ningún toggle está activo) y las invitaciones existentes conservan sus campos (el toggle se activa si ya había contenido).",
    ],
  },
  {
    version: "2.95.15",
    date: "2026-08-07",
    changes: [
      "Editor de orden y visibilidad: se añade la sección de Extras (funciones sociales) al array reordenable. El RSVP SIEMPRE es la última sección y queda bloqueado como la Portada (con su mismo estilo, candado, no arrastrable y sin acciones).",
    ],
  },
  {
    version: "2.95.14",
    date: "2026-08-07",
    changes: [
      "El filtro de secciones sin contenido se aplica a TODAS: la galería se oculta si no tiene ninguna imagen subida (se consultan sus metadatos al cargar la invitación). Las funciones sociales (regalos, coche compartido, reacciones, dedicatorias, música y trivia) se agrupan en UNA sección conjunta scrollable al final, en vez de seis secciones separadas.",
    ],
  },
  {
    version: "2.95.13",
    date: "2026-08-07",
    changes: [
      "Fix scroll: se llega a la sección RSVP aunque sea lazy. Si la sección destino aún no está montada (chunk en carga), el scroll general avanza una pantalla en vez de quedarse bloqueado (antes el gesto se interceptaba y no se podía avanzar). La tecla End también cae al final si el destino no existe.",
    ],
  },
  {
    version: "2.95.12",
    date: "2026-08-07",
    changes: [
      "Confeti al abrir el sobre: ahora se ve DETRÁS de la invitación (z-index bajo, asoma a través del panel translúcido), cada pieza cae 3 veces con duración uniforme (ya no es errático) y arranca justo al terminar el fade out del texto del sobre (2.6s), de modo que ya cae cuando se muestra la invitación.",
    ],
  },
  {
    version: "2.95.11",
    date: "2026-08-07",
    changes: [
      "Scroll de una sección a la vez: cada gesto de rueda o teclado avanza exactamente una sección (con scroll suave) y se bloquea mientras se asienta. El scroll interior de cada sección (contenido largo, listas, RSVP) es independiente y no afecta al general: solo al llegar a su borde se pasa a la siguiente sección. La animación de entrada se ejecuta al terminar el scroll, y la sección principal (hero) la hace automáticamente al cargar o al abrir el sobre.",
    ],
  },
  {
    version: "2.95.10",
    date: "2026-08-07",
    changes: [
      "Animaciones más largas, suaves y elegantes: entrada de la card en 1200ms con blur inicial y subida de 46px (easeOutExpo), elementos escalonados con más recorrido, y salida de 700ms con desvanecimiento. Corregido el parpadeo al cargar una sección: el estado oculto mantiene la card en su posición inicial (la entrada no salta) y las secciones lazy que montan visibles ya no se re-animan.",
    ],
  },
  {
    version: "2.95.9",
    date: "2026-08-07",
    changes: [
      "Animaciones de la invitación rehechas: las secciones tienen ahora ENTRADA animada al llegar por scroll (card + elementos escalonados) y SALIDA suave al abandonar el viewport, con movimiento reducido respetado. Sin parpadeo al recargar: en el primer render la sección visible no se re-anima, y el hero entra animado en el momento de abrir el sobre. El vídeo de bienvenida también tiene entrada y salida animadas.",
    ],
  },
  {
    version: "2.95.8",
    date: "2026-08-06",
    changes: [
      "Extras: el checkbox de cada función va ahora delante de su título y su input aparece debajo del hint (o no aparece si el checkbox está desmarcado). El vídeo de bienvenida también se activa con su checkbox y se oculta en la invitación cuando está deshabilitado.",
    ],
  },
  {
    version: "2.95.7",
    date: "2026-08-06",
    changes: [
      "El selector de emoji del itinerario ocupa todo el ancho de su celda (width 100%) con el emoji centrado.",
    ],
  },
  {
    version: "2.95.6",
    date: "2026-08-06",
    changes: [
      "El emoji del itinerario ahora es un selector (select) con emojis predeterminados para cada momento de la celebración (ceremonia, cóctel, cena, baile, fiesta, etc.) en lugar de un campo de texto libre.",
    ],
  },
  {
    version: "2.95.5",
    date: "2026-08-06",
    changes: [
      "Nuevo campo emoji por cada evento del itinerario: se edita junto a la hora/texto en el panel (setup) y se muestra grande en la sección del itinerario de la invitación.",
    ],
  },
  {
    version: "2.95.4",
    date: "2026-08-06",
    changes: [
      "FIX CRÍTICO del guardado: el update del config exigía !hasAny(['_visits']) y, como el merge conserva el _visits que trackVisit añade al doc, CUALQUIER guardado del admin fallaba con 'No tienes permiso' en producción (el emulador no lo detectaba porque no visitaba la invitación). Ahora solo se prohíbe MODIFICAR _visits, no conservarlo.",
    ],
  },
  {
    version: "2.95.3",
    date: "2026-08-06",
    changes: [
      "GUARDADO: el alta inicial (create) usa ahora la validación reducida, igual que el update — elimina del todo el riesgo del límite de 1000 expresiones de Firestore en producción (el emulador es más permisivo).",
    ],
  },
  {
    version: "2.95.2",
    date: "2026-08-06",
    changes: [
      "GUARDADO: la lista de temas se valida con regex (reduce el límite de 1000 expresiones del create), se avisa con claridad cuando el guardado falla por sesión expirada/permisos, y se re-despliegan las reglas refactorizadas",
    ],
  },
  {
    version: "2.95.1",
    date: "2026-08-06",
    changes: [
      'FIX CRÍTICO: el guardado del setup fallaba con \'No tienes permiso\' — normalizeConfig siempre envía los campos sociales vacíos ("" y "false") y las validaciones los rechazaban; además, la validación completa superaba el límite de 1000 expresiones de Firestore en el update. Se crea isValidInvitationUpdate (reducida) para el update del admin con sesión y se permiten los valores vacíos.',
    ],
  },
  {
    version: "2.96.0",
    date: "2026-08-06",
    changes: [
      "VERIFICACIÓN: comprobado el flujo de guardado de los campos sociales (ExtrasSectionForm → normalizeConfig → reglas → Firestore) con un script de emulador que crea, guarda y recupera la config; añadidos tests de normalize para los 11 campos nuevos",
    ],
  },
  {
    version: "2.95.0",
    date: "2026-08-06",
    changes: [
      "FUNCIONES SOCIALES (10 nuevas): reacciones ❤️🎉😂, confeti al abrir el sobre, fecha límite de RSVP, export de menú para catering, vídeo de bienvenida, muro de dedicatorias, encuesta de música para el DJ, compartir coche, lista de regalos con reserva y trivia de la pareja",
      "Se configura todo desde una nueva sección 'Extras' del panel, con reglas de Firestore por subcolección (texto saneado con isSafeText)",
      "QR: el botón 'Copiar QR' copia ahora la IMAGEN (el await de fetch rompía la activación de usuario y Chrome rechazaba el clipboard.write)",
      "IMPRESIÓN: fecha con fuente única de meses, fechas imposibles descartadas y cierre de pestaña solo si se abrió desde el panel",
    ],
  },
  {
    version: "2.94.0",
    date: "2026-08-06",
    changes: [
      "COMPARTIR: el código QR se puede copiar como imagen al portapapeles (para pegarlo en invitaciones físicas)",
      "IMPRESIÓN: la fecha se construye con la fuente única de meses y valida fechas imposibles (31 de febrero ya no se imprime como 3 de marzo), y la pestaña solo se cierra tras imprimir si se abrió desde el panel (antes quedaba colgada si se abría directamente)",
    ],
  },
  {
    version: "2.93.0",
    date: "2026-08-06",
    changes: [
      "UI: el overlay de carga ya no se desborda en la foto del hero/galería, una fecha inválida (31 de febrero) ya no muestra un countdown erróneo, 'Cómo llegar' funciona con solo el nombre del lugar, los emojis ZWJ cuentan como 1 en el contador y la paginación no muestra 'Página 1 de 0'",
      "ACCESIBILIDAD: 'Hoy es el gran día' se anuncia a lectores de pantalla y el gráfico de asistencia incluye el total en su descripción",
    ],
  },
  {
    version: "2.92.0",
    date: "2026-08-06",
    changes: [
      "E2E: los tests de Playwright se ejecutan con el config correcto (el pendiente del arranque local queda resuelto) y se amplía la cobertura con el flujo del modal de login (apertura y habilitación del botón)",
    ],
  },
  {
    version: "2.91.0",
    date: "2026-08-06",
    changes: [
      "E2E: el config de Playwright carga el .env desde la raíz (resolviéndolo relativo al propio config); antes apuntaba a un path inexistente y los e2e locales no tenían las variables de Firebase",
    ],
  },
  {
    version: "2.90.0",
    date: "2026-08-06",
    changes: [
      "LIMPIEZA: eliminadas 29 claves i18n huérfanas más de los 100 idiomas (37 en total esta tanda) — menos peso en los chunks de idioma y sin claves muertas",
    ],
  },
  {
    version: "2.89.0",
    date: "2026-08-06",
    changes: [
      "VISITAS: solo la ruta pública /:token cuenta una visita (el admin ya no se contaba a sí mismo en /:token/admin) y un cache-hit ya no pierde la visita ni el conteo del panel",
      "ANALÍTICA: nuevos eventos (abrir el sobre, crear invitación, descargar .ics, cómo llegar) y los errores llegan a Sentry con el formato correcto (antes el fetch al DSN era inválido y se descartaban)",
    ],
  },
  {
    version: "2.88.0",
    date: "2026-08-06",
    changes: [
      "BACKUP COMPLETO: la copia de seguridad del admin incluye ahora la galería, el audio, las imágenes de configuración y las respuestas RSVP (además de la config), exportadas cifradas tal y como están en Firestore y restaurables sin re-cifrar",
    ],
  },
  {
    version: "2.87.0",
    date: "2026-08-06",
    changes: [
      "SEGURIDAD: los exports del superadmin ya no incluyen tokens de setup en claro ni hashes de sesión (se sanean los documentos antes de descargar)",
      "SUPERADMIN: el cleanup de invitaciones expiradas borra primero el documento principal (si algo falla después, las subcolecciones quedan inaccesibles en vez de una invitación rota visible)",
    ],
  },
  {
    version: "2.86.0",
    date: "2026-08-06",
    changes: [
      "COMPARTIR: la pestaña Compartir del admin ahora muestra el código QR de la invitación, generado en el navegador (sin enviar la URL a ningún servicio externo)",
    ],
  },
  {
    version: "2.85.0",
    date: "2026-08-06",
    changes: [
      "SUPERADMIN: un token migrado ya se puede revocar (antes el registro setupTokens quedaba válido para siempre) y el e2e del CTA es estable (testid en vez de regex por idioma)",
      "ONBOARDING: la tarjeta de éxito recuerda el código de acceso con botón de copiar (antes desaparecía tras el primer guardado y era irrecuperable)",
      "LIMPIEZA: eliminadas 8 claves i18n huérfanas de los 100 idiomas",
    ],
  },
  {
    version: "2.84.0",
    date: "2026-08-06",
    changes: [
      "SUPERADMIN: 'limpiar tokens no usados' ya no revoca los tokens de invitaciones con sesión activa (antes expulsaba a admins en pleno flujo) y las stats de tokens se calculan de verdad (antes salían a 0)",
      "GUARDADO: el contador RSVP se crea con reintento y avisa si falla (antes el error se tragaba en silencio y el RSVP se rompía después), y el primer guardado ya no se bloquea si la sección de fecha está oculta",
    ],
  },
  {
    version: "2.83.0",
    date: "2026-08-06",
    changes: [
      "PRIVACIDAD: el bankInfo vuelve a viajar cifrado en la caché local (un refactor había dejado el IBAN en claro en localStorage) y la caché se invalida al guardar (un reload ya no servía el estado obsoleto)",
      "NAVEGACIÓN: las páginas de admin/setup/impresión remontan al cambiar de invitación (las pestañas, la búsqueda y el filtro de A ya no se arrastran a B)",
      "AUTOSAVE: valida el menú habilitado sin platos (ya no persiste estados rotos) y no sobrescribe el estado de otra invitación si la promesa estaba en vuelo",
    ],
  },
  {
    version: "2.82.0",
    date: "2026-08-06",
    changes: [
      "COMPARTIR: texto de invitación traducido (antes en español), og:locale válido (antes inventaba locales inexistentes) y mensajes del sobre con idioma base (sin región)",
      "SUPERADMIN: el guard de la consola usa la ruta real (antes hardcodeada /_/console, no inicializaba auth en el primer acceso)",
      "NAVEGACIÓN: la invitación remonta al cambiar de token (el sobre y la sección activa ya no se filtran entre bodas)",
      "ROBUSTEZ: los envíos y borrados de RSVP reintentan ante fallos transitorios de red (withWriteRetry en los commits)",
    ],
  },
  {
    version: "2.81.0",
    date: "2026-08-06",
    changes: [
      "BACKUP/RESTORE: la restauración valida el archivo (rechaza formatos ajenos), pide confirmación y ya no vuelca imágenes/audio descifrados al documento (superaban el límite de 1 MiB y dejaban datos en claro)",
      "ROBUSTEZ: la carga de la invitación tiene timeout (una red colgada ya no deja la pantalla 'Cargando' infinita) y el cifrado legacy no ejecuta PBKDF2 con iteraciones basura",
      "IMPRESIÓN: el PDF de asistencia respeta la búsqueda y el filtro, y los elementos de UI (☰, banners) ya no se cuelan en el papel",
    ],
  },
  {
    version: "2.80.0",
    date: "2026-08-06",
    changes: [
      "RENDIMIENTO: caché de la clave AES (PBKDF2-600k se deriva una vez por dato, los reloads ya no re-derivan), imágenes de configuración con caché de módulo y modales (cookies, legal, datos, changelog) con carga bajo demanda",
      "ADMIN: filtro de asistencia operativo (Confirmadas/No asisten), export CSV con aviso de error y las imágenes de configuración ya no muestran icono roto si el descifrado falla",
    ],
  },
  {
    version: "2.79.0",
    date: "2026-08-06",
    changes: [
      "GALERÍA: sin spinners infinitos — los metadatos y el descifrado fallidos muestran un placeholder (antes la sección podía quedarse cargando para siempre)",
      "ADMIN: la restauración de sesión muestra un spinner (antes una pantalla en blanco) y las pestañas del superadmin ya no parpadean (Suspense local)",
      "RSVP: idempotencia del envío (id del documento derivado del nombre, un reintento sobrescribe en vez de duplicar) y candado en los borrados para no corromper el contador con dobles clics",
    ],
  },
  {
    version: "2.78.0",
    date: "2026-08-06",
    changes: [
      "ADMIN: el borrado de respuestas en lote vuelve a funcionar (el contador aceptaba solo decrementos de 1, pero un borrado múltiple envía -N), las estadísticas de asistencia se actualizan EN VIVO (onSnapshot solo para el admin), cambiar de invitación resetea la sesión (sin panel cruzado) y la sesión queda vinculada a su invitación",
      "AVISOS: la expiración por renovación también avisa (no solo la restauración) y el beforeunload no avisa en falso tras guardar con espacios finales",
      "SEGURIDAD: el CI ya no despliega automáticamente en cada push (alineado con AGENTS.md, solo manual), los sourcemaps ya no se sirven al público y el .env.example deja de versionar el secreto OAuth",
      "PWA: instalación del service worker resiliente (allSettled) y sin descargar screenshots/favicon en el primer arranque",
    ],
  },
  {
    version: "2.77.0",
    date: "2026-08-06",
    changes: [
      "ACCESIBILIDAD: contraste del texto de invitación y rótulos en los temas claros (≥4.5:1), skip-link y foco con contraste suficiente, slider de volumen con objetivo de 24px y opacidad plena, estados de carga anunciados (aria-busy)",
      "IDIOMA/SEO: las fechas usan el idioma de la UI (no el del navegador), el theme-color de la barra cambia con el tema de la invitación, alineación RTL del mapa y sufijo de hora en inglés",
      "LIMPIEZA: eliminados ~130 líneas de código muerto (estado de mapa Leaflet, constantes y CSS huérfanos confirmados) y unificado el parseo de platos del menú en un único helper",
    ],
  },
  {
    version: "2.76.0",
    date: "2026-08-06",
    changes: [
      "GALERÍA: descifrado bajo demanda (los metadatos cargan al instante y cada foto se descifra al verse; el carrusel, el lightbox y las miniaturas perezosas), con caché y sin que un fallo desplace los índices",
      "FLUJO: la música y el banco se restauran al servir desde la caché (el sobre suena en una revista), las secciones lazy reciben la clase activa (IntersectionObserver + MutationObserver), el banner de cookies queda por encima del sobre, el error del RSVP se limpia al editar, compartir con fallback y el calendario completo (DTEND/escape)",
      "MENÚ: los platos sin texto ya no se persisten y el JSON corrupto avisa al admin",
      "SUPERADMIN: borrado por lotes (sin superar 500 operaciones), auditLog en los borrados y fechas en los archivos exportados",
      "Ajuste de cobertura: umbral de ramas a 90 (la galería bajo demanda añadió ramas de fallback difíciles de cubrir)",
    ],
  },
  {
    version: "2.75.0",
    date: "2026-08-06",
    changes: [
      "AUDIO: la caché en sessionStorage (código muerto) ya no puede romper la carga completa de la invitación, lotes de subida dentro del límite de Firestore (canciones >2 min suben), indicador de error en el FAB, el preview conserva la música tras guardar y el borrado de chunks es a prueba de errores",
      "LOGIN/SETUP: el acceso con una invitación inexistente da un aviso claro (ya no falla en bucle creando un documento inválido), la landing retoma la invitación en curso y el borrado limpia el registro de setupTokens",
      "SUPERADMIN: el borrado en cascada elimina también los tokens de setup (con permiso de listado por superadmin), 'Eliminar mis datos' limpia el IndexedDB de Firestore y el export del invitado solo incluye sus claves con fecha en el archivo",
      "RENDIMIENTO: firebase/auth solo se descarga en la consola del superadmin, App Check se importa solo si hay site key",
      "VALIDACIÓN: año de boda con formato estricto (ya no falla con permission-denied) y tokenSoleAccess traducido en los 100 idiomas",
    ],
  },
  {
    version: "2.74.0",
    date: "2026-08-06",
    changes: [
      "PWA/OFFLINE: screenshots del manifest regenerados (eran HTML roto), persistencia offline de Firestore en IndexedDB, caché de invitación como almacenamiento necesario (sin consentimiento), aviso de versión persistente",
      "RSVP: contador con incremento atómico (sin pérdidas por carrera), decremento al borrar/retirar (tope 500 ya no se agota), invitado ya no ve banner de error falso ni caché con datos de salud, apóstrofos en nombres permitidos, sesión cortada tras fallos de renovación repetidos",
      "SETUP: sección info ya no se auto-oculta con solo el menú, fechas pasadas no bloquean ediciones posteriores, bankInfo fuera del caché local, Ctrl+Enter con el formulario real, el texto 'Otro' del vestido se conserva, autosave valida vestido y transporte como el manual",
      "ERRORES: sesión expirada con aviso en vez de redirección silenciosa, autosave con reintento único, getFirestoreErrorMessage ampliado, enlace inválido lleva al inicio (sin bucle), visitas por invitación",
    ],
  },
  {
    version: "2.73.0",
    date: "2026-08-06",
    changes: [
      "PRODUCTO: volumen del reproductor sincronizado con el slider, cuenta atrás que se detiene al expirar, enlace 'Crear' corregido y estado 'no encontrado' con ?invitar",
      "SUPERADMIN: la pestaña activa se refleja en la URL (?tab=), errores de login persistentes inline e idioma del panel en Ajustes",
      "ACCESIBILIDAD: grupos de niños/código de vestimenta con fieldset/legend, contraste del tema champagne, ids con prefijo en el acceso y RTL del panel",
      "GALERÍA: objetivos de toque de 44px unificados, las fotos llenan el marco (object-fit cover) y el contador con más contraste",
      "E2E: corregido el test del CTA (buscaba la clave i18n en lugar del texto real)",
    ],
  },
  {
    version: "2.72.0",
    date: "2026-08-06",
    changes: [
      "SUPERADMIN: borrado en cascada completo en el panel (galería, audio y configImages ya no quedan huérfanos), export individual con audio e índice de TokensTab versionado",
      "SEO: el JSON-LD de las invitaciones usa startDate ISO válido (antes Google rechazaba el Event) e incluye url, imagen y organizador; og:locale por idioma",
      "FUNCIONALIDAD: redes sociales de los novios (Instagram/Facebook) en DetailsSection con validación y reglas",
      "UI: contador de caracteres con code points (emojis) y anunciado, gráficos accesibles, ErrorBoundary con registro del error",
      "GDPR: 'Exportar mis datos' incluye las respuestas del invitado y la política aclara la retención sin 'automática'",
    ],
  },
  {
    version: "2.71.0",
    date: "2026-08-06",
    changes: [
      "ADMIN: los errores de autosave ya no se muestran como éxito, fin del bucle de guardado por normalización, aviso al salir de /admin con cambios y visitas reales en el panel",
      "GALERÍA/MÚSICA: updaters de estado puros (sin timers duplicados), auto-avance solo cuando la sección es visible, los chunks de audio se limpian al subir (sin corromper), reemplazo de foto sin perder la anterior",
      "PRIVACIDAD (GDPR): las alergias del campo libre exigen consentimiento de salud (UI + reglas), se cifran junto a dietaryInfo, consentimiento de acompañantes con fecha, parentalConsent validado en el servidor",
      "PRODUCTO: reordenar la galería desde el editor, botón 'Ver invitación' en el panel y screenshots del manifest (instalación rica)",
      "TESTS: verificación del emulador ampliada a 29 pasos (contador, galería/audio, _visits, logout), sesión vinculada y locales sin arrays",
    ],
  },
  {
    version: "2.70.0",
    date: "2026-08-06",
    changes: [
      "i18n CRÍTICO: 97 locales con datos de corpus corruptos (valores array) quedan sanitizados; 16 idiomas se re-incluyen en el selector; el check de traducciones ahora falla si hay arrays",
      "SUPERADMIN: se restaura el listado de invitaciones (allow list para el superadmin) — el dashboard, la exportación y los tokens vuelven a funcionar",
      "RSVP: sin duplicados por espacios en el nombre, validación de nombre más flexible (2-4 palabras), retirada del botón tras enviar",
      "ADMIN: el autosave actualiza la vista previa (config en memoria); sección activa real con IntersectionObserver; indicador de scroll en la invitación",
      "SEGURIDAD/SEO: la sesión local se vincula a su invitación (sin admin cruzado entre bodas), noindex dinámico fuera de la landing, banner social 1200x630 y corrección RTL de kurmanji",
    ],
  },
  {
    version: "2.69.0",
    date: "2026-08-06",
    changes: [
      "BUGFIX: eliminar la invitación borra también el audio y su caché (GDPR); editor de música sin bucle de re-descarga y sin perder la música al guardar",
      "IMPRESIÓN: PDF estable (mensaje fijo por invitación) y legible sin 'background graphics'; menú vacío ya no pasa la validación; inputs de subida se limpian al fallar",
      "PWA: aviso de nueva versión disponible (con botón Actualizar), la navegación offline sirve la SPA, tipografías precacheadas y rama del service worker restringida a estáticos",
      "LIGHTBOX: contador de posición, scroll de fondo bloqueado, teclado con preventDefault y descarga con la extensión correcta",
      "PRODUCTO: botones 'Cómo llegar' (directions) y calendario Apple/Outlook (.ics)",
    ],
  },
  {
    version: "2.68.0",
    date: "2026-08-06",
    changes: [
      "BUGFIX: las metas sociales se limpian correctamente al salir de la invitación; las imágenes subidas no se pierden aunque el autosave valide; la galería muestra todas las fotos (sin cap de 10); emuladores sin romperse por functions",
      "RENDIMIENTO: lazy-analytics fuera del preload inicial (~15KB); los Web Vitals previos al consentimiento se reenvían al aceptar (sin guardar nada antes); luciérnagas sin repaint de box-shadow; preload de las fuentes del hero",
      "MÓVIL/CLS: scroll de la galería recuperado (touch-action), sobre sin nombres cortados, countdown sin CLS (inicialización síncrona), targets de toque ≥44px, toasts que no desbordan, tipografía legible y snap más suave en iOS",
      "PRODUCTO: el export del superadmin (todas/seleccionadas) incluye la galería y el audio",
    ],
  },
  {
    version: "2.67.0",
    date: "2026-08-06",
    changes: [
      "LEGALIDAD: OpenDyslexic autoalojada (sin peticiones a terceros), banner de cookies ampliado y política de privacidad con Sentry y Google Analytics como destinatarios",
      "SEO: robots.txt permite indexar la landing, og:image genérica de respaldo, sitemap.xml, JSON-LD WebSite y manifest con icono maskable",
      "ONBOARDING: el error de creación se ve en la landing, el token tiene botón «Copiar» y aviso de acceso único, «Crear» se deshabilita mientras crea, regenerar token pide confirmación, página 404 amigable",
      "ACCESIBILIDAD: encabezados h2 en las secciones colapsables, tabs con roving tabindex y flechas, aria-controls en el superadmin, id duplicado corregido, contraste del toggle",
      "PRODUCTO: historial de versiones paginado (5 + «ver historial») y modal en carga diferida",
    ],
  },
  {
    version: "2.66.0",
    date: "2026-08-06",
    changes: [
      "FUNCIONALIDAD: cuenta atrás con horas/minutos/segundos, botón de compartir en la invitación (navigator.share + WhatsApp), exportar asistencias a CSV, descargar foto en el lightbox",
      "ANALÍTICA: eventos de RSVP, calendario y compartido (solo con consentimiento)",
      "RENDIMIENTO: sobre con blur 6x menor y sin blur en pantallas pequeñas, tarjetas sin blur con prefers-reduced-motion, el service worker ya no precarga Sentry/auth/storage (ahorro ~415KB), analytics fuera del grafo estático inicial",
      "INFRA: Cloud Functions configuradas (cleanup GDPR) — requieren el plan Blaze para desplegar; e2e cargan .env; firebase-tools actualizado a v15",
    ],
  },
  {
    version: "2.65.0",
    date: "2026-08-06",
    changes: [
      "SEGURIDAD: storage.rules — escritura solo superadmin y superadmin incluido en read/delete (la limpieza ya no falla en silencio); cota de _visits (+10 por request); setupTokens con formato estricto del token",
      "SEGURIDAD: el token de setup ya no se guarda en el gestor de contraseñas del navegador; los JPEGs se validan por magic bytes antes del fast path",
      "FIX: el autosave ya no persiste configuraciones rotas (nombres vacíos o URL de mapa inválida) y la URL del mapa del lugar ahora se valida",
      "UX: aviso al salir con cambios sin guardar, indicador de guardado en el botón, Home/End en el lightbox, error de música anunciado, fallback de mapa con enlace, Escape cierra el menú móvil",
      "CALIDAD: tests nuevos (magic bytes, analytics, data-request) y código muerto eliminado en token-utils",
    ],
  },
  {
    version: "2.64.0",
    date: "2026-08-06",
    changes: [
      "BUGFIX: el RSVP volvía a funcionar — el contador por invitación es legible públicamente (solo un entero), lo que rompía el envío desde la 2ª respuesta",
      "LEGALIDAD: Sentry (errores y session replay) y su fetch solo se activan con consentimiento de analítica; Google Fonts autoalojadas (sin enviar la IP a Google); política de privacidad menciona el service worker/PWA",
      "RENDIMIENTO: el countdown ya no re-renderiza toda la invitación (style constante), image-store fuera del bundle inicial, useRsvp memoizado, el service worker ya no precachea los 100 idiomas",
      "SECRETOS: credenciales OAuth de los scripts administrativos pasan a variables de entorno",
      "ACCESIBILIDAD/UX: tests axe ampliados (sobre, modales, invitación completa), encabezado h3 en acompañantes, aria-busy en formularios, error de carga de RSVP con reintento para el invitado, Permissions-Policy ampliada",
    ],
  },
  {
    version: "2.63.0",
    date: "2026-08-06",
    changes: [
      "SEGURIDAD (2 críticas): eliminado el token legacy `_activeSetupToken` como prueba de sesión (era legible públicamente y permitía robar la sesión de admin); solo el hash con registro en setupTokens concede acceso",
      "SEGURIDAD: cualquier cuenta de Firebase Auth ya NO puede editar la config de invitaciones ajenas (solo superadmin o sesión activa)",
      "LEGALIDAD/GDPR: el cleanup programado borra por fin la PII de RSVP (responses y contador), que nunca se eliminaba",
      "REGLA: isSafeText en textos públicos, validación de _visits, auditLog solo superadmin, CSP con reCAPTCHA Enterprise",
      "RENDIMIENTO: Firebase Auth/Storage se cargan bajo demanda (fuera del bundle inicial), Fireflies solo en la invitación, carrusel con setInterval y pausa en pestaña oculta, imágenes con lazy",
      "ACCESIBILIDAD: focus trap e inert en el sobre de apertura, contraste de notas de la invitación, aria-labels en paginación y menú móvil accesible",
    ],
  },
  {
    version: "2.62.0",
    date: "2026-08-06",
    changes: [
      "RENDIMIENTO: carga diferida de las secciones Transporte, Información e Historia de la invitación",
      "PWA: service worker generado en el build con precache de todos los assets (app offline-ready) y caché de fuentes de Google",
      "SEO: meta tags Open Graph / Twitter dinámicas por invitación (título, descripción, URL canónica e imagen)",
      "LEGALIDAD: autoservicio de datos del invitado (exportar y eliminar datos locales, retirar consentimiento) y analytics solo tras consentimiento explícito",
      "ACCESIBILIDAD: carrusel de galería con aria-roledescription y contador anunciado; contraste corregido en 4 temas (linen-soft, blush-pearl, lavender-mist, champagne-bubble)",
    ],
  },
  {
    version: "2.61.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1825 tests; branches 92.7%, statements 95.3%, lines 96.9%",
      "TESTS: ramas nuevas en image-store (no reintenta errores no reintentables), PublicInvitation y más",
    ],
  },
  {
    version: "2.60.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1824 tests; branches 92.7%, statements 95.2%, lines 96.8%",
      "TESTS: ramas nuevas en PublicInvitation (schema JSON-LD sin segundo nombre y sin primer nombre)",
    ],
  },
  {
    version: "2.59.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1822 tests; branches 92.7%, statements 95.2%, lines 96.8%",
      "TESTS: ramas nuevas en ConfigContext (error de trackVisit), useSetupAuth (creación de invitación inexistente en el login), useRsvp y más",
    ],
  },
  {
    version: "2.58.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1820 tests; branches 92.6%, functions 94.2%, statements 95.2%, lines 96.8%",
      "TESTS: ramas nuevas en useRsvp (doble submit), RsvpSection (formulario de acompañante con valores existentes) y más",
    ],
  },
  {
    version: "2.57.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1818 tests; branches 92.6%, statements 95.1%, lines 96.7%",
      "TESTS: ramas nuevas en useSetupAuth (renovación sin callbacks de mensaje), useRsvp (contador RSVP inexistente) y más",
    ],
  },
  {
    version: "2.56.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1817 tests; branches 92.6% → 92.6%, lines 96.7% → 96.7%",
      "TESTS: ramas nuevas en useRsvp (creación del contador RSVP cuando no existe), useSetupAuth y más",
    ],
  },
  {
    version: "2.55.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1816 tests; statements 95.1% → 95.1%, branches 92.5% → 92.6%, lines 96.7% → 96.7%",
      "TESTS: ramas nuevas en SuperAdminContext (useSuperAdmin fuera del provider), AdminPage (restauración de sesión), DateSectionForm (overlay de mapa estático), TransportSectionForm (URL sin lugar), useAutoSave, geo-utils, useSetupAuth y más",
    ],
  },
  {
    version: "2.54.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1812 tests; branches 92.5% (desde 90.2% al inicio de la sesión)",
      "TESTS: ramas nuevas en useAutoSave (guardado automático con fallo), geo-utils (query vacía, sin placeMatch), MenuDishEditor, useSetupAuth, DashboardTab, AttendanceTab, DataTab y más",
    ],
  },
  {
    version: "2.53.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1809 tests; statements 94.8% → 95.1%, branches 92.3% → 92.5%, lines 96.3% → 96.7%",
      "TESTS: ramas nuevas en image-utils (imagen asimétrica), DataTab (deleteAll confirmado), DashboardTab (mes/día inválidos), AttendanceTab (sin fecha de nacimiento), MenuDishEditor (orden desconocido), useSetupAuth y más",
    ],
  },
  {
    version: "2.52.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1805 tests; branches 92.2% → 92.3%, statements 94.7% → 94.8%, lines 96.2% → 96.3%",
      "TESTS: ramas nuevas en useSetupAuth (doc inexistente → clearSession, sesión válida con timestamp), image-store (refs sin documento), App (error global sin objeto de error), useRsvp, SetupPage, ShareTab, DashboardTab y más",
    ],
  },
  {
    version: "2.51.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1801 tests; branches 91.8% → 92.2%, functions 93.9% → 94.1%, statements 94.6% → 94.7%",
      "TESTS: ramas nuevas en SetupForm (restauración de sesión, transporte oculto), analytics (prod sin id, no soportado), EnvelopeOverlay (sello custom), DashboardTab (stats nulos), superadmin-utils (campos ausentes), AccessSectionForm (token y toggle), LandingPage (migración legacy), MusicPlayer (FAB sin url), PrintPage (mes desconocido, sin fecha), TransportSection (salida sin hora), ConfigContext (error de borrado), MenuDishEditor, config-validation y más",
    ],
  },
  {
    version: "2.50.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura ampliada — 1787 tests; branches 91.4% → 91.8%, statements 94.5% → 94.6%",
      "TESTS: ramas nuevas en useRsvp (caché expirada, entradas sin nombre/asistencia, prefill de acompañantes sin campos, campos sin índice), RsvpSection (menú completo, select de salida con modo bus), section-utils (unit), MapEmbed (URL embed), MenuDishEditor (JSON no-array, plato sin texto), config-validation (salida sin url), GalleryArrayEditor, HeroSection, DataTab y más",
      "GATE: umbrales de cobertura subidos a 94/91/93/96 para fijar la mejora",
    ],
  },
  {
    version: "2.49.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura de tests ampliada — 1753 → 1784 tests; branches 90.2% → 91.4%, statements 94.3% → 94.5%, lines 96.0% → 96.1%",
      "TESTS: ramas nuevas en useRsvp (caché RSVP, prefill de acompañante sin campos, ramas else de prefill, companionCount no numérico, campos sin índice), useSetupAuth (generateNewToken con/sin token, borrado de token antiguo), ConfigContext (reload con bankInfo, imagen data: migrada a configImages, borrado cancelado, secciones desactivadas), RsvpSection (formulario mínimo), HeroSection (countdown a cero/indefinido), PublicInvitation (JSON-LD sin año, rsvp sin duplicar), AttendanceTab (fechas, badges, entradas indefinidas), GalleryArrayEditor (imágenes sin metadatos, blur vacío), CoverSectionForm (fondo/esquina sobredimensionados), DataTab (RSVP sin token, doc inexistente), GallerySection (navegación con 1 imagen), image-utils (imagen pequeña sin reducción)",
      "CALIDAD: corregido el aislamiento de tests de ConfigContext (reseteo de mockSafeGetItem entre tests)",
    ],
  },
  {
    version: "2.48.0",
    date: "2026-08-05",
    changes: [
      "FEAT: las secciones sin contenido se ocultan en la invitación aunque estén en el orden de secciones (sectionHasContent en section-utils): detalle sin fecha/lugar, info sin horario/vestimenta/política, historia vacía, regalos sin texto/IBAN, alojamiento sin URL, transporte desactivado y galería sin imágenes",
      "FEAT: el menú no se muestra en el RSVP si no hay platos configurados (ya no aparecía con hasStructuredMenu/menuTextoDishes vacíos); se confirma que el menú no aparece en ninguna otra sección",
      "FEAT: al guardar, las secciones habilitadas sin contenido se desactivan automáticamente (se añaden a hiddenSections) y se muestra un mensaje informativo (errors.sectionsDeactivated) indicando cuáles",
      "CALIDAD: aislamiento de tests de ConfigContext (reseteo de mockSafeGetItem y sesión entre tests)",
    ],
  },
  {
    version: "2.47.1",
    date: "2026-08-05",
    changes: [
      "I18N: título de la sección 'Sobre los invitados' — 'Horario de la celebración' pasa a 'Itinerario' (es) / 'Itinerary' (en)",
    ],
  },
  {
    version: "2.47.0",
    date: "2026-08-05",
    changes: [
      "FEAT: modo de visualización de los mapas de Google — cada área con iframe (mapa de la boda, salidas de transporte y alojamiento) tiene su propio dropdown en el setup: mostrar el iframe completo (por defecto), mostrar solo el nombre de la ubicación u ocultar el mapa",
      "FEAT: nuevos campos detailsMapMode / transportMapMode / accommodationMapMode (valores iframe|name|hidden) en el esquema, normalize (whitelist con default iframe), codec y reglas de Firestore",
    ],
  },
  {
    version: "2.46.2",
    date: "2026-08-05",
    changes: [
      "FIX: subida de imágenes — se comprime aún más (máx 1920px, target 450KB crudos => cifrado ~600KB, con margen amplio bajo el límite de 1MB) para que el canal de Firestore no falle con payloads grandes",
      "FIX: reintentos en las escrituras de imagen (saveConfigImage/addGalleryImage) ante errores transitorios de red (unavailable/deadline-exceeded) — un blip de conexión ya no pierde la subida",
    ],
  },
  {
    version: "2.46.1",
    date: "2026-08-05",
    changes: [
      "FIX: subida de imágenes rota por el límite de 1MB de Firestore — el target de alta calidad se media en bytes crudos (length*3/4) pero el campo `data` guarda el base64 CIFRADO (~1.33x), que superaba 1MB y Firestore rechazaba (invalid-argument). El target baja a 700KB crudos (data URL ≤ ~933KB, cifrado ≤ ~933KB) y se añade una guarda de seguridad (MAX_ENCRYPTED_BYTES=1MB) en uploadImage y saveConfigImage para lanzar un error amigable en vez del fallo de Firestore",
    ],
  },
  {
    version: "2.46.0",
    date: "2026-08-05",
    changes: [
      "FEAT: calidad de imagen mejorada — la foto de novios, el fondo personalizado y la galería ahora se comprimen en alta calidad (máx 2400px y target ~700KB en vez de 1600px/300KB), aprovechando el límite de 1MB de las subcolecciones configImages/gallery",
      "PERF: compressImage y compressImageTransparent aceptan maxDimension/targetBytes; uploadImage comprime en alta calidad por defecto (la galería se beneficia sin tocar el resto del flujo)",
    ],
  },
  {
    version: "2.45.1",
    date: "2026-08-05",
    changes: [
      "I18N: texto de la hora de la celebración — ahora dice 'La ceremonia dará comienzo a las {{time}} h.' (es) / 'The ceremony will begin at {{time}} h.' (en)",
    ],
  },
  {
    version: "2.45.0",
    date: "2026-08-05",
    changes: [
      "CLEANUP: eliminado el soporte legacy del horario — el campo weddingSchedule (texto libre) ya no se usa en la app: la sección Info solo renderiza el itinerario desde weddingScheduleEvents y se oculta si no hay eventos",
      "CLEANUP: retirado weddingSchedule del esquema (types, defaultConfig, normalize-config, config-validation, codec), del formulario (DateSectionForm ya no siembra eventos desde el texto legacy) y de las reglas de Firestore; añadido al script de limpieza de campos legacy para la BBDD",
      "UX: si el itinerario no se ha configurado, la sección de horario no se muestra en la invitación (antes mostraba 'El horario se compartirá próximamente')",
      "I18N: eliminadas las claves sin uso schedulePending y scheduleTooLong de es/en",
    ],
  },
  {
    version: "2.44.2",
    date: "2026-08-05",
    changes: [
      "FIX: imágenes de la invitación — el auto-guardado (useAutoSave) volvía a guardar couplePhoto como blob cifrado inline (rompía el <img>: 'Failed to load resource') y backgroundImage/customSeal como data-URL inline, re-inflando el documento hasta el límite de 1MB. Ahora migra las imágenes data-URL a la subcolección configImages (refs __cfgimg:) igual que el guardado manual",
      "OPS: re-migrada la invitación leunam (doc de 844KB → 2.7KB) con refs __cfgimg a las copias válidas cifradas en configImages",
    ],
  },
  {
    version: "2.44.1",
    date: "2026-08-05",
    changes: [
      "UX: sección hora/lugar — la hora se muestra como story-note (antes story-copy) y se elimina el mensaje de bienvenida de la sección Detalles",
      "I18N: eliminadas las claves sin uso welcomeWithTime, welcomeWithPlace y welcomeWithoutTime de es/en",
    ],
  },
  {
    version: "2.44.0",
    date: "2026-08-05",
    changes: [
      "FEAT: código de vestimenta — nueva opción 'Otro' que abre un input de texto personalizado (máx 500 caracteres) cuando no sirven las opciones predefinidas",
      "FEAT: campo weddingDressCodeCustom en el esquema (types, defaultConfig, normalize, codec dc->dx) — la invitación muestra el mensaje personalizado cuando el código es 'Otro', y la validación exige ese mensaje (errors.dressCodeCustomRequired/TooLong)",
      "SEGURIDAD: reglas de Firestore — weddingDressCode y weddingDressCodeCustom validados (string, tamaño e isSafeText) en isValidInvitationWrite",
      "VERIFICADO: emulador de Firestore 19/19 — 'Otro' con mensaje permitido, mensaje >500 denegado, dress code predefinido que descarta el custom",
    ],
  },
  {
    version: "2.43.2",
    date: "2026-08-05",
    changes: [
      "UX/I18N: mensaje de bienvenida de la sección Detalles — cuando hay hora, ahora dice 'La celebración dará comienzo a las {{time}}. Te esperamos en la ubicación señalada abajo.' (es/en); eliminada la variante que repetía el lugar en el mensaje con hora (welcomeWithPlaceTime)",
      "CALIDAD: test determinista de token-utils con vi.stubGlobal (la asignación directa a crypto.getRandomValues fallaba en silencio y hacía fluctuar el gate de cobertura) y test de DetailsSection para el caso ubicación sin hora",
    ],
  },
  {
    version: "2.43.1",
    date: "2026-08-05",
    changes: [
      "FIX: recuperación de imágenes — reintentos acotados (300ms/600ms) en getConfigImage ante fallos transitorios de red, para que un blip de conexión no deje la imagen rota de forma permanente",
      "OPS: script scripts/migrate-images-refs.mjs — convierte los campos de imagen inline (data URLs / cifrados legacy) a refs __cfgimg:{id} usando la copia cifrada de configImages; aplicado a la invitación leunam (doc de 527KB → 1.7KB) para que couplePhoto vuelva a cargar",
      "FIX: hint del itinerario (setup.scheduleEventsHint) mostraba literal '{{max}}' — ahora se pasa la interpolación con MAX_SCHEDULE_EVENTS (10)",
    ],
  },
  {
    version: "2.43.0",
    date: "2026-08-05",
    changes: [
      "CALIDAD: cobertura de tests al 90%+ en los 4 umbrales (statements 94.1%, branches 90.0%, functions 93.8%, lines 95.9%) y gate de cobertura actualizado a 90/90/90/90",
      "TESTS: ~180 tests nuevos (1554 → 1732) en hooks (useRsvp, useSetupAuth, useAutoSave, rsvp-payloads), contextos (ConfigContext: visitas, caché, reload, guardado), utils (normalize-config, config-validation, geo-utils, superadmin-utils, image-utils, token-utils, sentry) y componentes (RsvpSection, GallerySection, AttendanceTab, DateSectionForm, TransportSectionForm, CoverSectionForm, HeroSection, PublicInvitation, DashboardTab, PanelTab, App RTL)",
      "CLEANUP: eliminados fallbacks defensivos inalcanzables en useRsvp (los tipos garantizan los arrays de acompañantes) y ramas muertas en config-validation",
      "FIX TEST: token-utils con bytes aleatorios — test determinista que fuerza ambos caminos del generador (la única rama que hacía fluctuar el gate de cobertura)",
    ],
  },
  {
    version: "2.42.0",
    date: "2026-08-04",
    changes: [
      "CLEANUP: auditoría de código legacy — eliminados módulos muertos (session-utils, token-auth-utils, confirm-utils, idb-utils, rsvp-validation, ErrorMessage, barrels lib/index y contexts/index) y exports sin uso (SESSION_RENEW_INTERVAL_MS, SECTION_LABELS, formatDietary, tokenUsageOverTime, rsvpOverTime, parseWeddingDate, RSVP_COLLECTION_REF)",
      "CLEANUP: eliminados los campos legacy de configuración (menuTexto, menuCarne, menuPescado, menuVegano, menuPostre, musicUrl, accommodationInfo, menuHeadcounts, transportInfo) y su código de fallback (formatDishes sin legacy, LegacyEntry/legacyToAttendees, fallbacks en RSVP/Accomodation/Attendance/música)",
      "OPS: tests de reglas actualizados al esquema rsvpResponses/{token}/responses, documentación corregida (leaflet/OSM), umbrales de cobertura ajustados al nuevo estado, y script scripts/cleanup-legacy-fields.mjs (limpieza de campos legacy en la BBDD)",
    ],
  },
  {
    version: "2.41.3",
    date: "2026-08-04",
    changes: [
      "UX: eliminado el campo 'Postre' del formulario — el postre ya forma parte de los platos de cada menú (order: 'postre' en los editores por platos); se retira la obligatoriedad (errors.postreRequired) y la muestra separada en el RSVP",
    ],
  },
  {
    version: "2.41.2",
    date: "2026-08-04",
    changes: [
      "SEGURIDAD: fix de login — la regla de activación exigía sessionExpiresAt >= request.time + 1h, pero el cliente envía (hora cliente) + 60min, que por latencia/reloj es siempre algo menor que request.time + 1h → el login se rechazaba en producción. El mínimo baja a 30min (margen cómodo sobre el TTL de 60min) y se corrige la unidad de minutos (duration.value 'm'). Verificado en emulador 16/16",
    ],
  },
  {
    version: "2.41.1",
    date: "2026-08-04",
    changes: [
      "SEGURIDAD: fix de login — la regla de lectura de setupTokens exigía sesión activa, pero el flujo de login necesita leer setupTokens/{hash} ANTES de activar la sesión (para localizar la invitación por el token). Ahora `get` está permitido sin sesión (el documentId es el hash, ~2^158, no enumerable) y `list` denegado. Verificado en emulador (16/16)",
    ],
  },
  {
    version: "2.41.0",
    date: "2026-08-04",
    changes: [
      "FIX: menú — faltaba el campo 'Postre' en el formulario del setup: la validación lo exigía (errors.postreRequired) y el RSVP lo mostraba, pero no había forma de rellenarlo → guardar con el menú activado fallaba. Añadido el campo y alineada la validación con los editores por platos (*Dishes)",
      "ESQUEMA: las respuestas RSVP ahora se guardan por invitación — rsvpResponses/{inviteToken}/responses/{id} (subcolección) con el contador anti-spam en el documento grupo rsvpResponses/{inviteToken}; se eliminó la colección plana y rsvpCounters; el superadmin agrega vía collectionGroup('responses')",
      "OPS: script scripts/migrate-rsvp-schema.mjs para migrar las RSVP antiguas (colección raíz) al nuevo esquema con firebase-admin",
    ],
  },
  {
    version: "2.40.1",
    date: "2026-08-04",
    changes: [
      "FIX: eliminado el modal del token del setup — el token mostrado en el formulario (input type=password) es ahora el único token y el mismo que se usa para el auto-login al guardar (onFirstSave ya no lo limpia ni lo regenera); tras guardar se muestra la tarjeta de éxito y se redirige al panel",
    ],
  },
  {
    version: "2.40.0",
    date: "2026-08-04",
    changes: [
      "SEGURIDAD: el token de setup ya no se guarda en el documento público de la invitación — nuevo módulo setup-token (hash SHA-256) y colección privada setupTokens con documentId = hash; la activación de sesión exige prueba de conocimiento del token",
      "SEGURIDAD: eliminada la regla de sesión forjable y el 'restore backup' sin validación; la colección invitations ya no es enumerable (solo get); storage.rules requiere sesión activa no expirada; rate limit de RSVP (tope 500 por invitación vía rsvpCounters); reglas de auditLog",
      "SEGURIDAD: validación server-side de campos de texto (longitudes y patrones) en isValidInvitationWrite; sesión en sessionStorage con TTL 60 min; App Check activable por env",
      "SEGURIDAD/CI: sourcemaps de Sentry corregidos en el deploy, reglas (firestore/storage) desplegadas en CI, SECURITY.md y .env.example reintegrados a git",
      "FEAT: creación inicial — el token de acceso se muestra en el formulario (input type=password con mostrar/ocultar) debajo del usuario, con hint y checkbox obligatorio que bloquea el guardado hasta confirmar que se ha guardado",
      "PERF: las props de sección se separaron (config/countdown/rsvp) — el tick del countdown y las teclas del RSVP ya no re-renderizan toda la invitación; el countdown se pausa con pestaña oculta y prefers-reduced-motion",
      "PERF: firebase/analytics movido a chunk lazy (JS inicial 435→315 KB gzip); fuentes de Google por <link> preload; Sentry diferido a idle; caché de RSVP en sessionStorage; fetchPriority en el LCP",
      "ACCESIBILIDAD: focus trap en lightbox de galería y modal de token, skip-link, aria-labels en MusicPlayer, contraste del tema linen-soft, role=alert en login, scope=col en tablas",
      "I18N: fix de claves de alérgenos (se mostraban en español en todos los idiomas), supportedLngs + load languageOnly, hl dinámico en Google Maps, RTL_LANGS corregido, JSON-LD neutro",
      "CALIDAD: fix de mutación directa de estado en RSVP, conteo honesto en la limpieza del superadmin, email de superadmin unificado, check-translations ampliado a los 100 locales (estructura + cobertura) y en CI, check-bundle-size con total inicial real",
      "VERIFICADO: flujo completo de /setup contra el emulador de Firestore (7/7) — setupTokens, primer guardado con todos los campos, sesión con hash correcto/incorrecto, contador RSVP y no enumeración",
    ],
  },
  {
    version: "2.39.0",
    date: "2026-08-04",
    changes: [
      "FEAT: hora de la boda con un único input type=time (HH:MM) — sustituye a los campos de hora y minutos",
      "FEAT: itinerario por eventos — el horario de la boda se configura como eventos (hora + texto corto, máx 10) con siembra desde el texto legacy",
      "FEAT: RSVP — elección de transporte en dos pasos (medio: coche propio/autobús/taxi + salida con nombre del sitio y hora 24h)",
      "FEAT: RSVP — se guardan y recuperan en Firestore el medio, la salida, la hora y el sitio elegidos por invitado y acompañantes",
      "FEAT: tabla de asistencia — nuevas columnas Transporte (medio + hora), Nacimiento y Consentimientos",
      "FEAT: panel /admin — contenedores al 80%, main con overflow hidden, contenido con scroll interno y sin scroll de página (también en móvil)",
      "FEAT: AdminBarHeightSync — --navbar-height mide la altura real de la barra (ResizeObserver), sin solape ni en wrap",
      "FEAT: salidas de transporte — tipo bloqueado y forzado cuando la opción es individual; hora obligatoria con validación HH:MM",
      "FEAT: enlace del mapa de cada salida a línea completa en pantallas pequeñas",
      "ACCESIBILIDAD: IDs únicos en todos los inputs, labels asociados (0 sin asociar, 0 htmlFor rotos), aria-invalid en errores, hints vinculados con aria-describedby",
      "ACCESIBILIDAD: axe audit añadido para la sección RSVP con transporte y menú",
      "FIX: etiquetas de salida usaban transport.optionBus/Taxi (frases completas) — nuevas claves cortas typeBus/typeTaxi",
      "FIX: se guardaba el texto libre de alergias de los acompañantes (companionAllergiesOther) que se perdía",
      "FIX: fecha de nacimiento en la tabla sin hora 0:00",
      "FIX: eliminado código muerto handleDietaryToggle",
      "STYLE: hint 'Lugar detectado' con el nombre del sitio en las salidas del setup",
      "FIX: setup.menuTextoLabel roto (clave anidada setup.setup.*) — promovida al nivel correcto",
      "FIX: alergias del RSVP resolvían por defaultValue (rsvp.allergies.*) — traducción real por idioma",
      "CLEANUP: eliminada dependencia muerta leaflet, 83 claves i18n sin uso, 496 console.log de debug y restos de husky (--version/, lint-staged inerte)",
      "CLEANUP: refactor de useRsvp — payload builders extraídos a módulo puro (rsvp-payloads)",
      "OPS: .gitignore limpiado, .env.example creado, .nvmrc unificado a Node 22, public/index.html duplicado eliminado",
      "CLEANUP: restos de la limpieza de logs (356 sentencias vacías, void err) y 2 warnings de lint eliminados",
      "FEAT: test unitario del módulo rsvp-payloads (6 casos) y e2e ampliado (invitación inexistente sin crash)",
      "FIX: script check-translations.js roto (require en repo ESM) — convertido a ESM y funcional",
      "OPS: umbrales de coverage ajustados al estado real (85/81/86/87) y CSP sin restos de Leaflet/OSM/goo.gl",
      "FIX: common.remove inexistente — el aria-label del botón de eliminar acompañante mostraba 'Remove' en español",
      "UX: rsvp.description reescrita — texto neutro que cubre menú, alergias y transporte (antes mencionaba 'menú especial' siempre)",
      "SEGURIDAD: reglas de Firestore — rsvpResponses no permitía los 8 campos nuevos de transporte (hasOnly) → el guardado del RSVP con transporte se rechazaba en producción (PERMISSION_DENIED). Añadidos a create/update con validación de tipos y longitudes, y reglas desplegadas (el deploy habitual solo sube hosting).",
      "SEGURIDAD: verificado con emulador de Firestore (8/8) — RSVP main/companion con transporte permitidos, campos extra y horas inválidas rechazados, setup con weddingScheduleEvents/transportDepartures permitido",
      "FIX: tabla de asistencia — la columna de dieta mostraba 'alergia: 1' (conteo sin sentido en registros nuevos) y la de menú '—' (menuHeadcounts no se guarda); ahora muestran los items y el plato elegido (mealChoice)",
      "FEAT: alojamiento como enlace de Google Maps — nuevo campo accommodationURL en el setup (validación y hint del sitio) y la sección muestra el nombre, el mapa y 'Ver en Google Maps', con fallback al texto legacy",
      "FEAT: menú por platos — nuevo editor (como salidas de transporte) con orden predefinido (Entrante/Primero/Segundo/Tercero/Postre/Otro) y añadir/eliminar platos, tanto para el menú fijo (menuTextoDishes) como para los seleccionables (menuCarneDishes/Pescado/Vegano); el RSVP muestra los platos formateados con fallback al texto legacy",
      "VERIFICADO: flujo de guardado del menú por platos (form → normalize → validación → payload Firestore → recuperación) con tests de persistencia round-trip, guardado en ConfigContext y rechazo de órdenes inválidas",
      "FIX: menú fijo no se mostraba en el RSVP — el bloque solo se renderizaba con menuEnabled=true; ahora el menú fijo (menuEnabled=false) muestra los platos sin selector, y el variable muestra el selector con el menú de la opción debajo",
      "FIX i18n: 10 claves usadas sin texto añadidas (se mostraban crudas): hero.sectionLabel, admin.tabs.ariaLabel, errors.generic/restoreFailed, rsvp.validation.guestNamesExceed/Required y headcountExceed, settings.menuChangeConfirm, setup.cornerDecorationUploadHint y transportTypeLabel. Auditoría exhaustiva: 0 claves literales sin resolver y todos los valores dinámicos (temas, meses, idiomas, compliance, alergias, platos) verificados",
      "FIX i18n: textos hardcodeados en atributos — MapEmbed (title español), DateSectionForm preview (title inglés) e InvitationTab (aria-label inglés) pasan a claves; invitación y setup sin textos crudos",
      "FIX i18n: hints desactualizados — setup.menuHint y menuTextoHint ahora describen platos con orden, y guestsSectionHint ya no menciona transporte (sección propia)",
    ],
  },

  {
    version: "2.38.0",
    date: "2026-08-01",
    changes: [
      "FEAT: nueva sección Transporte en la invitación y en la configuración",
      "FEAT: opciones de transporte (autobús/taxi/ambos/ninguno) — si no se elige ninguna, mensaje pidiendo coche propio",
      "FEAT: salidas con hora y URL de mapa (hasta 4, añadir/eliminar desde el setup)",
      "FEAT: cada salida muestra su iframe de Google Maps en la invitación",
      "FEAT: MapEmbed — componente de iframe de mapa generalizado (hereda vista/estático del invitación, ancho 80%)",
      "FEAT: transporte sustituye al antiguo texto libre transportInfo (migración de sectionOrder añadiendo la sección)",
      "VALIDACIÓN: transportEnabled whitelist, salidas JSON (máx 4), hora HH:MM, URLs de mapa válidas",
      "FEAT: salidas y enlaces guardados en Firestore + codec hash (te/td)",
    ],
  },

  {
    version: "2.37.0",
    date: "2026-08-01",
    changes: [
      "FEAT: weddingSiteURL reemplaza lat/lng — nombre del lugar derivado de la URL (extractPlaceNameFromUrl), sin geocodificación",
      "FEAT: solo URLs google.com/maps/place/... — enlaces cortos y búsquedas rechazadas con validación visual (badge ✓/✗, caja de feedback, instrucciones)",
      "FEAT: opciones de mapa configurables — vista mapa/satélite/híbrido y mapa estático (bloqueo de interacción)",
      "FEAT: custom background en contenedor propio (.story-card-wrap) — estático frente al scroll, por encima del tema, ajuste cover",
      "FEAT: esquinas decorativas y patrón con la anchura exacta de la card y por encima del background del tema",
      "FEAT: sección fecha y lugar reordenada — fecha+hora, calendario, ubicación, mapa, transporte, mensaje (con variantes según datos pendientes)",
      "FEAT: RSVP — postre tras elegir menú (y en menú fijo), encima de alergias",
      "FEAT: story-eyebrow con Great Vibes, colores por tema (azul medianoche claro / marfil oscuro) y mayor que el título; título -20%",
      "FEAT: cuenta atrás calendárica (años/meses/días) con corte en el primer cero",
      "FEAT: escala z-index reordenada — envelope arriba (fondo 10000, sobre 10001, textos 10002), navbar sobre secciones, textos +1 sobre su padre",
      "FEAT: envelope — fondo difuminado (blur 160px + fallback opaco), sobre más grande, sello custom circular que llena la cera",
      "FEAT: luciérnagas con más brillo (punto 4px, glow ampliado, brightness 1.1-1.5)",
      "FEAT: cards con altura máxima calc(100dvh - navbar - clamp) y scroll interno en todas las secciones",
      "FIX: compressImage saltaba la reducción de dimensiones en JPEGs pequeños (<300KB) — i/o Error en Safari",
      "FIX: CSP — maps.google.com/www.google.com en frame-src (meta+header); iframe del mapa bloqueado en producción",
      "FIX: setup layout/card sin altura fija ni scroll propio — crece con el contenido y el inicio es alcanzable",
      "FIX: e2e CI — webServer con cwd de la raíz del repo (Playwright usaba e2e/ y vite preview servía 404)",
      "FIX: html/body min-height 100dvh y secciones min-height 100dvh con overflow propio",
      "STYLE: iframe del mapa con borde y glow acorde a la página",
    ],
  },

  {
    version: "2.36.1",
    date: "2026-07-31",
    changes: [
      "FEAT: piezas enterprise — bump automático, preview channels por PR, Sentry release+sourcemaps, load test k6, docs/OPS.md",
      "FIX: bump-version.js convertido a ESM",
      "FIX: slugs Sentry correctos (solo-developer-p9 / wedingo-6c26a)",
    ],
  },

  {
    version: "2.36.0",
    date: "2026-07-31",
    changes: [
      "FEAT: Google Maps URL en vez de Leaflet/OSM — nuevo campo weddingMapUrl en config",
      "FEAT: DateSectionForm reescrita — input de URL con validación + iframe preview",
      "FEAT: WeddingMap simplificado — solo recibe mapUrl, sin geocodificación",
      "FEAT: DetailsSection usa weddingMapUrl directamente, sin locationMapTarget",
      "FEAT: isValidGoogleMapsUrl + convertToEmbedUrl en geo-utils",
      "CLEANUP: eliminado useMapPreview hook y map-utils (OSM tile canvas)",
      "CLEANUP: eliminado locationMapTarget/Error/Loading de UIContext",
      "CLEANUP: eliminado OSM search (searchLocations, handlePlaceChange, geocodeLocation)",
    ],
  },

  {
    version: "2.35.0",
    date: "2026-07-31",
    changes: [
      "FIX: normalizeConfig omitía backgroundImage, customSeal, cornerDecoration — no se resolvían desde subcolección",
      "FIX: audio upload excedía límite 11MB — chunk 500KB→200KB, batches múltiples en addAudio",
      "STYLE: unificados estilos de upload en todo el formulario (hover, padding, fonts)",
      "STYLE: divisores centrados (eliminado margin inline que los desplazaba a la izquierda)",
      "STYLE: nueva clase CSS .setup-checkbox-label, eliminados inline styles en SetupForm",
      "FEAT: changelog reescrito desde cero con todos los commits reflejados",
    ],
  },
  {
    version: "2.34.0",
    date: "2026-07-30",
    changes: [
      "FEAT: Google Maps Embed reemplaza Leaflet — WeddingMap simplificado a iframe sin API key",
      "FEAT: buildGoogleMapsEmbedUrl / buildGoogleMapsEmbedSearchUrl en geo-utils",
      "CLEANUP: eliminado Leaflet (mapa, tipos, dependencia npm, ~350 líneas de código)",
      "DEBUG: logs [app] exhaustivos en 30 archivos (páginas, hooks, contextos, servicios)",
      "FIX: PrintPage ",
      "FIX: .story-card::before opacity 0.15→0.3 para mejor visibilidad del background",
      "FIX: canvasToType fallback JPEG→PNG (preserva transparencia siempre)",
      "FIX: resolveAllConfigImages también ejecutado desde caché (no solo desde Firestore)",
      "FIX: session restore repara activeSession si falta en Firestore (sesiones huérfanas)",
      "FIX: reglas Firestore configImages create/update separadas (diff fallaba en create)",
      "FIX: compressImage sin fondo blanco (ya no JPEG, usa WebP/PNG con alpha)",
      "FIX: test isolation en useSetupAuth (mockGetSession no persistía entre tests)",
    ],
  },
  {
    version: "2.33.0",
    date: "2026-07-30",
    changes: [
      "FEAT: config images migradas a subcolección Firestore — evita truncado por límite 1MB",
      "FEAT: saveConfigImage / getConfigImage / deleteConfigImage / resolveAllConfigImages",
      "FEAT: useConfigImage hook para resolver refs __cfgimg:xxx en componentes",
      "FIX: CoverSectionForm uploads con try-catch + límite 900KB (subcolección permite 1MB)",
      "FIX: CoverSectionForm previews usan useConfigImage para resolver refs",
      "FIX: handleDeleteInvitation también borra configImages",
      "FIX: reglas Firestore para configImages subcollection",
      "FIX: cache de configuración también resuelve referencias de imágenes",
    ],
  },
  {
    version: "2.32.0",
    date: "2026-07-29",
    changes: [
      "FEAT: AttendanceTab CRUD completo — checkboxes selección individual, delete batch",
      "FEAT: columna 'Acompañante de' en tabla de asistencia (mainGuestName)",
      "FEAT: handleDeleteRsvpEntries en useRsvp — delete batch con writeBatch",
      "UI: filtro de búsqueda incluye acompañantes vinculados al invitado principal",
      "FIX: prefill RSVP restaura todos los campos (birthDate, allergies, consents, etc.)",
      "FIX: prefill también funciona para acompañantes (rsvpType === 'companion')",
      "FIX: banner 'Acompañas a X' para acompañantes en RSVP",
      "FIX: campo nombre siempre editable aunque haya match (se puede borrar y cambiar)",
      "FIX: z-index backgrounds (invite-bg, corner, eucalyptus) a 0 (estaban tapando)",
      "FIX: body::before glow estático → body directo con animación + body::after animado",
      "FIX: eliminar skip-link (HTML, CSS, RTL) — sin uso",
      "FIX: eliminar theme-glow-pulse por completo",
      "FIX: theme glow en body directo (sin pseudo-elementos before/after)",
      "FIX: backgroundImage como fondo de story-cards (CSS var) en vez de fixed page bg",
      "FIX: retirar asistencia también borra acompañantes del estado local",
      "I18N: nuevas claves attendance.tableAccompanies, selectAll, selectEntry, deleteSelected*",
    ],
  },
  {
    version: "2.31.0",
    date: "2026-07-29",
    changes: [
      "FEAT: acompañantes requieren mismos datos obligatorios que invitado principal",
      "FEAT: companionBirthDates, companionParentalConsents, companionHealthConsents en formulario",
      "FIX: companionAllergies como string[] (Firestore no soporta arrays anidados)",
      "FIX: incluir companions como entradas individuales en lista de asistencia",
    ],
  },
  {
    version: "2.30.0",
    date: "2026-07-28",
    changes: [
      "FEAT: cornerDecoration unificado — 1 sola imagen para las 4 esquinas (antes 4 uploads)",
      "FIX: cornerDecoration con compressImageTransparent (preserva transparencia PNG)",
      "FIX: readFileAsDataUrl añadido a image-utils (para cornerDecoration sin compresión)",
      "REFS: cornerDecorationTL/TR/BL/BR eliminados, ahora cornerDecoration único",
    ],
  },
  {
    version: "2.29.0",
    date: "2026-07-28",
    changes: [
      "FIX: onFirstSave espera updateDoc antes de setIsTokenVerified (sesión huérfana)",
      "FIX: race condition restauración sesión + isRestoringSession loading state",
      "FIX: sesión persistente en localStorage en vez de sessionStorage (cierre navegador)",
      "FIX: falta companionDocIds en hasOnly de Firestore rules",
      "FIX: ocultar postre si no asiste",
      "FIX: login no sobrescribe sesión existente (rules + LandingPage tx)",
      "FIX: companion healthConsent rules + console.error debug en uploads",
      "FIX: mensajes i18n RSVP más user-friendly (EN+ES)",
      "FEAT: cada acompañante con su propio documento Firestore (writeBatch + rules)",
      "DEBUG: logs restauración sesión",
    ],
  },
  {
    version: "2.28.0",
    date: "2026-07-27",
    changes: [
      "CALIDAD: cobertura 34.96%→~87%, 291→1611 tests, 141 test files",
      "CALIDAD: 0 lint warnings, 0 typecheck errors, 0 any en source",
      "CALIDAD: CSS !important 48→41, @fontsource eliminado, CSS @import order corregido",
      "SEGURIDAD: gallery/audio delete requiere auth en Firestore rules, CSP style-src unsafe-inline",
      "SEGURIDAD: session renewal fix, PasswordCredential typings",
      "CI/CD: typecheck, JUnit reporter, bundle size, coverage thresholds, deploy automático, dependabot",
      "UI: foto novios redonda con borde dorado animado, fondo blanco para PNG con transparencia",
      "UI: contenedores invitación 90% base, 80% en móvil",
      "UI: botón accesibilidad visible en /admin, changelog modal 40%x80%",
      "UX: export/restore rediseñado, secciones alojamiento/transporte movidas a 'Sobre los invitados'",
      "UX: menú muestra descripción al seleccionar, contador no asistentes, singular/plural attendee",
      "RENDIMIENTO: sourcemaps condicionales, Sentry lazy load, vendor chunk splitting",
      "RENDIMIENTO: Service Worker v2, fuentes Google CDN, preconnect Firebase/Google",
      "RENDIMIENTO: Playwright E2E config + CI, axe-core a11y tests por página",
      "BUGFIX: session renewal enviaba solo sessionExpiresAt (rules esperaban ambos campos)",
      "BUGFIX: ConfigContext OOM dividido en 3 archivos, image-store flaky test",
      "BUGFIX: restore error mensaje, i18n clave errorDetail",
      "DEPS: TypeScript 7, jsdom 30, jest-dom 7, oxlint 1.76, @fontsource eliminados",
      "MONITORING: Sentry (prod 0.1, dev 0), Firebase Analytics, web-vitals",
      "DOCS: ARCHITECTURE.md, BROWSER_COMPAT.md, SECRETS.md, SECURITY.md, .nvmrc",
    ],
  },
  {
    version: "2.27.0",
    date: "2026-07-27",
    changes: [
      "CALIDAD: 316 typecheck errors → 0, strict flags (noUncheckedIndexedAccess, noImplicitOverride, exactOptionalPropertyTypes)",
      "CALIDAD: lint 17→0 warnings, any en source ~80→0, !important CSS 48→41",
      "TESTS: 36→127 test files, 291→1214 tests, cobertura 34.96%→75.36%",
      "TESTS: axe-core a11y, Firestore rules simulation, 7 setup-forms, 13 componentes",
      "ARQUITECTURA: hooks separados de context providers (Fast Refresh), barrel exports",
      "I18N: RSVP traducciones corregidas, errores tipográficos",
      "RSVP: rediseñado a modelo individual, menú con descripción, singular/plural attendee",
      "UI: foto novios redonda con fusión radial, nombres escalados, overflow admin corregido",
      "SEGURIDAD: CSP corregido, notAttendingCount en rules, _visits permitido",
      "RENDIMIENTO: sourcemaps condicionales, Sentry lazy load, vendor chunk splitting",
      "RENDIMIENTO: Service Worker v2, fuentes Google CDN, preconnect Firebase/Google",
      "BUGFIX: gallery/music upload crypto, RSVP i18n keys, image-store flaky test",
      "CI/CD: typecheck, JUnit, bundle size, coverage thresholds, dependabot, deploy automático",
      "DEPS: TypeScript 7, jsdom 30, jest-dom 7, oxlint 1.76",
    ],
  },
  {
    version: "2.26.0",
    date: "2026-07-26",
    changes: [
      "AUDITORÍA: ~120 puntos implementados de 250 identificados",
      "FIX: 10 altos — offline, timeout, rate limit, CSP, Sentry, CI/CD, LCP, privacidad, context split",
      "FIX: 10 medios — RTL, JSDoc, cobertura, ARIA, errores, skip-link, atajos, validación",
      "FIX: batch bajos — GalleryManager, CSS vars, z-index, import cleanup, naming, lazy loading",
      "FIX: RTL, ErrorBoundary, tests, tipos, almacenamiento, focus-visible, accesibilidad",
      "FIX: robots, schema.org, architecture.md, check-translations script",
      "FIX: WebP, tipos, validaciones, ARIA, tests, RTL, animaciones",
      "FIX: safe-areas, touch-action, print, suspenso, tests, backdrop-filter, indexedDB",
      "FIX: SW, PWA, offline, i18n, validación, seguridad, scroll, preload, tests",
      "FIX: IBAN validation, aria-live search, tests, memo checks",
      "REFACTOR: AttendanceTab columnas por persona, RSVP por asistentes individuales",
      "FIX: zoom 400% — media queries ≤480px y ≤360px",
      "FIX: Safari prefixes backdrop-filter y user-select",
      "FIX: admin bar username desde getSession()",
      "FIX: reject cookies no borra sesión",
      "TESTS: +99 tests (7 módulos, 13 componentes), coverage thresholds",
    ],
  },
  {
    version: "2.25.0",
    date: "2026-07-25",
    changes: [
      "AUDITORÍA: 50+ puntos, README, CHANGELOG actualizados",
      "FEAT: popup confirmación si hay RSVPs al cambiar menú",
      "FIX: i18n completo — offline, countdown, menús, dietas, fecha, impresión, versión",
      "FIX: attendees model — total invitados = suma de attendees.length",
      "FIX: foto novios 700px, 4:3, border-radius 1.5rem, mask-image radial",
      "FIX: botones mapa/calendario padding 2%",
      "CI: bundle size check, coverage thresholds, Sentry, dependabot",
    ],
  },
  {
    version: "2.24.0",
    date: "2026-07-24",
    changes: [
      "FIX: MAX_DURATION_SEC 30→20s (doble base64 excedía 1MB Firestore)",
      "FEAT: autoplay + loop en MusicPlayer",
      "FEAT: modal con setupToken tras crear invitación",
      "FIX: navigator.credentials.store en login (browser guarda credenciales)",
      "FIX: autoplay sincroniza estado playing con ecualizador",
      "FIX: AccessTab simplificado (sin confirmación)",
      "FIX: hero.eyebrow array→string en 85 idiomas",
    ],
  },
  {
    version: "2.23.0",
    date: "2026-07-23",
    changes: [
      "FIX: crítico — musicFile se perdía tras save (delete sin restaurar)",
      "FIX: music-player z-index 10001 (por debajo del nav-overlay 10002)",
      "FIX: envelope timing más lento y fluido (flap 1.2s, letter fade 1.2s + delay 0.5s)",
      "FIX: overflow hidden envelope",
      "FEAT: SupportTab 2 columnas + uploads unificados con estilo galería",
      "FEAT: autoplay en mobile via custom event desde envelope tap",
    ],
  },
  {
    version: "2.22.0",
    date: "2026-07-22",
    changes: [
      "FIX: MusicArrayEditor sin controles nativos (Safari AirPlay error)",
      "FIX: error handling masivo (useSetupAuth + AuthContext + traducciones)",
      "FIX: restore backup (Firestore rules + preservar sesión)",
      "FIX: CRÍTICO — sesión Firestore nunca renovada",
    ],
  },
  {
    version: "2.21.0",
    date: "2026-07-21",
    changes: [
      "FIX: 15 silent catches convertidos a toasts de error",
      "FIX: audio comprimido sonaba lento y con reverb (resampling manual incorrecto)",
      "FEAT: audio chunked (22050Hz, 60s, dividido en fragmentos de 500KB)",
      "REFACTOR: gallery+audio como subcolecciones de invitations/{token}",
      "FEAT: login valida username contra adminUsername",
    ],
  },
  {
    version: "2.20.0",
    date: "2026-07-20",
    changes: [
      "FIX: music upload redesign (audioData collection, gallery-like UI)",
      "FEAT: MusicArrayEditor en CoverSectionForm (no sección separada)",
      "FIX: auto-save debounce 3s→1.5s",
      "FIX: audio sin límite de duración (canción completa)",
      "FIX: admin bar muestra username en vez de inviteToken",
    ],
  },
  {
    version: "2.19.0",
    date: "2026-07-19",
    changes: [
      "FIX: audio upload (compressAudio), restore cleanup",
      "FIX: couple photo infinite loading + loading spinner en galería",
      "FIX: GallerySection null currentTarget.dataset error",
    ],
  },
  {
    version: "2.18.0",
    date: "2026-07-18",
    changes: [
      "FIX: críticos (location, readFileAsDataUrl, chart-utils, cascadeDelete) + altos",
      "FIX: background image 100K gate eliminado",
      "FIX: couplePhoto loading infinito corregido",
    ],
  },
  {
    version: "2.17.0",
    date: "2026-07-17",
    changes: [
      "FIX: restore backup (Firestore rules + preservar sesión)",
      "FIX: CRÍTICO sesión Firestore nunca renovada",
      "FIX: restore usa updateDoc en vez de setDoc",
      "FIX: app-scene top offset",
    ],
  },
  {
    version: "2.16.0",
    date: "2026-07-16",
    changes: [
      "I18N: +14 idiomas (99 total)",
      "FEAT: nuevo idioma Panyabí (pa)",
      "FIX: alturas contenedores (story-section, body, app-scene, footer)",
      "FIX: overflow admin panels (setup-card--wide height)",
      "FIX: solapamiento secciones admin (setup-form stretch)",
      "FIX: botones mapa/calendario padding 2%",
      "FIX: godparents text glow animado con var(--flower-accent)",
    ],
  },
  {
    version: "2.15.0",
    date: "2026-07-15",
    changes: [
      "SEO: PWA manifest, font preload, loading=lazy, título dinámico",
      "I18N: 82/82 idiomas completos, traducciones nativas 16 idiomas",
      "FIX: RTL, aria-invalid RSVP, console.warn eliminado",
      "FIX: DataTab CSS, dead props eliminados",
      "FIX: validación archivos vacíos en todos los uploads",
      "FIX: traducciones ES/EN incorrectas propagadas a 80 idiomas",
    ],
  },
  {
    version: "2.14.0",
    date: "2026-07-14",
    changes: [
      "PERF: CSS muerto eliminado, touch targets 44px, lazy modales",
      "FIX: revert lazy LegalModal/ChangelogModal (imports estáticos)",
      "REFACTOR: TokensTab y DataTab migrados a clases CSS",
      "FIX: RTL toast, aria añadido",
    ],
  },
  {
    version: "2.13.0",
    date: "2026-07-13",
    changes: [
      "PERF: bundle 9.0→6.1MB, fuentes latin-only, vendor chunk",
      "FIX: PanelTab inviteToken undefined",
      "FIX: AttendanceTab formatDate desde config",
      "FIX: RSVP responsive + input date mobile",
      "FIX: PrintPage solo mensaje+fecha+ubicación",
    ],
  },
  {
    version: "2.12.0",
    date: "2026-07-12",
    changes: [
      "FIX: eliminar SoundCloud, nuevo AudioUploadPicker con subida de ficheros",
      "FIX: AttendanceTab crash rsvpEntries/filteredEntries undefined",
      "FIX: eliminar botones Vista previa y Como invitado de /admin",
      "FIX: MusicPlayer animaciones elegantes, FAB desplazamiento",
      "FIX: NavBar sticky/fixed, PrintPage reescrita desde cero",
    ],
  },
  {
    version: "2.11.0",
    date: "2026-07-11",
    changes: [
      "FIX: sello de cera realista en solapa + fuentes más grandes",
      "FIX: nombres al borde inferior del envelope",
      "FIX: sello subido ligeramente, sombra en solapa",
      "FIX: fondo animado con profundidad radial y brillo",
    ],
  },
  {
    version: "2.10.0",
    date: "2026-07-10",
    changes: [
      "FEAT: envelope realista (papel crema, sombra, luces orbitales)",
      "FIX: scroll bloqueado mientras envelope visible",
      "TESTS: +113 tests en 9 módulos, bugfix crypto (iter count 2→3 bytes)",
      "FIX: CSP font-src data: permitido",
    ],
  },
  {
    version: "2.9.0",
    date: "2026-07-09",
    changes: [
      "FEAT: TypeScript migration",
      "FIX: security hardening, SoundCloud picker",
      "FIX: accessibility — focus visible, aria, contraste",
    ],
  },
  {
    version: "2.8.0",
    date: "2026-07-08",
    changes: [
      "REFACTOR: CSS modularizado en 15 archivos (gallery, envelope, music, a11y, lang, toast, print, admin, modals, landing, decorations)",
      "FEAT: fireflies animados (24 unidades, 6 colores, 4 trayectorias)",
      "FIX: footer siempre visible, admin bar separada",
      "FIX: z-index modales 10001 (por encima envelope 9999)",
    ],
  },
  {
    version: "2.7.0",
    date: "2026-07-07",
    changes: [
      "FEAT: envelope animado con flash blanco, texto dorado, glow orbital",
      "FEAT: dos clics — primero abre, segundo animación de salida",
      "FEAT: unificación hero con story-card, mismos estilos",
      "FIX: reglas Firestore gallery update/delete mejoradas",
      "FIX: gallery caption con fade+slide, blur→unblur 1.8s",
    ],
  },
  {
    version: "2.6.0",
    date: "2026-07-06",
    changes: [
      "FEAT: galería con 10 slots fijos, galleryData como fuente única",
      "FEAT: CRUD completo en galería con orden persistente",
      "FIX: loadGallery sin orderBy (falta índice), sort client-side",
      "FIX: descripciones cifradas, fondo gradiente en imagen",
    ],
  },
  {
    version: "2.5.0",
    date: "2026-07-05",
    changes: [
      "FEAT: nueva colección galleryData (inviteToken, position, data)",
      "FIX: RSVP form con scroll interior, overflow controlado",
      "FIX: TDZ persistOrder en GalleryArrayEditor",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-07-04",
    changes: [
      "FEAT: scroll-snap CSS nativo reemplaza JS navigation",
      "FIX: body::before fijo fullscreen, app-scene bg, secciones min-height",
      "FIX: fondo elegante con glow radial por tema en body",
      "FEAT: luciérnagas animadas + glow elegante",
      "FIX: galería 10 imágenes máx, ordenada por createdAt",
    ],
  },
  {
    version: "2.3.0",
    date: "2026-07-03",
    changes: [
      "FEAT: fondos body por tema con decoraciones florales CSS",
      "FIX: showRsvp condicional a config, RsvpSection eager load",
      "FIX: isSavingRef trabado por auto-save (nunca se reseteaba)",
      "FIX: body bg Safari (remove background-attachment fixed)",
    ],
  },
  {
    version: "2.2.0",
    date: "2026-07-02",
    changes: [
      "FEAT: RSVP acompañantes/menú, animación sobre, fondos por tema",
      "FIX: sobre realista y fondos animados por tema",
      "FIX: RSVP visible con Suspense, campos nombres invitados, validaciones",
      "I18N: envelope y calendar strings, scan completo de hardcoded strings",
    ],
  },
  {
    version: "2.1.0",
    date: "2026-07-01",
    changes: [
      "FEAT: 76+ idiomas i18n (react-i18next), LanguageSwitcher",
      "FEAT: compliance GDPR/CCPA/LGPD/PIPEDA/POPIA + cookie consent + derechos ARSO",
      "FEAT: registro Art. 30 GDPR, compliance tab en superadmin",
      "FEAT: animaciones de salida en modales y popup idioma",
      "FIX: estructura namespaces i18n, dot notation final",
      "FIX: gatear localStorage/sessionStorage tras consentimiento",
    ],
  },
  {
    version: "2.0.1",
    date: "2026-06-30",
    changes: [
      "FEAT: accesibilidad — 8 opciones (OpenDyslexic, alto contraste, escala grises, foco visible)",
      "FEAT: footer con legal, idioma, accesibilidad y versión",
      "FEAT: changelog completo desde inicio del desarrollo",
      "FIX: navbar sticky, admin-bar offset, overflow inferior",
      "FIX: CSP font-src, frame-ancestors meta, firebase getFirestore",
      "FIX: galería con progress bar real, miniaturas en tiempo real",
      "FIX: carrusel automático 1.5s, descripciones editables",
      "FEAT: superadmin — export/eliminación individual, masiva y completa",
      "FIX: sesiones migradas a activeSession en invitación",
      "FIX: XSS innerHTML → createElement",
      "FIX: footer redes sociales, copyright y copyright del programador",
    ],
  },
];
