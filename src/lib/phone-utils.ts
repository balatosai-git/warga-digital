/**
 * Shared WhatsApp / phone-number utilities.
 *
 * All API routes that read or write `wa_number` should import from here so
 * normalization stays consistent across the entire codebase.
 *
 * Canonical storage format: +62XXXXXXXXXX  (E.164-style, with leading "+")
 *
 * Accepted input formats (all resolve to the same canonical form):
 *   081280031995      → +6281280031995
 *   6281280031995     → +6281280031995
 *   +6281280031995    → +6281280031995
 *   81280031995       → +6281280031995  (bare local number, no prefix)
 */

/**
 * Normalizes any common Indonesian WA number format to +62XXXXXXXXXX.
 *
 * Examples:
 *   normalizeWaNumber("081280031995")    → "+6281280031995"
 *   normalizeWaNumber("6281280031995")   → "+6281280031995"
 *   normalizeWaNumber("+6281280031995")  → "+6281280031995"
 *   normalizeWaNumber("81280031995")     → "+6281280031995"
 */
export function normalizeWaNumber(waNumber: string): string {
  const digits = String(waNumber ?? "").replace(/\D/g, "");
  if (digits.startsWith("62")) return "+" + digits;
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  return "+62" + digits;
}

/**
 * Returns every storage format that could represent the given WA number.
 * Use this for DB lookups so that legacy rows stored in non-canonical
 * format (e.g. "081..." or "628..." without "+") are still found.
 *
 * Examples for "081280031995":
 *   ["+6281280031995", "6281280031995", "081280031995", "81280031995"]
 */
export function getWaNumberVariants(input: string): string[] {
  const digits = String(input ?? "").replace(/\D/g, "");

  // Derive the bare local part (everything after the country-code prefix)
  let localPart: string;
  if (digits.startsWith("62")) {
    localPart = digits.slice(2); // strip "62"
  } else if (digits.startsWith("0")) {
    localPart = digits.slice(1); // strip leading "0"
  } else {
    localPart = digits; // already bare (e.g. "81280031995")
  }

  // Return all four variants; dedup in case input was already bare
  const variants: string[] = [
    "+" + "62" + localPart,  // +6281280031995  ← canonical / preferred
    "62" + localPart,         // 6281280031995
    "0" + localPart,          // 081280031995
    localPart,                // 81280031995     ← bare local, no prefix
  ];

  // Remove empty strings and deduplicate while preserving order
  return [...new Set(variants.filter(Boolean))];
}

/**
 * Returns true when the input looks like a phone / WA number rather than a
 * username.  Allows digits, "+", spaces, hyphens, and parentheses, and
 * requires at least 9 raw digits (shortest valid Indonesian mobile number
 * without country code is 8-XXXXXXXX = 9 digits).
 */
export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (!/^[\d+\s()\-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 9;
}

/**
 * Basic validity check for a normalized (+62...) WA number.
 * The local part must start with 8[1-9] and be 9–12 digits long.
 *
 * Returns an error string, or null if valid.
 */
export function validateNormalizedWaNumber(normalized: string): string | null {
  // Must start with +62
  if (!normalized.startsWith("+62")) {
    return "Format nomor WhatsApp tidak valid";
  }
  const local = normalized.slice(3); // strip "+62"
  if (!/^8[1-9]\d{6,10}$/.test(local)) {
    return "Format nomor WhatsApp tidak valid (contoh: 08123456789)";
  }
  return null;
}
