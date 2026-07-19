const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function lonToTileX(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function latToTileY(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

export const buildOpenFreeMapPreviewUrl = async (location) => {
  if (!location) return "";
  try {
    const zoom = 15;
    const size = 600;
    const tx = lonToTileX(location.longitude, zoom);
    const ty = latToTileY(location.latitude, zoom);

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const tileSize = 256;
    const tilesPerSide = Math.ceil(size / tileSize);

    for (let dx = 0; dx < tilesPerSide; dx++) {
      for (let dy = 0; dy < tilesPerSide; dy++) {
        const url = TILE_URL.replace("{z}", zoom).replace("{x}", tx + dx).replace("{y}", ty + dy);
        try {
          const resp = await fetch(url, { mode: "cors" });
          const blob = await resp.blob();
          const img = await createImageBitmap(blob);
          ctx.drawImage(img, dx * tileSize, dy * tileSize);
        } catch {}
      }
    }

    const cx = size / 2;
    const cy = size / 2;
    const r = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(216, 178, 74, 0.18)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#d8b24a";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
    ctx.lineWidth = 3;
    ctx.stroke();

    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
};
