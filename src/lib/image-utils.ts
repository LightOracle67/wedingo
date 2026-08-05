import i18n from "../i18n";

const TARGET_BYTES_DEFAULT = 300 * 1024;
// Calidad alta para las imágenes protagonistas (foto de novios, fondo y galería).
// El target se mide en bytes CRUDOS del data URL (length*3/4); el campo que se
// guarda en Firestore es el base64 CIFRADO (~1.33x), con límite de 1MB. 450KB
// crudos => data URL ≤ ~600KB => cifrado ~600KB, con margen amplio para que el
// canal de Firestore no falle en conexiones inestables.
export const HIGH_QUALITY_MAX_DIMENSION = 1920;
export const HIGH_QUALITY_TARGET_BYTES = 450 * 1024;
// Cota de seguridad: el base64 cifrado no debe acercarse al límite de 1MB.
export const MAX_ENCRYPTED_BYTES = 1000 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const TARGET_BYTES = TARGET_BYTES_DEFAULT;

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function canvasToType(canvas: HTMLCanvasElement, type: string, quality: number): string {
  let dataUrl = canvas.toDataURL(`image/${type}`, quality);
  if (!dataUrl.startsWith(`data:image/${type}`)) {
    dataUrl = canvas.toDataURL("image/png");
  }
  return dataUrl;
}

function shrinkToFit(canvas: HTMLCanvasElement, maxBytes: number): string {
  let { width, height } = canvas;
  let dataUrl = canvasToType(canvas, "webp", 0.8);
  let bytes = Math.round((dataUrl.length * 3) / 4);
  while (bytes > maxBytes && width > 200 && height > 200) {
    width = Math.round(width * 0.75);
    height = Math.round(height * 0.75);
    const tmp = document.createElement("canvas");
    tmp.width = width;
    tmp.height = height;
    const ctx = tmp.getContext("2d");
    if (!ctx) break;
    ctx.drawImage(canvas, 0, 0, width, height);
    dataUrl = canvasToType(tmp, "webp", 0.8);
    bytes = Math.round((dataUrl.length * 3) / 4);
  }
  return dataUrl;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error(i18n.t("errors.readImageFailed"))); };
    img.src = URL.createObjectURL(file);
  });
}

/** Comprime una imagen preservando transparencia.
 *  Exporta a WebP (soporta alpha), con fallback a PNG.
 *  Reduce calidad/dimensiones hasta encajar en el target (por defecto 300KB). */
export const compressImageTransparent = async (file: File, maxDimension = MAX_IMAGE_DIMENSION, targetBytes = TARGET_BYTES): Promise<string> => {
  const img = await loadImage(file);
  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(i18n.t("errors.uploadImageFailed"));
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  let dataUrl = canvasToType(canvas, "webp", 0.8);
  let estimatedBytes = Math.round((dataUrl.length * 3) / 4);

  if (estimatedBytes > targetBytes) {
    let quality = 0.7;
    while (quality >= 0.1 && estimatedBytes > targetBytes) {
      dataUrl = canvasToType(canvas, "webp", quality);
      estimatedBytes = Math.round((dataUrl.length * 3) / 4);
      quality -= 0.1;
    }
  }

  if (estimatedBytes > targetBytes) {
    dataUrl = shrinkToFit(canvas, targetBytes);
  }

  return dataUrl;
};

/** Comprime una imagen: elimina fondo blanco, preserva transparencia,
 *  reduce calidad/dimensiones hasta encajar en el target (por defecto 300KB).
 *  Exporta a WebP (con alpha si existe), con fallback a JPEG. */
export const compressImage = async (file: File, maxDimension = MAX_IMAGE_DIMENSION, targetBytes = TARGET_BYTES): Promise<string> => {

  const img = await loadImage(file);

  // Fast path: JPEG ya pequeño y con dimensiones razonables
  if (file.size <= targetBytes && file.type === "image/jpeg"
      && img.width <= maxDimension && img.height <= maxDimension) {
    URL.revokeObjectURL(img.src);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  let { width, height } = img;
  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(i18n.t("errors.uploadImageFailed"));

  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Probar WebP (soporta alpha, buena compresión)
  let dataUrl = canvasToType(canvas, "webp", 0.8);
  let estimatedBytes = Math.round((dataUrl.length * 3) / 4);

  // Reducir calidad progresivamente
  if (estimatedBytes > targetBytes) {
    let quality = 0.7;
    while (quality >= 0.1 && estimatedBytes > targetBytes) {
      dataUrl = canvasToType(canvas, "webp", quality);
      estimatedBytes = Math.round((dataUrl.length * 3) / 4);

      quality -= 0.1;
    }
  }

  // Si sigue siendo muy grande, reducir dimensiones
  if (estimatedBytes > targetBytes) {

    dataUrl = shrinkToFit(canvas, targetBytes);
    estimatedBytes = Math.round((dataUrl.length * 3) / 4);

  }

  return dataUrl;
};
