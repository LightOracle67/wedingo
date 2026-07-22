import { initializeApp } from "firebase/app";
import { collection, doc, initializeFirestore, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const auth = getAuth(app);
export const storage = getStorage(app);

// App Check deshabilitado temporalmente porque los tokens de ReCaptcha Enterprise
// exceden el límite de URI (414) al combinarse con los parámetros de sesión de Firebase Hosting.

export function invitationDocRef(token) {
  return doc(db, "invitations", token);
}
export const INVITATIONS_COLLECTION_REF = collection(db, "invitations");
export const RSVP_COLLECTION_REF = collection(db, "rsvpResponses");
export const rsvpByInviteRef = (token) => query(RSVP_COLLECTION_REF, where("inviteToken", "==", token));


