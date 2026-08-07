import { initializeApp } from "firebase/app";
import {
  collection,
  collectionGroup,
  doc,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import type { Auth } from "firebase/auth";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
// Persistencia local en IndexedDB: la invitación ya visitada se lee offline
// (y las imágenes/audio cifrados se descifran localmente). La limpieza se
// gestiona en el flujo de "Eliminar mis datos".
//
// DECISIÓN (evaluado v2.95.20): multi-tab se mantiene a propósito. El
// single-tab ahorra ~3.4 kB gzip del bundle total (158.1 → 154.8 kB en
// vendor-firebase), un 2% del chunk y <1% de la app, pero pierde la
// sincronización de caché entre pestañas: el admin que edita en una pestaña
// mientras la invitación pública se abre en otra (o se contesta el RSVP)
// vería datos obsoletos. El coste no justifica la pérdida de coherencia.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

/**
 * Instancia de Firebase Auth con carga diferida.
 * Auth solo se usa en las rutas de superadmin; cargarlo al arranque
 * añadiría el SDK completo (decenas de KB gzip) a la ruta crítica de la
 * invitación pública. Se memoiza la promesa para un único import.
 */
let authPromise: Promise<Auth> | null = null;
export function getAuthInstance(): Promise<Auth> {
  if (!authPromise) {
    authPromise = import("firebase/auth").then(({ getAuth }) => getAuth(app));
  }
  return authPromise;
}

/**
 * Instancia de Firebase Storage con carga diferida.
 * La app guarda las imágenes como base64 en Firestore; Storage solo se usa
 * puntualmente en el panel de superadmin para limpiar archivos huérfanos.
 */
let storagePromise: Promise<FirebaseStorage> | null = null;
export function getStorageInstance(): Promise<FirebaseStorage> {
  if (!storagePromise) {
    storagePromise = import("firebase/storage").then(({ getStorage }) => getStorage(app));
  }
  return storagePromise;
}

// App Check: se activa automáticamente si se define VITE_APPCHECK_SITE_KEY
// (reCAPTCHA Enterprise) en el entorno. El import es dinámico y solo ocurre
// si hay clave, evitando arrastrar el SDK de app-check en la ruta crítica
// de la invitación pública. Mantener desactivado sin la clave evita
// bloquear todas las peticiones de la app.
try {
  const siteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
  if (siteKey) {
    void import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    });
  }
} catch {
  // App Check es opcional; sin clave no se inicializa.
}

export function invitationDocRef(token: string) {
  return doc(db, "invitations", token);
}
export const INVITATIONS_COLLECTION_REF = collection(db, "invitations");
// Todas las respuestas RSVP (collectionGroup "responses") para agregaciones
// del superadmin. Las respuestas viven en la subcolección por invitación.
export const RSVP_RESPONSES_GROUP = collectionGroup(db, "responses");
// Subcolección de respuestas por invitación: rsvpResponses/{inviteToken}/responses.
export const rsvpByInviteRef = (token: string) => collection(db, "rsvpResponses", token, "responses");
// Referencia a una respuesta concreta dentro de la subcolección de su invitación.
export const rsvpResponseRef = (token: string, id: string) => doc(db, "rsvpResponses", token, "responses", id);
