import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be at least 32 characters");
  }
  if (key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return Buffer.from(key, "hex");
  }
  return scryptSync(key, "warga-digital-salt", KEY_LENGTH);
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(data).toString("utf8") + decipher.final("utf8");
}

export function hashSha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const PIN_SALT_LEN = 32;
const PIN_KEY_LEN = 64;
const PIN_SCRYPT_N = 16384;

/**
 * Hash a 4-digit PIN for storage. Returns "salt_hex:hash_hex".
 */
export function hashPin(pin: string): string {
  const salt = randomBytes(PIN_SALT_LEN);
  const hash = scryptSync(pin, salt, PIN_KEY_LEN, { N: PIN_SCRYPT_N });
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/**
 * Verify a 4-digit PIN against stored pinHash (salt_hex:hash_hex).
 */
export function verifyPin(pin: string, pinHash: string | null): boolean {
  if (!pinHash || !pin) return false;
  const parts = pinHash.split(":");
  if (parts.length !== 2) return false;
  const [saltHex, hashHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, salt, PIN_KEY_LEN, { N: PIN_SCRYPT_N });
  return actual.length === expected.length && actual.compare(expected) === 0;
}
