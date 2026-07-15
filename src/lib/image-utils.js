import i18n from "../i18n";

const MAX_IMAGE_DIMENSION = 1600;
const TARGET_BYTES = 500 * 1024;

export const compressImage = (file) =>
  new Promise((resolve, reject) => {
    if (file.size <= TARGET_BYTES && file.type === "image/jpeg") {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
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
      if (!ctx) { reject(new Error(i18n.t("errors.uploadImageFailed"))); return; }
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryQuality = () => {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const estimatedBytes = Math.round((dataUrl.length * 3) / 4);
        if (estimatedBytes <= TARGET_BYTES || quality <= 0.2) {
          resolve(dataUrl);
        } else {
          quality -= 0.1;
          tryQuality();
        }
      };
      tryQuality();
    };
    img.onerror = () => reject(new Error(i18n.t("errors.readImageFailed")));
    img.src = URL.createObjectURL(file);
  });
