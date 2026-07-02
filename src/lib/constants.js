export const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
export const COMPRESSED_TARGET_BYTES = 500 * 1024;

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
];

export const THEME_VALUES = new Set(THEME_OPTIONS.map((t) => t.value));

export const THEME_GROUPS = [
  { value: "claros", label: "Temas claros" },
  { value: "oscuros", label: "Temas oscuros" },
];

export const STORY_SECTION_ORDER = ["hero", "details", "info", "rsvp"];

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
};
