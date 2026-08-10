export const APP_VERSION = "2.95.71";

export const MAX_INVITE_MESSAGE_LENGTH = 500;
export const MAX_DRESS_CODE_CUSTOM_LENGTH = 500;
export const MAX_SCHEDULE_EVENTS = 10;
export const MAX_SCHEDULE_EVENT_TEXT = 60;
/* Emojis sugeridos para cada evento del itinerario. Se muestran en un
   selector (select) dentro del editor: la primera opción (vacía) significa
   "sin emoji". Se eligieron emojis sencillos (1-2 code units) para que
   quepan en la normalización (máx 8 chars) y sean representativos de una
   celebración. */
export const SCHEDULE_EVENT_EMOJIS = [
  "💍",
  "⛪",
  "🌸",
  "💌",
  "🔔",
  "🥂",
  "🍾",
  "🍸",
  "🍢",
  "🍽️",
  "🍰",
  "🎂",
  "💃",
  "🕺",
  "🎶",
  "🎉",
  "🪩",
  "🎆",
  "📸",
  "❤️",
  "✨",
  "🌿",
  "🌙",
  "🎁",
] as const;
export const MAX_MENU_DISHES = 20;
export const MAX_MENU_DISH_TEXT = 200;
export const MENU_DISH_ORDERS = ["entrante", "primero", "segundo", "tercero", "postre", "otro"];

export const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;

export const MONTH_OPTIONS = [
  { value: "enero", label: "Enero" },
  { value: "febrero", label: "Febrero" },
  { value: "marzo", label: "Marzo" },
  { value: "abril", label: "Abril" },
  { value: "mayo", label: "Mayo" },
  { value: "junio", label: "Junio" },
  { value: "julio", label: "Julio" },
  { value: "agosto", label: "Agosto" },
  { value: "septiembre", label: "Septiembre" },
  { value: "octubre", label: "Octubre" },
  { value: "noviembre", label: "Noviembre" },
  { value: "diciembre", label: "Diciembre" },
];

export const MONTH_VALUE_TO_NUMBER: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export const THEME_OPTIONS = [
  { value: "golden", label: "Dorado clásico", hint: "Elegante y luminoso, con acentos dorados.", group: "claros" },
  { value: "forest", label: "Eucalipto fresco", hint: "Natural y sobrio con verdes suaves.", group: "claros" },
  { value: "rose", label: "Romántico rosado", hint: "Cálido y delicado, con matices rosados.", group: "claros" },
  {
    value: "linen-soft",
    label: "Lino suave",
    hint: "Claro y neutro, con una presencia serena y atemporal.",
    group: "claros",
  },
  {
    value: "blush-pearl",
    label: "Perla rosada",
    hint: "Suave y romántico, con tonos rosados perlados.",
    group: "claros",
  },
  {
    value: "lavender-mist",
    label: "Brisa lavanda",
    hint: "Fresco y sereno, con matices lavanda y malva.",
    group: "claros",
  },
  {
    value: "champagne-bubble",
    label: "Burbuja champán",
    hint: "Luminoso y festivo, con destellos dorados cálidos.",
    group: "claros",
  },
  {
    value: "amber-night",
    label: "Noche ámbar",
    hint: "Oscuro y elegante, con destellos ámbar y dorados.",
    group: "oscuros",
  },
  {
    value: "onyx-gold",
    label: "Ónix dorado",
    hint: "Profundo y sofisticado, con oro intenso sobre fondo oscuro.",
    group: "oscuros",
  },
  {
    value: "midnight-royal",
    label: "Medianoche real",
    hint: "Azul muy oscuro con dorado intenso y presencia solemne.",
    group: "oscuros",
  },
  {
    value: "burgundy-velvet",
    label: "Terciopelo burdeos",
    hint: "Cálido y envolvente, con vino tinto y destellos dorados.",
    group: "oscuros",
  },
  {
    value: "sapphire-night",
    label: "Noche zafiro",
    hint: "Azul profundo con acentos plateados y presencia serena.",
    group: "oscuros",
  },
  {
    value: "emerald-grove",
    label: "Esmeralda bosque",
    hint: "Verde profundo natural con matices dorados y elegantes.",
    group: "oscuros",
  },
  {
    value: "plum-twilight",
    label: "Crepúsculo ciruela",
    hint: "Púrpura intenso con destellos rosados y románticos.",
    group: "oscuros",
  },
  {
    value: "rainbow",
    label: "Arcoíris",
    hint: "Celebración del amor diverso con los colores del arcoíris.",
    group: "lgtbiq+",
  },
  { value: "trans", label: "Trans", hint: "Azul, rosa y blanco en homenaje a la bandera trans.", group: "lgtbiq+" },
  {
    value: "nonbinary",
    label: "No binario",
    hint: "Amarillo, blanco, morado y negro por la bandera no binaria.",
    group: "lgtbiq+",
  },
  { value: "lesbian", label: "Lesbian Pride", hint: "Naranja, blanco y rosa de la bandera lésbica.", group: "lgtbiq+" },
  { value: "bi", label: "Bisexual", hint: "Rosa, morado y azul de la bandera bi.", group: "lgtbiq+" },
  { value: "pan", label: "Pansexual", hint: "Rosa, amarillo y azul de la bandera pan.", group: "lgtbiq+" },
  { value: "ace", label: "Asexual", hint: "Negro, gris, blanco y morado de la bandera asexual.", group: "lgtbiq+" },
];

