import { getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, invitationDocRef } from "./firebase";
import { defaultConfig } from "./constants";
import { firestoreSessionExpiry } from "./sessionVars";

export async function activateSessionWithToken(
  inviteToken: string,
  enteredToken: string,
  onSessionExists?: () => boolean,
): Promise<void> {
  const inviteRef = invitationDocRef(inviteToken);
  const inviteSnapActive = await getDoc(inviteRef);

  if (inviteSnapActive.exists() && inviteSnapActive.data().activeSession && onSessionExists) {
    if (!onSessionExists()) return;
  }

  if (inviteSnapActive.exists() && inviteSnapActive.data()._activeSetupToken !== enteredToken) {
    throw new Error("Token no válido");
  }

  await runTransaction(db, async (transaction) => {
    const inviteSnap = await transaction.get(inviteRef);
    if (!inviteSnap.exists()) {
      transaction.set(inviteRef, { ...defaultConfig, activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
    } else {
      if (inviteSnap.data()._activeSetupToken !== enteredToken) throw new Error("Token no válido");
      transaction.update(inviteRef, { activeSession: serverTimestamp(), sessionExpiresAt: firestoreSessionExpiry() });
    }
  });
}
