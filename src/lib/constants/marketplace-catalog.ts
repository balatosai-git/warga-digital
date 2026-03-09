import type {
  MarketplaceDomainCode,
  MarketplaceItemStatus,
} from "@/types/database";

/* ─── Card-ready payload types (frontend + API shape) ────────────────────── */

export interface MarketplaceCategoryCard {
  id: string;
  domain_code: MarketplaceDomainCode;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface MarketplaceItemCard {
  id: string;
  category_id: string;
  category_name: string;
  owner_display_name: string;
  name: string;
  slug: string;
  summary: string | null;
  base_price: number;
  discount_percent: number;
  discount_amount: number;
  final_price: number;
  currency_code: string;
  unit_label: string;
  is_service: boolean;
  rating_avg: number;
  rating_count: number;
  status: MarketplaceItemStatus;
  is_featured: boolean;
  primary_image_url: string | null;
  wa_number: string | null;
  location_note: string | null;
  tags: string[];
}

/* ─── Mock domains ───────────────────────────────────────────────────────── */

export const MOCK_DOMAINS: Record<
  MarketplaceDomainCode,
  { id: string; name: string; icon: string }
> = {
  UMKM: { id: "d0000000-0000-7000-8000-000000000001", name: "UMKM", icon: "🛒" },
  JASA: { id: "d0000000-0000-7000-8000-000000000002", name: "Jasa Warga", icon: "🔧" },
};

/* ─── Mock categories ────────────────────────────────────────────────────── */

export const MOCK_UMKM_CATEGORIES: MarketplaceCategoryCard[] = [
  { id: "c1000000-0000-7000-8000-000000000001", domain_code: "UMKM", name: "Sembako",          slug: "sembako",          description: "Sembako & kebutuhan sehari-hari", icon: "🛍️", sort_order: 1 },
  { id: "c1000000-0000-7000-8000-000000000002", domain_code: "UMKM", name: "Makanan & Minuman", slug: "makanan-minuman", description: "Makanan, cemilan, minuman",       icon: "🍱", sort_order: 2 },
  { id: "c1000000-0000-7000-8000-000000000003", domain_code: "UMKM", name: "Kerajinan Tangan", slug: "kerajinan-tangan", description: "Hasil kerajinan warga",           icon: "🎨", sort_order: 3 },
  { id: "c1000000-0000-7000-8000-000000000004", domain_code: "UMKM", name: "Sayur & Buah",     slug: "sayur-buah",       description: "Sayur & buah dari kebun warga",   icon: "🥬", sort_order: 4 },
];

export const MOCK_JASA_CATEGORIES: MarketplaceCategoryCard[] = [
  { id: "c2000000-0000-7000-8000-000000000001", domain_code: "JASA", name: "Kelistrikan",   slug: "kelistrikan",   description: "Perbaikan & instalasi listrik",   icon: "⚡", sort_order: 1 },
  { id: "c2000000-0000-7000-8000-000000000002", domain_code: "JASA", name: "Jahit",         slug: "jahit",         description: "Jahit baju, kaos, dll",           icon: "🧵", sort_order: 2 },
  { id: "c2000000-0000-7000-8000-000000000003", domain_code: "JASA", name: "Antar-Jemput",  slug: "antar-jemput",  description: "Antar jemput dalam kompleks",     icon: "🚗", sort_order: 3 },
  { id: "c2000000-0000-7000-8000-000000000004", domain_code: "JASA", name: "Bersih-bersih", slug: "bersih-bersih", description: "Kebersihan rumah & kantor",       icon: "🧹", sort_order: 4 },
];

export const MOCK_ALL_CATEGORIES: MarketplaceCategoryCard[] = [
  ...MOCK_UMKM_CATEGORIES,
  ...MOCK_JASA_CATEGORIES,
];

/* ─── Mock items ─────────────────────────────────────────────────────────── */

export const MOCK_UMKM_ITEMS: MarketplaceItemCard[] = [
  {
    id: "e1000000-0000-7000-8000-000000000001", category_id: "c1000000-0000-7000-8000-000000000001",
    category_name: "Sembako", owner_display_name: "Toko Pak Edi",
    name: "Beras Premium 5kg", slug: "beras-premium-5kg",
    summary: "Beras kualitas premium dari Cianjur",
    base_price: 75000, discount_percent: 0, discount_amount: 0, final_price: 75000,
    currency_code: "IDR", unit_label: "karung", is_service: false,
    rating_avg: 4.8, rating_count: 12, status: "ACTIVE", is_featured: true,
    primary_image_url: null, wa_number: null, location_note: "Blok C",
    tags: ["beras", "sembako"],
  },
  {
    id: "e1000000-0000-7000-8000-000000000002", category_id: "c1000000-0000-7000-8000-000000000001",
    category_name: "Sembako", owner_display_name: "Warung Bu Siti",
    name: "Minyak Goreng 2L", slug: "minyak-goreng-2l",
    summary: "Minyak goreng kemasan 2 liter",
    base_price: 36000, discount_percent: 5, discount_amount: 1800, final_price: 34200,
    currency_code: "IDR", unit_label: "botol", is_service: false,
    rating_avg: 4.5, rating_count: 8, status: "ACTIVE", is_featured: false,
    primary_image_url: null, wa_number: null, location_note: "Blok A",
    tags: ["minyak", "sembako"],
  },
  {
    id: "e1000000-0000-7000-8000-000000000003", category_id: "c1000000-0000-7000-8000-000000000002",
    category_name: "Makanan & Minuman", owner_display_name: "Dapur Bu Ani",
    name: "Nasi Uduk Komplit", slug: "nasi-uduk-komplit",
    summary: "Nasi uduk + lauk lengkap, pagi hari",
    base_price: 15000, discount_percent: 0, discount_amount: 0, final_price: 15000,
    currency_code: "IDR", unit_label: "porsi", is_service: false,
    rating_avg: 4.9, rating_count: 25, status: "ACTIVE", is_featured: true,
    primary_image_url: null, wa_number: null, location_note: "Blok N",
    tags: ["nasi", "makanan", "sarapan"],
  },
  {
    id: "e1000000-0000-7000-8000-000000000004", category_id: "c1000000-0000-7000-8000-000000000002",
    category_name: "Makanan & Minuman", owner_display_name: "Kue Mba Rina",
    name: "Kue Lapis Legit", slug: "kue-lapis-legit",
    summary: "Kue lapis legit homemade, loyang kecil",
    base_price: 85000, discount_percent: 10, discount_amount: 8500, final_price: 76500,
    currency_code: "IDR", unit_label: "loyang", is_service: false,
    rating_avg: 5.0, rating_count: 6, status: "ACTIVE", is_featured: false,
    primary_image_url: null, wa_number: null, location_note: "Blok B",
    tags: ["kue", "makanan"],
  },
  {
    id: "e1000000-0000-7000-8000-000000000005", category_id: "c1000000-0000-7000-8000-000000000003",
    category_name: "Kerajinan Tangan", owner_display_name: "Craft by Dewi",
    name: "Tas Rajut Handmade", slug: "tas-rajut-handmade",
    summary: "Tas rajut katun warna-warni",
    base_price: 120000, discount_percent: 15, discount_amount: 18000, final_price: 102000,
    currency_code: "IDR", unit_label: "pcs", is_service: false,
    rating_avg: 4.7, rating_count: 3, status: "ACTIVE", is_featured: false,
    primary_image_url: null, wa_number: null, location_note: "Blok D",
    tags: ["tas", "rajut", "kerajinan"],
  },
  {
    id: "e1000000-0000-7000-8000-000000000006", category_id: "c1000000-0000-7000-8000-000000000004",
    category_name: "Sayur & Buah", owner_display_name: "Kebun Pak Agus",
    name: "Paket Sayur Segar", slug: "paket-sayur-segar",
    summary: "Bayam, kangkung, tomat, cabai — segar dari kebun",
    base_price: 25000, discount_percent: 0, discount_amount: 0, final_price: 25000,
    currency_code: "IDR", unit_label: "paket", is_service: false,
    rating_avg: 4.6, rating_count: 14, status: "ACTIVE", is_featured: true,
    primary_image_url: null, wa_number: null, location_note: "Blok E",
    tags: ["sayur", "segar"],
  },
];

export const MOCK_JASA_ITEMS: MarketplaceItemCard[] = [
  {
    id: "e2000000-0000-7000-8000-000000000001", category_id: "c2000000-0000-7000-8000-000000000001",
    category_name: "Kelistrikan", owner_display_name: "Pak Joko Listrik",
    name: "Perbaikan Instalasi Listrik", slug: "perbaikan-instalasi-listrik",
    summary: "Pasang baru, tambah daya, perbaikan arus pendek",
    base_price: 150000, discount_percent: 0, discount_amount: 0, final_price: 150000,
    currency_code: "IDR", unit_label: "kunjungan", is_service: true,
    rating_avg: 4.8, rating_count: 18, status: "ACTIVE", is_featured: true,
    primary_image_url: null, wa_number: null, location_note: "Blok F",
    tags: ["listrik", "instalasi"],
  },
  {
    id: "e2000000-0000-7000-8000-000000000002", category_id: "c2000000-0000-7000-8000-000000000002",
    category_name: "Jahit", owner_display_name: "Bu Ratna Taylor",
    name: "Jahit & Permak Pakaian", slug: "jahit-permak-pakaian",
    summary: "Potong, jahit baru, permak celana/baju",
    base_price: 50000, discount_percent: 0, discount_amount: 0, final_price: 50000,
    currency_code: "IDR", unit_label: "item", is_service: true,
    rating_avg: 4.9, rating_count: 10, status: "ACTIVE", is_featured: false,
    primary_image_url: null, wa_number: null, location_note: "Blok G",
    tags: ["jahit", "pakaian"],
  },
  {
    id: "e2000000-0000-7000-8000-000000000003", category_id: "c2000000-0000-7000-8000-000000000003",
    category_name: "Antar-Jemput", owner_display_name: "Bang Dedi Ojek",
    name: "Ojek Dalam Kompleks", slug: "ojek-dalam-kompleks",
    summary: "Antar jemput dalam area Sawangan Regensi",
    base_price: 10000, discount_percent: 0, discount_amount: 0, final_price: 10000,
    currency_code: "IDR", unit_label: "trip", is_service: true,
    rating_avg: 4.7, rating_count: 30, status: "ACTIVE", is_featured: true,
    primary_image_url: null, wa_number: null, location_note: null,
    tags: ["ojek", "antar-jemput"],
  },
  {
    id: "e2000000-0000-7000-8000-000000000004", category_id: "c2000000-0000-7000-8000-000000000004",
    category_name: "Bersih-bersih", owner_display_name: "Tim Bersih Blok A",
    name: "Bersih Rumah & Kantor", slug: "bersih-rumah-kantor",
    summary: "Deep clean rumah, pembersihan taman, garasi",
    base_price: 200000, discount_percent: 10, discount_amount: 20000, final_price: 180000,
    currency_code: "IDR", unit_label: "sesi", is_service: true,
    rating_avg: 4.5, rating_count: 7, status: "ACTIVE", is_featured: false,
    primary_image_url: null, wa_number: null, location_note: "Blok A",
    tags: ["bersih", "rumah"],
  },
];

export const MOCK_ALL_ITEMS: MarketplaceItemCard[] = [
  ...MOCK_UMKM_ITEMS,
  ...MOCK_JASA_ITEMS,
];

/* ─── Query helpers (swap for real Supabase calls later) ─────────────────── */

export function getItemsByCategory(categoryId: string): MarketplaceItemCard[] {
  return MOCK_ALL_ITEMS.filter((i) => i.category_id === categoryId && i.status === "ACTIVE");
}

export function getItemsByDomain(
  domainCode: MarketplaceDomainCode,
  categoryId?: string | null,
): MarketplaceItemCard[] {
  const categories =
    domainCode === "UMKM" ? MOCK_UMKM_CATEGORIES : MOCK_JASA_CATEGORIES;
  const categoryIds = new Set(categories.map((c) => c.id));
  return MOCK_ALL_ITEMS.filter((i) => {
    if (i.status !== "ACTIVE") return false;
    if (!categoryIds.has(i.category_id)) return false;
    if (categoryId && i.category_id !== categoryId) return false;
    return true;
  });
}

export function getCategoriesByDomain(
  domainCode: MarketplaceDomainCode,
): MarketplaceCategoryCard[] {
  return domainCode === "UMKM" ? MOCK_UMKM_CATEGORIES : MOCK_JASA_CATEGORIES;
}

export function getFeaturedItems(
  domainCode?: MarketplaceDomainCode,
): MarketplaceItemCard[] {
  const items = domainCode
    ? getItemsByDomain(domainCode)
    : MOCK_ALL_ITEMS.filter((i) => i.status === "ACTIVE");
  return items.filter((i) => i.is_featured);
}

/** Format IDR price (e.g. 75000 -> "Rp 75.000") */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
