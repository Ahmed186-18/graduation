const FALLBACK_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function fallbackId(length = 21) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * FALLBACK_CHARS.length);
    result += FALLBACK_CHARS[idx];
  }
  return result;
}

export function randomId() {
  const globalCrypto = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;

  if (globalCrypto?.randomUUID) {
    try {
      return globalCrypto.randomUUID();
    } catch {
      // ignore and try other strategies
    }
  }

  if (globalCrypto?.getRandomValues) {
    try {
      const bytes = new Uint8Array(16);
      globalCrypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } catch {
      // browsers on insecure origins can throw here; fall back
    }
  }

  return fallbackId();
}
