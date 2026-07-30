import i18n from "../i18n";

const MAX_IMAGE_DIMENSION = 1600;
const TARGET_BYTES = 300 * 1024;

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
    dataUrl = canvas.toDataURL("image/jpeg", quality);
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

/** Comprime una imagen preservando transparencia. Exporta a PNG (sin pérdida de alpha).
 *  Reduce dimensiones si supera maxDimension. */
export const compressImageTransparent = async (file: File, maxDimension = 800): Promise<string> => {
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
  return canvas.toDataURL("image/png");
};

/** Comprime una imagen: elimina fondo blanco, preserva transparencia,
 *  reduce calidad/dimensiones hasta encajar en TARGET_BYTES.
 *  Exporta a WebP (con alpha si existe), con fallback a JPEG. */
export const compressImage = async (file: File): Promise<string> => {
  if (file.size <= TARGET_BYTES && file.type === "image/jpeg") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const img = await loadImage(file);
  let { width, height } = img;
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    const ratio = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(i18n.t("errors.uploadImageFailed"));

  // Preservar transparencia — dibujar directamente sin fondo blanco
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Probar WebP (soporta alpha, buena compresión)
  let dataUrl = canvasToType(canvas, "webp", 0.8);
  let estimatedBytes = Math.round((dataUrl.length * 3) / 4);

  // Reducir calidad progresivamente
  if (estimatedBytes > TARGET_BYTES) {
    let quality = 0.7;
    while (quality >= 0.1 && estimatedBytes > TARGET_BYTES) {
      dataUrl = canvasToType(canvas, "webp", quality);
      estimatedBytes = Math.round((dataUrl.length * 3) / 4);
      quality -= 0.1;
    }
  }

  // Si sigue siendo muy grande, reducir dimensiones
  if (estimatedBytes > TARGET_BYTES) {
    dataUrl = shrinkToFit(canvas, TARGET_BYTES);
  }

  return dataUrl;
};
