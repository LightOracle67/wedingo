import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function logAudit(action, detail = "") {
  try {
    await addDoc(collection(db, "auditLog"), {
      action,
      detail,
      createdAt: serverTimestamp(),
      userAgent: navigator.userAgent.slice(0, 200),
    });
  } catch {}
}
