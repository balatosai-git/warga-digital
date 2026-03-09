/**
 * Organisation structure for RT 03 community.
 * Single source of truth: add/remove roles or members here.
 * Each member: profile picture, full name, block, WhatsApp number.
 *
 * This schema is sufficient for rendering the organisation page. For a future
 * manage/API flow you may add optional ids (e.g. memberId, roleId) when
 * persisting to the database.
 */

export interface OrganisationMember {
  /** Display name */
  fullName: string;
  /** Block label, e.g. "Blok A", "Blok N" */
  blockName: string;
  /** WhatsApp number: use 62xxxxxxxxxx (no +). Stored as string for leading zeros. */
  whatsappNumber: string;
  /** Optional profile image URL. When null, avatar shows initials. */
  profilePictureUrl?: string | null;
}

export interface OrganisationRole {
  /** Unique id for the role (e.g. for keys or future API) */
  id: string;
  /** Section title shown on the page */
  title: string;
  /** Order of the section (lower = higher in tree) */
  order: number;
  /** People in this role; can be 1 or many */
  members: OrganisationMember[];
}

/**
 * Build WhatsApp link: wa.me/62xxxxxxxxxx (no + or spaces).
 */
export function getWhatsAppLink(number: string): string {
  const digits = number.replace(/\D/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits.startsWith("62") ? digits : "62" + digits;
  return `https://wa.me/${normalized}`;
}

/**
 * Organisation tree: one array of roles, each with one or more members.
 * Edit this array to add/remove roles or change members.
 */
export const ORGANISATION_ROLES: OrganisationRole[] = [
  {
    id: "ketua-rt",
    title: "Ketua RT 03",
    order: 1,
    members: [
      {
        fullName: "Bapak Ketua RT",
        blockName: "Blok A",
        whatsappNumber: "6281234567890",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "wakil-ketua",
    title: "Wakil Ketua RT 03",
    order: 2,
    members: [
      {
        fullName: "Bapak Wakil Ketua",
        blockName: "Blok B",
        whatsappNumber: "6281234567891",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "bendahara",
    title: "Bendahara",
    order: 3,
    members: [
      {
        fullName: "Ibu Bendahara Satu",
        blockName: "Blok C",
        whatsappNumber: "6281234567892",
        profilePictureUrl: null,
      },
      {
        fullName: "Ibu Bendahara Dua",
        blockName: "Blok D",
        whatsappNumber: "6281234567893",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "sekretaris",
    title: "Sekretaris",
    order: 4,
    members: [
      {
        fullName: "Bapak/Ibu Sekretaris",
        blockName: "Blok E",
        whatsappNumber: "6281234567894",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    order: 5,
    members: [
      {
        fullName: "Petugas Security 1",
        blockName: "Blok F",
        whatsappNumber: "6281234567895",
        profilePictureUrl: null,
      },
      {
        fullName: "Petugas Security 2",
        blockName: "Blok G",
        whatsappNumber: "6281234567896",
        profilePictureUrl: null,
      },
      {
        fullName: "Petugas Security 3",
        blockName: "Blok H",
        whatsappNumber: "6281234567897",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "sesi-lingkungan",
    title: "Sesi Lingkungan",
    order: 6,
    members: [
      {
        fullName: "Koordinator Lingkungan",
        blockName: "Blok I",
        whatsappNumber: "6281234567898",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "sesi-remaja",
    title: "Sesi Remaja",
    order: 7,
    members: [
      {
        fullName: "Koordinator Remaja",
        blockName: "Blok J",
        whatsappNumber: "6281234567899",
        profilePictureUrl: null,
      },
    ],
  },
  {
    id: "sesi-ibu-ibu",
    title: "Sesi Ibu-ibu",
    order: 8,
    members: [
      {
        fullName: "Koordinator Ibu-ibu",
        blockName: "Blok K",
        whatsappNumber: "6281234567800",
        profilePictureUrl: null,
      },
    ],
  },
].sort((a, b) => a.order - b.order);
