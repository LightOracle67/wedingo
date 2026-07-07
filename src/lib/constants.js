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

export const MONTH_VALUE_TO_NUMBER = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

export const THEME_OPTIONS = [
  { value: "golden", label: "Dorado clásico", hint: "Elegante y luminoso, con acentos dorados.", group: "claros" },
  { value: "forest", label: "Eucalipto fresco", hint: "Natural y sobrio con verdes suaves.", group: "claros" },
  { value: "rose", label: "Romántico rosado", hint: "Cálido y delicado, con matices rosados.", group: "claros" },
  { value: "linen-soft", label: "Lino suave", hint: "Claro y neutro, con una presencia serena y atemporal.", group: "claros" },
  { value: "blush-pearl", label: "Perla rosada", hint: "Suave y romántico, con tonos rosados perlados.", group: "claros" },
  { value: "lavender-mist", label: "Brisa lavanda", hint: "Fresco y sereno, con matices lavanda y malva.", group: "claros" },
  { value: "champagne-bubble", label: "Burbuja champán", hint: "Luminoso y festivo, con destellos dorados cálidos.", group: "claros" },
  { value: "amber-night", label: "Noche ámbar", hint: "Oscuro y elegante, con destellos ámbar y dorados.", group: "oscuros" },
  { value: "onyx-gold", label: "Ónix dorado", hint: "Profundo y sofisticado, con oro intenso sobre fondo oscuro.", group: "oscuros" },
  { value: "midnight-royal", label: "Medianoche real", hint: "Azul muy oscuro con dorado intenso y presencia solemne.", group: "oscuros" },
  { value: "burgundy-velvet", label: "Terciopelo burdeos", hint: "Cálido y envolvente, con vino tinto y destellos dorados.", group: "oscuros" },
  { value: "sapphire-night", label: "Noche zafiro", hint: "Azul profundo con acentos plateados y presencia serena.", group: "oscuros" },
  { value: "emerald-grove", label: "Esmeralda bosque", hint: "Verde profundo natural con matices dorados y elegantes.", group: "oscuros" },
  { value: "plum-twilight", label: "Crepúsculo ciruela", hint: "Púrpura intenso con destellos rosados y románticos.", group: "oscuros" },
  { value: "rainbow", label: "Arcoíris", hint: "Celebración del amor diverso con los colores del arcoíris.", group: "lgtbiq+" },
  { value: "trans", label: "Trans", hint: "Azul, rosa y blanco en homenaje a la bandera trans.", group: "lgtbiq+" },
  { value: "nonbinary", label: "No binario", hint: "Amarillo, blanco, morado y negro por la bandera no binaria.", group: "lgtbiq+" },
  { value: "lesbian", label: "Lesbian Pride", hint: "Naranja, blanco y rosa de la bandera lésbica.", group: "lgtbiq+" },
  { value: "bi", label: "Bisexual", hint: "Rosa, morado y azul de la bandera bi.", group: "lgtbiq+" },
  { value: "pan", label: "Pansexual", hint: "Rosa, amarillo y azul de la bandera pan.", group: "lgtbiq+" },
  { value: "ace", label: "Asexual", hint: "Negro, gris, blanco y morado de la bandera asexual.", group: "lgtbiq+" },
];

export const THEME_VALUES = new Set(THEME_OPTIONS.map((t) => t.value));

export const THEME_PREVIEW_COLORS = {
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

export const STORY_SECTION_ORDER = ["hero", "details", "info", "story", "gallery", "gifts", "accommodation", "rsvp"];

export const SECTION_LABELS = {
  hero: "Portada",
  details: "Lugar, Fecha y Hora",
  info: "Sobre los invitados",
  story: "Nuestra historia",
  gifts: "Regalos",
  accommodation: "Alojamiento",
  gallery: "Galería",
  rsvp: "Confirmación",
};

export const SECTION_MOVABLE = {
  hero: false,
  details: true,
  info: true,
  story: true,
  gifts: true,
  accommodation: true,
  gallery: true,
  rsvp: true,
};

export const defaultConfig = {
  adminUsername: "",
  firstName: "",
  secondName: "",
  inviteMessage: "",
  weddingPlace: "",
  weddingLatitude: "",
  weddingLongitude: "",
  weddingDay: "",
  weddingMonth: "",
  weddingYear: "",
  weddingHour: "",
  weddingMinute: "",
  weddingSchedule: "",
  weddingDressCode: "",

  theme: "golden",
  backgroundImage: "",
  backgroundImageLabel: "",
  backgroundImageSource: "",
  backgroundImageStorage: "",

  couplePhoto: "",
  couplePhotoStorage: "",

  sectionOrder: STORY_SECTION_ORDER.join(","),
  hiddenSections: "",
  storyText: "",
  giftsInfo: "",
  bankInfo: "",
  accommodationInfo: "",
  transportInfo: "",
  godparent1: "",
  godparent2: "",
  musicUrl: "",
  galleryImages: "",
  kidsPolicy: "",
  menuEnabled: "false",
  menuTexto: "",
  menuCarne: "",
  menuPescado: "",
  menuVegano: "",
  menuPostre: "",
};
