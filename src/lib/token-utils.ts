export const generateSetupToken = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const alphabetLen = alphabet.length;
  const needed = 32;
  // alphabetLen (32) divide 256, por lo que byte % alphabetLen es uniforme
  // y no se requiere rejection-sampling.
  const bytes = new Uint8Array(needed);
  crypto.getRandomValues(bytes);
  const rawToken = Array.from(bytes, (byte) => alphabet[byte % alphabetLen])
    .join("")
    .slice(0, needed);
  const token = rawToken.match(/.{1,4}/g)?.join("-") ?? rawToken;

  return token;
};

export const normalizeTokenValue = (value: unknown) => {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return normalized;
};

export function generateInviteToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const len = chars.length;
  const maxValid = 256 - (256 % len);
  const needed = 10;
  const bytes = new Uint8Array(needed * 2);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < bytes.length && result.length < needed; i++) {
    if (bytes[i]! < maxValid) result += chars[bytes[i]! % len];
  }

  return result;
}
