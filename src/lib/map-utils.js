export const buildOpenFreeMapPreviewUrl = async (location) => {
  if (!location) return "";
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${location.latitude},${location.longitude}&zoom=14&size=1200x800&maptype=mapnik&markers=${location.latitude},${location.longitude},red-pushpin`;
};
