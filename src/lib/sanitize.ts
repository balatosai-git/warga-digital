/**
 * Input Sanitization Utility
 *
 * Provides functions to sanitize user input before storing or rendering.
 * All functions are safe for server-side use (no DOM dependency).
 *
 * Usage:
 *   import { sanitizeText, sanitizeHtml, sanitizeUrl } from "@/lib/sanitize";
 *
 *   const cleanTitle = sanitizeText(userInput.title);
 *   const cleanBio = sanitizeHtml(userInput.bio, { allowedTags: ["b", "i", "u"] });
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/** HTML tags that are NEVER allowed, even in rich text fields. */
const DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "link",
  "meta",
  "style",
  "base",
  "applet",
  "frame",
  "frameset",
  "ilayer",
  "layer",
  "bgsound",
  "title",
  "xml",
];

/** Dangerous HTML attributes that can execute JavaScript. */
const DANGEROUS_ATTRS = [
  "onerror",
  "onload",
  "onclick",
  "onmouseover",
  "onfocus",
  "onblur",
  "onsubmit",
  "onreset",
  "onselect",
  "onchange",
  "onkeyup",
  "onkeydown",
  "onkeypress",
  "onmouseout",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "oncontextmenu",
  "onabort",
  "onresize",
  "onscroll",
  "ondrag",
  "ondragend",
  "ondragenter",
  "ondragleave",
  "ondragover",
  "ondragstart",
  "ondrop",
  "onwheel",
  "oncopy",
  "oncut",
  "onpaste",
  "onanimationstart",
  "onanimationend",
  "ontransitionend",
  "ontouchstart",
  "ontouchmove",
  "ontouchend",
  "ontouchcancel",
  "onpointerdown",
  "onpointerup",
  "onpointermove",
  "onpointerenter",
  "onpointerleave",
  "onpointercancel",
  "onbeforeunload",
  "onunload",
  "onhashchange",
  "onpopstate",
  "onstorage",
  "onmessage",
  "onopen",
  "onclose",
  "ononline",
  "onoffline",
  "onpageshow",
  "onpagehide",
  "onsearch",
  "ontoggle",
  "oninvalid",
  "oninput",
  "onsearch",
  "onbeforeinput",
  "onbeforeprint",
  "onafterprint",
  "oncanplay",
  "oncanplaythrough",
  "ondurationchange",
  "onemptied",
  "onended",
  "onloadeddata",
  "onloadedmetadata",
  "onloadstart",
  "onpause",
  "onplay",
  "onplaying",
  "onprogress",
  "onratechange",
  "onseeked",
  "onseeking",
  "onstalled",
  "onsuspend",
  "ontimeupdate",
  "onvolumechange",
  "onwaiting",
  "onshow",
  "oncontextmenu",
  "oncuechange",
  "ondblclick",
  "onfocusin",
  "onfocusout",
  "onfullscreenchange",
  "onfullscreenerror",
  "onsecuritypolicyviolation",
  "onslotchange",
  "onwebkitanimationend",
  "onwebkitanimationiteration",
  "onwebkitanimationstart",
  "onwebkittransitionend",
  "onwebkitfullscreenchange",
  "onwebkitfullscreenerror",
];

/** Dangerous URL protocols. */
const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "vbscript:",
  "data:",
  "blob:",
];

// ─── Core Sanitization Functions ──────────────────────────────────────────────

/**
 * Strip all HTML tags from a string.
 * Use this for plain text fields (names, titles, descriptions).
 *
 * @param input - The string to sanitize
 * @returns The string with all HTML tags removed
 */
export function stripHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  // Remove all HTML tags
  return input.replace(/<[^>]*>/g, "").trim();
}

/**
 * Sanitize plain text input.
 * Strips HTML tags, trims whitespace, and collapses multiple spaces.
 *
 * @param input - The string to sanitize
 * @param options - Optional configuration
 * @returns Sanitized plain text string
 */
export function sanitizeText(
  input: string,
  options?: { maxLength?: number },
): string {
  if (!input || typeof input !== "string") return "";

  let result = stripHtml(input);

  // Collapse multiple whitespace characters into single spaces
  result = result.replace(/\s+/g, " ");

  // Apply max length if specified
  if (options?.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result.trim();
}

/**
 * Sanitize rich text input while preserving allowed HTML tags.
 * Removes dangerous tags and attributes.
 *
 * @param input - The HTML string to sanitize
 * @param options - Configuration for allowed tags and max length
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  input: string,
  options?: {
    allowedTags?: string[];
    maxLength?: number;
  },
): string {
  if (!input || typeof input !== "string") return "";

  let result = input;

  // Remove dangerous tags completely (including their content)
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>|<${tag}[^>]*\/?>`,
      "gi",
    );
    result = result.replace(regex, "");
  }

  // If allowedTags is specified, remove all other tags
  if (options?.allowedTags && options.allowedTags.length > 0) {
    const allowed = options.allowedTags.map((t) => t.toLowerCase());
    // Remove tags that are not in the allowed list
    result = result.replace(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName) => {
      if (allowed.includes(tagName.toLowerCase())) {
        return match; // Keep allowed tags
      }
      return ""; // Remove disallowed tags
    });
    // Also remove closing tags that are not allowed
    result = result.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g, (match, tagName) => {
      if (allowed.includes(tagName.toLowerCase())) {
        return match;
      }
      return "";
    });
  }

  // Remove dangerous attributes from all remaining tags
  for (const attr of DANGEROUS_ATTRS) {
    const regex = new RegExp(`\\s+${attr}\\s*=\\s*["'][^"']*["']`, "gi");
    result = result.replace(regex, "");
    // Also handle unquoted attribute values
    const regexUnquoted = new RegExp(`\\s+${attr}\\s*=\\s*\\S+`, "gi");
    result = result.replace(regexUnquoted, "");
  }

  // Remove javascript: URLs from href/src attributes
  result = result.replace(
    /(href|src|action|formaction|data)\s*=\s*["']?\s*(javascript|vbscript|data|blob):[^"'\s>]*/gi,
    (match, attrName, protocol) => {
      return `${attrName}="#"`;
    },
  );

  // Apply max length if specified
  if (options?.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result.trim();
}

