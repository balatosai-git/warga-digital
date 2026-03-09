/**
 * Canonical format for blok_rumah: BLOCK + NUMBER + optional UNIT.
 * No slash, dot, or space — e.g. N2, J12A. Used to avoid duplicates (N2 vs N/2 vs N.2 vs N 2).
 */

/** Canonical pattern: 1–3 letters, 1–4 digits, optional 1 letter (unit) */
const BLOK_RUMAH_CANONICAL_REGEX = /^[A-Z]{1,3}\d{1,4}[A-Z]?$/;

/**
 * Normalize user input to a single stored format.
 * Strips spaces, dots, slashes; uppercases; produces BLOCK+NUMBER or BLOCK+NUMBER+UNIT.
 * Examples: "N/2" → "N2", "n.2" → "N2", "J 12 A" → "J12A", "j11b" → "J11B".
 */
export function normalizeBlokRumah(value: string): string {
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[./]/g, "");
  return cleaned;
}

/**
 * Validate after normalization. Returns true if normalized value matches canonical format.
 */
export function isValidBlokRumah(normalized: string): boolean {
  return normalized.length > 0 && BLOK_RUMAH_CANONICAL_REGEX.test(normalized);
}

/**
 * Normalize and validate. Returns { normalized, error }. error is set if invalid.
 */
export function parseBlokRumah(value: string): { normalized: string; error?: string } {
  const normalized = normalizeBlokRumah(value);
  if (!normalized) {
    return { normalized: "", error: "Blok rumah wajib diisi" };
  }
  if (!isValidBlokRumah(normalized)) {
    return {
      normalized: "",
      error: "Format tidak valid. Contoh: N2, J12A (blok + nomor + optional unit)",
    };
  }
  return { normalized };
}
