import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadBackgroundImage(inviteToken, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    throw new Error("No es un data URL válido");
  }
  const ext = dataUrl.startsWith("data:image/png") ? "png" : "jpg";
  const storagePath = `invitations/${inviteToken}/background.${ext}`;
  const storageRef = ref(storage, storagePath);
  await uploadString(storageRef, dataUrl, "data_url");
  const downloadUrl = await getDownloadURL(storageRef);
  return { downloadUrl, storagePath };
}

export async function deleteBackgroundImage(storagePath) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {}
}
