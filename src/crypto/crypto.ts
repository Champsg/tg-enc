/**
 * Helper utilities for username normalization and deterministic chat IDs.
 */

export function stringToArrayBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

export function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Deterministic conversation ID for two users.
 * Does not require crypto.subtle so it runs cleanly on mobile browsers over HTTP.
 */
export function buildChatId(userIdA: string, userIdB: string): string {
  const sorted = [userIdA, userIdB].sort();
  return `chat_${sorted[0]}_${sorted[1]}`;
}

/** Telegram-style handle: lowercase letters, digits and underscores only. */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9_]/g, '');
}

export function generateUserId(): string {
  return 'u_' + Math.random().toString(36).substring(2, 12);
}
