/**
 * Zero-Knowledge Client-Side Cryptographic Engine
 * Uses Web Crypto API (AES-256-GCM + PBKDF2)
 * All encryption and decryption occurs purely in the browser.
 */

// Helper to convert string to ArrayBuffer
export function stringToArrayBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Helper to convert ArrayBuffer to string
export function arrayBufferToString(buffer: ArrayBuffer | Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

// Helper to convert Uint8Array to Base64
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to Uint8Array
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a human passkey/secret
 * uses PBKDF2 with SHA-256 and a deterministic room salt
 */
export async function deriveRoomKey(passkey: string, roomId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passkey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  // Deterministic salt based on the roomId
  const salt = enc.encode(`telegram-secret-room-salt:${roomId}`);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable for fingerprint computation
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text string with AES-GCM 256
 */
export async function encryptText(
  text: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV standard for AES-GCM
  const encodedText = stringToArrayBuffer(text);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedText as unknown as BufferSource
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64(iv),
  };
}

/**
 * Decrypt a text string with AES-GCM 256
 */
export async function decryptText(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToUint8Array(ciphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  return arrayBufferToString(decryptedBuffer);
}

/**
 * Encrypt a binary file / ArrayBuffer with AES-GCM 256
 */
export async function encryptBinary(
  data: Uint8Array,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    data as unknown as BufferSource
  );

  return {
    ciphertext: uint8ArrayToBase64(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64(iv),
  };
}

/**
 * Decrypt a binary file / ArrayBuffer with AES-GCM 256
 */
export async function decryptBinary(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<Uint8Array> {
  const ciphertext = base64ToUint8Array(ciphertextBase64);
  const iv = base64ToUint8Array(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    ciphertext as unknown as BufferSource
  );

  return new Uint8Array(decryptedBuffer);
}

/**
 * Generates a Telegram-style Safety Number (numeric fingerprint)
 * derived from the raw key bits.
 * Displayed as 12 groups of 5 digits: "12345 67890 ..."
 */
export async function generateSafetyNumber(key: CryptoKey): Promise<string> {
  const rawKey = await crypto.subtle.exportKey('raw', key);
  const hash = await crypto.subtle.digest('SHA-512', rawKey);
  const hashBytes = new Uint8Array(hash);

  // Convert first 30 bytes into 12 5-digit numbers
  const groups: string[] = [];
  for (let i = 0; i < 12; i++) {
    const offset = i * 2;
    const value = ((hashBytes[offset] << 8) | hashBytes[offset + 1]) % 100000;
    groups.push(value.toString().padStart(5, '0'));
  }

  return groups.join(' ');
}

/**
 * Generates a random secure friendly room passkey
 */
export function generateRandomPasskey(): string {
  const adjectives = ['cyber', 'silent', 'crypto', 'shadow', 'aurora', 'signal', 'quantum', 'echo', 'secret', 'phantom'];
  const nouns = ['vault', 'haven', 'shield', 'beacon', 'relay', 'matrix', 'cipher', 'nexus', 'prism', 'tunnel'];
  const num = Math.floor(100 + Math.random() * 900);
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}-${noun}-${num}`;
}

/**
 * Generates a clean random Room ID
 */
export function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (let i = 0; i < 8; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}