/**
 * Sanitize a URL to ensure it doesn't contain dangerous protocols.
 *
 * @param url - The URL to sanitize
 * @returns Sanitized URL or "#" if invalid/dangerous
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") return "#";

  const trimmed = url.trim();

  // Check for dangerous protocols
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of DANGEROUS_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) {
      return "#";
    }
  }

  // Allow relative URLs and safe absolute URLs
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    return trimmed;
  }

  // If it doesn't match any known safe pattern, reject it
  return "#";
}

/**
 * Sanitize a file name to prevent directory traversal and special characters.
 *
 * @param fileName - The file name to sanitize
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== "string") return "unnamed";

  // Remove path separators and null bytes
  let result = fileName.replace(/[\/\\:\0]/g, "");

  // Remove leading/trailing dots and spaces
  result = result.replace(/^[.\s]+|[.\s]+$/g, "");

  // Replace consecutive dots with single dot
  result = result.replace(/\.{2,}/g, ".");

  // Limit length
  if (result.length > 255) {
    const extIndex = result.lastIndexOf(".");
    if (extIndex > 0 && result.length - extIndex <= 10) {
      result = result.slice(0, 255 - (result.length - extIndex)) + result.slice(extIndex);
    } else {
      result = result.slice(0, 255);
    }
  }

  return result || "unnamed";
}

/**
 * Sanitize an email address.
 *
 * @param email - The email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";

  const trimmed = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return "";
  }

  return trimmed;
}

/**
 * Sanitize a phone number (Indonesian format).
 *
 * @param phone - The phone number to sanitize
 * @returns Sanitized phone number or empty string if invalid
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== "string") return "";

  // Keep only digits and leading +
  let result = phone.replace(/[^\d+]/g, "");

  // Remove leading + if followed by non-digit
  if (result.startsWith("+") && !/^\+\d/.test(result)) {
    result = result.slice(1);
  }

  // Validate Indonesian format
  if (/^\+62\d{9,12}$/.test(result) || /^0\d{9,12}$/.test(result) || /^62\d{9,12}$/.test(result)) {
    return result;
  }

  return "";
}

/**
 * Sanitize an object's string properties recursively.
 *
 * @param obj - The object to sanitize
 * @param options - Sanitization options
 * @returns New object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options?: { maxLength?: number; allowedHtmlTags?: string[] },
): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Check if this field should allow HTML
      const htmlFields = ["description", "bio", "content", "body", "message"];
      if (htmlFields.includes(key.toLowerCase()) && options?.allowedHtmlTags) {
        result[key as keyof T] = sanitizeHtml(value, {
          allowedTags: options.allowedHtmlTags,
          maxLength: options.maxLength,
        }) as T[keyof T];
      } else {
        result[key as keyof T] = sanitizeText(value, {
          maxLength: options?.maxLength,
        }) as T[keyof T];
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key as keyof T] = sanitizeObject(
        value as Record<string, unknown>,
        options,
      ) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

// ─── Preset Sanitizers for Common Fields ──────────────────────────────────────

/** Sanitize a user's full name. */
export function sanitizeFullName(name: string): string {
  return sanitizeText(name, { maxLength: 100 });
}

/** Sanitize a transaction title. */
export function sanitizeTransactionTitle(title: string): string {
  return sanitizeText(title, { maxLength: 200 });
}

/** Sanitize a transaction description/details. */
export function sanitizeTransactionDetails(details: string): string {
  return sanitizeText(details, { maxLength: 1000 });
}

/** Sanitize an announcement title. */
export function sanitizeAnnouncementTitle(title: string): string {
  return sanitizeText(title, { maxLength: 200 });
}

/** Sanitize an announcement body (allows basic formatting). */
export function sanitizeAnnouncementBody(body: string): string {
  return sanitizeHtml(body, {
    allowedTags: ["b", "i", "u", "strong", "em", "br", "p", "ul", "ol", "li"],
    maxLength: 5000,
  });
}

/** Sanitize a marketplace item description. */
export function sanitizeItemDescription(description: string): string {
  return sanitizeHtml(description, {
    allowedTags: ["b", "i", "u", "br", "p"],
    maxLength: 2000,
  });
}