export const THEME_VALUES = new Set(THEME_OPTIONS.map((t) => t.value));

export const THEME_PREVIEW_COLORS: Record<string, { accent: string; bg: string }> = {
  golden: { accent: "#d8b24a", bg: "#2a2418" },
  forest: { accent: "#97c87a", bg: "#1a3d2e" },
  rose: { accent: "#efb0c7", bg: "#4e1a2c" },
  "linen-soft": { accent: "#c8ad7a", bg: "#5c4430" },
  "blush-pearl": { accent: "#e8a0b4", bg: "#4a1e30" },
  "lavender-mist": { accent: "#b8a0d8", bg: "#2e1848" },
  "champagne-bubble": { accent: "#d4b86a", bg: "#52401e" },
  "amber-night": { accent: "#ddb24b", bg: "#1e140e" },
  "onyx-gold": { accent: "#d8ad43", bg: "#12100c" },
  "midnight-royal": { accent: "#e0b84b", bg: "#0a102a" },
  "burgundy-velvet": { accent: "#c87870", bg: "#2a0c14" },
  "sapphire-night": { accent: "#8898cc", bg: "#080c20" },
  "emerald-grove": { accent: "#70b890", bg: "#041c10" },
  "plum-twilight": { accent: "#c088c8", bg: "#1c0824" },
  rainbow: { accent: "#ff6b6b", bg: "#1a1a2e" },
  trans: { accent: "#88c8e8", bg: "#1a2a3e" },
  nonbinary: { accent: "#f0e060", bg: "#1a1a2a" },
  lesbian: { accent: "#e87860", bg: "#2a1a1e" },
  bi: { accent: "#c060c0", bg: "#1a122a" },
  pan: { accent: "#60c8e8", bg: "#1a1828" },
  ace: { accent: "#b088c8", bg: "#121212" },
};

export const THEME_GROUPS = [
  { value: "claros", label: "Temas claros" },
  { value: "oscuros", label: "Temas oscuros" },
  { value: "lgtbiq+", label: "LGTBIQ+" },
];

export const STORY_SECTION_ORDER = [
  "hero",
  "details",
  "transport",
  "info",
  "story",
  "gallery",
  "gifts",
  "accommodation",
  "extras",
  "rsvp",
];

export const PRIVACY_POLICY_VERSION = "2026-08-10";

export const MAX_YEARS_AHEAD = 4;
export const INVITE_CACHE_TTL_MS = 120000;
/** Duración de la sesión de admin (local y Firestore): 60 minutos. */
export const SESSION_DURATION_MS = 60 * 60 * 1000;
/** Tope anti-spam de respuestas RSVP por invitación (regla Firestore). */
export const RSVP_MAX_RESPONSES = 500;
/** Tope de incremento de visitas por petición (regla Firestore). */
export const VISITS_MAX_INCREMENT = 10;
/** Límite de audio por chunk cifrado (batch < 10 MiB). */
export const AUDIO_CHUNK_SIZE_BYTES = 200 * 1024;
/** Formato de id de invitación en la URL: alineado con la regla de Firestore
 *  (^[A-Za-z0-9]{10}$): la app solo consulta ids que la regla puede crear. */
