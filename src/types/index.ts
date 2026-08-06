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

export interface ToastState {
  id: string;
  type: "success" | "error" | "warning" | "progress";
  message: string;
  progress?: number;
  exiting?: boolean;
}

export interface InvitationConfig {
  adminUsername: string;
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
  weddingDressCodeCustom: string;
  couplePhoto: string;
  musicFile: string;
  sectionOrder: string;
  hiddenSections: string;
  storyText: string;
  giftsInfo: string;
  bankInfo: string;
  accommodationURL: string;
  transportEnabled: string;
  transportDepartures: string;
  godparent1: string;
  godparent2: string;
  kidsPolicy: string;
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
  /** Reacciones a la invitación (❤️🎉😂) habilitadas. */
  reactionsEnabled?: string;
  /** Lista de regalos (JSON de items) + habilitada. */
  giftsListEnabled?: string;
  giftList?: string;
  /** Encuesta de compartir coche. */
  rideShareEnabled?: string;
  /** Vídeo de bienvenida de los novios (URL MP4). */
  welcomeVideo?: string;
  /** Muro de dedicatorias de los invitados. */
  notesEnabled?: string;
  /** Encuesta de música para el DJ. */
  musicPollEnabled?: string;
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

export interface SectionProps {
  style?: React.CSSProperties;
  className?: string;
  [key: string]: unknown;
}

export interface EnvelopeProps {
  onOpen: () => void;
  firstName: string;
  secondName: string;
}

export interface MusicPlayerProps {
  musicUrl: string;
}

export interface ThemeColors {
  bg: string;
  accent: string;
}

export type AsyncFunction<T> = () => Promise<T>;

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

export interface Attendee {
  name: string;
  menu: "carne" | "pescado" | "vegano" | "";
  allergies: string[];
}

export interface MenuOption {
  key: "carne" | "pescado" | "vegano";
  label: string;
  desc: string;
}

export interface FilterState {
  searchQuery: string;
  attendanceFilter: "all" | "yes" | "no";
  page: number;
  pageSize: number;
}

export interface CalendarData {
  formattedDate: string;
  formattedTime: string;
  calendarLink: string;
}
