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
  weddingLatitude: string;
  weddingLongitude: string;
  weddingSchedule: string;
  weddingDressCode: string;
  couplePhoto: string;
  musicFile: string;
  musicUrl: string;
  sectionOrder: string;
  hiddenSections: string;
  storyText: string;
  giftsInfo: string;
  bankInfo: string;
  accommodationInfo: string;
  transportInfo: string;
  godparent1: string;
  godparent2: string;
  kidsPolicy: string;
  menuEnabled: string;
  menuTexto: string;
  menuCarne: string;
  menuPescado: string;
  menuVegano: string;
  menuPostre: string;
  _activeSetupToken?: string;
  _visits?: number;
  [key: string]: unknown;
}
