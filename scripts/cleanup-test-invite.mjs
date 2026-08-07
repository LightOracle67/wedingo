import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const env = Object.fromEntries(readFileSync(".env", "utf8").split("\n").map((l) => l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const app = initializeApp({ apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: env.VITE_FIREBASE_APP_ID });
const db = getFirestore(app);
const inviteToken = "jg3n96A6Re";
const hash = createHash("sha256").update("HYQL4HD83BGZ52QA6F45QERVLWCYKRD9").digest("hex");
try {
  const snap = await getDoc(doc(db, "invitations", inviteToken));
  console.log("Antes → inviteMessage:", JSON.stringify(snap.data()?.inviteMessage));
  await updateDoc(doc(db, "invitations", inviteToken), { activeSession: new Date(), sessionExpiresAt: new Date(Date.now() + 3600000), setupTokenHash: hash });
  await updateDoc(doc(db, "invitations", inviteToken), {
    inviteMessage: "", inviteMessageEnabled: "false",
    storyText: "", storyTextEnabled: "false",
    welcomeVideo: "", welcomeVideoEnabled: "false",
  });
  const after = await getDoc(doc(db, "invitations", inviteToken));
  console.log("Después → inviteMessage:", JSON.stringify(after.data()?.inviteMessage), "| storyText:", JSON.stringify(after.data()?.storyText));
  console.log("✅ Limpieza completada");
} catch (e) { console.error("❌ ERROR:", e?.code, e?.message); }
