export interface GalleryImage {
  id: string;
  url: string;
  description?: string;
  position?: number;
  originalName?: string;
  originalSize?: number;
}

export interface SlotState {
  id: string | null;
  url: string;
  description: string;
  originalName: string;
  originalSize: number;
}

export interface InvitationConfig {
  adminUsername: string;
  /** Número de invitados esperados (0..1000 como string; "" = sin definir). */
  expectedGuests: string;
  firstName: string;
  secondName: string;
  inviteMessage: string;
  theme: string;
  weddingDay: string;
  weddingMonth: string;
  weddingYear: string;
  weddingHour: string;
  weddingMinute: string;
  weddingPlace: string;
  weddingSiteURL: string;
  /** Redes sociales de los novios (opcional). */
  instagramUrl: string;
  facebookUrl: string;
  weddingMapView: string;
  weddingMapStatic: string;
  detailsMapMode: string;
  transportMapMode: string;
  accommodationMapMode: string;
  weddingScheduleEvents: string;
  weddingDressCode: string;
  weddingDressCodeEnabled?: string;
  weddingDressCodeCustom: string;
  couplePhoto: string;
  couplePhotoEnabled?: string;
  musicFile: string;
  musicFileEnabled?: string;
  sectionOrder: string;
  hiddenSections: string;
  /** Animaciones desactivadas por los novios (ids separados por comas). */
  disabledAnimations?: string;
  storyText: string;
  storyTextEnabled?: string;
  giftsInfo: string;
  giftsInfoEnabled?: string;
  bankInfo: string;
  bankInfoEnabled?: string;
  accommodationURL: string;
  accommodationURLEnabled?: string;
  transportEnabled: string;
  transportDepartures: string;
  godparent1: string;
  godparent2: string;
  godparentsEnabled?: string;
  kidsPolicy: string;
  kidsPolicyEnabled?: string;
  inviteMessageEnabled?: string;
  weddingSiteURLEnabled?: string;
  instagramEnabled?: string;
  facebookEnabled?: string;
  backgroundImageEnabled?: string;
  customSealEnabled?: string;
  cornerDecorationEnabled?: string;
  menuEnabled: string;
  menuTextoDishes: string;
  menuCarneDishes: string;
  menuPescadoDishes: string;
  menuVeganoDishes: string;
  backgroundImage?: string;
  customSeal?: string;
  cornerDecoration?: string;
  /** Fecha límite para confirmar asistencia (ISO yyyy-mm-dd) + habilitado. */
  rsvpDeadline?: string;
  rsvpDeadlineEnabled?: string;
  rsvpThanks?: string;
  verified?: string;
  adminNotes?: string;
  manualExpiry?: string;
  /** Reacciones a la invitación (❤️🎉😂) habilitadas. */
  reactionsEnabled?: string;
  /** Modo sorpresa: "true" oculta las secciones en surpriseSections hasta el
   *  día del evento (la fecha inválida deja todo oculto, nunca se filtra). */
  surpriseMode?: string;
  /** Secciones sorpresa (claves separadas por coma) que solo se revelan el
   *  día del evento si surpriseMode === "true". */
  surpriseSections?: string;
  /** Idioma por defecto de la invitación ("es" | "en" | "" = automático).
   *  Se aplica al invitado SOLO si no ha elegido idioma en su dispositivo. */
  language?: string;
  /** Prueba social en vivo: mostrar cuántos han confirmado en la portada. */
  liveConfirmedEnabled?: string;
  /** Mostrar la LISTA de personas que ya han confirmado en la portada.
   *  Solo se publican nombres (doblemente opt-in: quien confirma acepta y la
   *  pareja activa el toggle); "true" visible, "false" (o ausente) oculta. */
  showConfirmedPeople?: string;
  /** Lista de regalos (JSON de items) + habilitada. */
  giftsListEnabled?: string;
  giftList?: string;
  /** Encuesta de compartir coche. */
  rideShareEnabled?: string;
  /** Vídeo de bienvenida de los novios (URL MP4). */
  welcomeVideo?: string;
  /** Habilita la sección del vídeo de bienvenida. */
  welcomeVideoEnabled?: string;
  /** Muro de dedicatorias de los invitados. */
  notesEnabled?: string;
  /** Encuesta de música para el DJ. */
  musicPollEnabled?: string;
  voiceNotesEnabled?: string;
  dayPhotosEnabled?: string;
  mailboxEnabled?: string;
  toastsEnabled?: string;
  venueMapEnabled?: string;
  /** Trivia de la pareja. */
  triviaEnabled?: string;
  trivia?: string;
  _activeSetupToken?: string;
  _visits?: number;
  [key: string]: unknown;
}

export interface RsvpEntry {
  id: string;
  guestName: string;
  attendance: "yes" | "no";
  companions: number;
  dietaryInfo: string;
  mealChoice?: string;
  note?: string;
  submittedAt: string;
}

export interface Attendee {
  name: string;
  menu: "carne" | "pescado" | "vegano" | "";
  allergies: string[];
}
