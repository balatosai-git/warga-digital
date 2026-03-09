"use client";

/**
 * MS Teams–style initials from full name: "John Doe" → "JD", "John" → "J".
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0].charAt(0);
    const last = parts[parts.length - 1].charAt(0);
    return (first + last).toUpperCase();
  }
  return parts[0].charAt(0).toUpperCase();
}

export interface AvatarProps {
  /** Display name, used for initials when src is not set */
  name: string;
  /** Image URL. When null/undefined, shows initials. */
  src?: string | null;
  /** Size in pixels (same for width and height). Default 40. */
  size?: number;
  /** Optional className for the wrapper. */
  className?: string;
  /** Alt text for image (defaults to name). */
  alt?: string;
}

export function Avatar({ name, src, size = 40, className = "", alt }: AvatarProps) {
  const sizeClass = size <= 24 ? "text-xs" : size <= 32 ? "text-sm" : size <= 48 ? "text-base" : "text-xl";
  const showImage = src && src.trim().length > 0;

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-primary/15 font-semibold text-app-primary ${sizeClass} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
