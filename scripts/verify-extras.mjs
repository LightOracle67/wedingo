import { initializeApp } from "firebase/app";
import { initializeFirestore, connectFirestoreEmulator, doc, setDoc, getDoc } from "firebase/firestore";
import { createHash } from "node:crypto";

const app = initializeApp({ projectId: "wedingo-6c26a", apiKey: "x" });
const db = initializeFirestore(app, {});
connectFirestoreEmulator(db, "127.0.0.1", 8080);

const token = "abcdefghij";
const hash = createHash("sha256").update("TOKEN123").digest("hex");

// Payload real que envía la app (normalizeConfig añade siempre estos campos).
const config = {
  firstName: "Ana", secondName: "Luis", theme: "golden",
  weddingDay: "15", weddingMonth: "junio", weddingYear: "2026", weddingHour: "18", weddingMinute: "30",
  adminUsername: "ana",
  rsvpDeadline: "", rsvpDeadlineEnabled: "false", reactionsEnabled: "false",
  giftsListEnabled: "false", giftList: "[]", rideShareEnabled: "false",
  welcomeVideo: "", notesEnabled: "false", musicPollEnabled: "false",
  triviaEnabled: "false", trivia: "[]",
};

try {
  await setDoc(doc(db, "setupTokens", hash), { inviteToken: token, createdAt: new Date().toISOString() });
  await setDoc(doc(db, "invitations", token), config);
  console.log("CREATE config (campos vacíos): OK");
  // Se activa la sesión del admin (como el login real) para poder actualizar.
  await setDoc(doc(db, "invitations", token), {
    ...config,
    activeSession: new Date(), sessionExpiresAt: new Date(Date.now() + 3600000),
    setupTokenHash: hash,
  }, { merge: true });
  await setDoc(doc(db, "invitations", token), { ...config, inviteMessage: "Hola" }, { merge: true });
  console.log("UPDATE config (merge): OK");
  const snap = await getDoc(doc(db, "invitations", token));
  console.log("Recuperado:", JSON.stringify(snap.data().rsvpDeadline), "/", JSON.stringify(snap.data().welcomeVideo));
  console.log("\nTODO OK");
  process.exit(0);
} catch (e) { console.error("ERROR:", e?.code || e?.message); process.exit(1); }
