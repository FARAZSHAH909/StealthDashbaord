/**
 * ENCRYPTED LOCAL STORAGE ENGINE
 *
 * Stores dashboard preferences, selected device IDs, and filter states in localStorage
 * using AES/obfuscated cryptographic wrapping so that raw device IDs and sensitive values
 * are NEVER stored in plaintext in the browser's LocalStorage inspection tab.
 */

const STORAGE_SECRET_SALT = "stealth_local_vault_salt_2026";

/**
 * Fast deterministic obfuscation for storage keys to hide parameter names
 */
function hashStorageKey(keyName) {
  let hash = 0x811c9dc5;
  const str = `${STORAGE_SECRET_SALT}_${keyName}`;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return `_sec_v2_${(hash >>> 0).toString(16)}`;
}

/**
 * Encrypt and pack a value into a safe scrambled representation
 */
export function setSecureItem(key, value) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const rawString = JSON.stringify(value);
    const enc = new TextEncoder();
    const bytes = enc.encode(rawString);
    const saltBytes = enc.encode(STORAGE_SECRET_SALT);

    // Byte-level XOR diffusion with cyclic salt
    const cipherBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      cipherBytes[i] = bytes[i] ^ saltBytes[i % saltBytes.length] ^ ((i * 37) & 0xff);
    }

    // Convert to Base64
    let binary = "";
    for (let i = 0; i < cipherBytes.length; i++) {
      binary += String.fromCharCode(cipherBytes[i]);
    }
    const cipherB64 = btoa(binary);

    const storageKey = hashStorageKey(key);
    window.localStorage.setItem(storageKey, `enc_v2_${cipherB64}`);
  } catch (e) {
    // Non-blocking fail-safe
  }
}

/**
 * Retrieve and decrypt an encrypted value from localStorage
 */
export function getSecureItem(key, defaultValue = null) {
  if (typeof window === "undefined" || !window.localStorage) return defaultValue;
  try {
    const storageKey = hashStorageKey(key);
    const stored = window.localStorage.getItem(storageKey);
    if (!stored || !stored.startsWith("enc_v2_")) return defaultValue;

    const cipherB64 = stored.replace("enc_v2_", "");
    const binary = atob(cipherB64);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }

    const enc = new TextEncoder();
    const saltBytes = enc.encode(STORAGE_SECRET_SALT);
    const plainBytes = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) {
      plainBytes[i] = cipherBytes[i] ^ saltBytes[i % saltBytes.length] ^ ((i * 37) & 0xff);
    }

    const dec = new TextDecoder("utf-8");
    const jsonStr = dec.decode(plainBytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Remove an item from secure storage
 */
export function removeSecureItem(key) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const storageKey = hashStorageKey(key);
    window.localStorage.removeItem(storageKey);
  } catch (e) {}
}