export const TOKEN_ROUTE_REGEX = /^[a-zA-Z0-9]{10}$/;
export const SPECIAL_SECTIONS = ["menu", "godparents"];
export const MAX_USERNAME_LENGTH = 50;
export const MAX_LONG_TEXT_LENGTH = 2000;

export const defaultConfig = {
  adminUsername: "",
  firstName: "",
  secondName: "",
  inviteMessage: "",
  inviteMessageEnabled: "false",
  weddingPlace: "",
  weddingSiteURL: "",
  weddingSiteURLEnabled: "false",
  instagramUrl: "",
  instagramEnabled: "false",
  facebookUrl: "",
  facebookEnabled: "false",
  weddingMapView: "roadmap",
  weddingMapStatic: "false",
  detailsMapMode: "iframe",
  transportMapMode: "iframe",
  accommodationMapMode: "iframe",
  weddingDay: "",
  weddingMonth: "",
  weddingYear: "",
  weddingHour: "",
  weddingMinute: "",
  weddingScheduleEvents: "",
  weddingDressCode: "",
  weddingDressCodeEnabled: "false",
  weddingDressCodeCustom: "",

  theme: "golden",
  couplePhoto: "",
  couplePhotoEnabled: "false",
  backgroundImage: "",
  backgroundImageEnabled: "false",
  customSeal: "",
  customSealEnabled: "false",
  cornerDecoration: "",
  cornerDecorationEnabled: "false",

  sectionOrder: STORY_SECTION_ORDER.join(","),
  hiddenSections: "",
  storyText: "",
  storyTextEnabled: "false",
  giftsInfo: "",
  giftsInfoEnabled: "false",
  bankInfo: "",
  bankInfoEnabled: "false",
  accommodationURL: "",
  accommodationURLEnabled: "false",
  transportEnabled: "none",
  transportDepartures: "",
  godparent1: "",
  godparent2: "",
  godparentsEnabled: "false",
  musicFile: "",
  musicFileEnabled: "false",
  kidsPolicy: "",
  kidsPolicyEnabled: "false",
  menuEnabled: "false",
  menuTextoDishes: "",
  menuCarneDishes: "",
  menuPescadoDishes: "",
  menuVeganoDishes: "",
  rsvpDeadline: "",
  rsvpDeadlineEnabled: "false",
  reactionsEnabled: "false",
  giftsListEnabled: "false",
  giftList: "[]",
  rideShareEnabled: "false",
  welcomeVideo: "",
  welcomeVideoEnabled: "false",
  notesEnabled: "false",
  musicPollEnabled: "false",
  triviaEnabled: "false",
  trivia: "[]",
  privacyPolicyVersion: "",
  // ── Campos de superadmin (no editables por el admin normal) ──
  // Mensaje de agradecimiento mostrado tras confirmar el RSVP (config del admin).
  rsvpThanks: "",
  // Sello de verificación visible en la portada (solo superadmin).
  verified: "false",
  // Notas internas del superadmin (nunca visibles en la invitación).
  adminNotes: "",
  // Fecha de expiración manual (ISO yyyy-mm-dd): la invitación se considera
  // expirada si la tiene fijada y ya pasó (además del default de 12 meses).
  manualExpiry: "",
  // Estado de la invitación (F3-2): active | review | blocked.
  status: "active",
  // Etiquetas/categorías del superadmin (F3-5), separadas por comas.
  tags: "",
  // Aforo máximo de confirmaciones (F3-7, "" = sin límite).
  rsvpCapacity: "",
  // Firma digital extra en el RSVP (F3-8).
  rsvpSignatureEnabled: "false",
  // F-rec: contacto opcional del invitado (teléfono/email con consentimiento).
  rsvpContactEnabled: "false",
};
