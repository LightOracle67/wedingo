import i18n from "../i18n";

const TARGET_BYTES_DEFAULT = 300 * 1024;
// Calidad alta para las imágenes protagonistas (foto de novios, fondo y galería).
// El target se mide en bytes CRUDOS del data URL (length*3/4); el campo que se
// guarda en Firestore es el base64 CIFRADO (~1.33x), con límite de 1MB. 650KB
// crudos => data URL ≤ ~650KB => cifrado ~865KB, con margen seguro frente al
// límite de 1MB. Dimensión máxima 2560px (2K) para que el fondo se vea nítido
// incluso al imprimir.
export const HIGH_QUALITY_MAX_DIMENSION = 2880;
export const HIGH_QUALITY_TARGET_BYTES = 650 * 1024;
// Cota de seguridad: el base64 cifrado no debe acercarse al límite de 1MB.
export const MAX_ENCRYPTED_BYTES = 1000 * 1024;
export const MAX_IMAGE_DIMENSION = 1600;
export const TARGET_BYTES = TARGET_BYTES_DEFAULT;
// Miniaturas de galería (v2.185): 128px y ~24KB — la fila de miniaturas de la
// invitación ya no descifra/muestra la imagen COMPLETA (~866KB) por foto.
export const THUMB_MAX_DIMENSION = 128;
export const THUMB_TARGET_BYTES = 24 * 1024;

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
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error(i18n.t("errors.readImageFailed")));
    };
    img.src = URL.createObjectURL(file);
  });
}

/** Comprime una imagen preservando transparencia. La variante "transparente"
 *  era casi idéntica a compressImage (menos el fast-path JPEG); unificadas en
 *  v2.186 con la opción `jpegFastPath` (ver compressImage). */
export const compressImageTransparent = async (
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
  targetBytes = TARGET_BYTES,
): Promise<string> => {
  return compressImage(file, maxDimension, targetBytes, { jpegFastPath: false });
};

interface CompressOptions {
  /** Fast-path de JPEG (pasar tal cual si ya es pequeño). Solo debe
   *  activarse cuando NO importa la transparencia (v2.186: la variante
   *  transparente la desactiva). */
  jpegFastPath?: boolean;
}

/** Comprime una imagen: preserva transparencia, reduce calidad/dimensiones
 *  hasta encajar en el target (por defecto 300KB). Exporta a WebP (soporta
 *  alpha), con fallback a PNG. */
export const compressImage = async (
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION,
  targetBytes = TARGET_BYTES,
  options: CompressOptions = {},
): Promise<string> => {
  const img = await loadImage(file);

  // Fast path: JPEG ya pequeño y con dimensiones razonables.
  // Se comprueba el magic bytes JPEG (FF D8 FF) porque file.type lo envía el
  // cliente y no es fiable; el contenido se vuelve a validar en canvas en el
  // camino lento si no pasa.
  if (
    options.jpegFastPath !== false &&
    file.size <= targetBytes &&
    file.type === "image/jpeg" &&
    img.width <= maxDimension &&
    img.height <= maxDimension &&
    file.slice(0, 3).size === 3
  ) {
    const isJpeg = await new Promise<boolean>((resolve) => {
      const probe = file.slice(0, 3);
      const reader = new FileReader();
      reader.onload = () => {
        const bytes = new Uint8Array(reader.result as ArrayBuffer);
        resolve(bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff);
      };
      reader.onerror = () => resolve(false);
      reader.readAsArrayBuffer(probe);
    });
    if (isJpeg) {
      URL.revokeObjectURL(img.src);

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
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
