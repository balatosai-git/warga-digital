/**
 * Shared in-app notification helpers.
 *
 * All exported helpers are best-effort: they never throw and only log errors,
 * so a notification failure never breaks the calling API route.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DAFTAR NOTIFIKASI — KAPAN DIKIRIM & KEPADA SIAPA
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. WARGA BARU TERDAFTAR
 *    Dipicu oleh : POST /api/auth/register — hanya saat akun benar-benar baru
 *                  dibuat (bukan warga lama yang mendaftar ulang).
 *    Dikirim ke  : Semua admin (RT_ADMIN, RW_ADMIN).
 *    Judul       : "Warga Baru Terdaftar"
 *    Isi         : "{nama} baru saja mendaftar dengan blok rumah {blok}."
 *
 * 2. WARGA DIBERIKAN ROLE
 *    Dipicu oleh : POST /api/admin/roles/[id]/users — saat admin menetapkan
 *                  role baru kepada warga.
 *    Dikirim ke  : (a) Warga yang mendapat role (pemberitahuan personal).
 *                  (b) Semua admin, kecuali admin yang melakukan aksi.
 *    Judul       : (a) "Role Baru Diberikan"
 *                  (b) "Role Diberikan ke Warga"
 *    Isi         : (a) "Anda telah diberikan role "{roleName}" oleh admin."
 *                  (b) "{actorName} memberikan role "{roleName}" kepada {targetName}."
 *
 * 3. WARGA MENGUBAH DATA PROFIL SENSITIF
 *    Dipicu oleh : PATCH /api/profile — hanya saat nomor WhatsApp, username,
 *                  atau email benar-benar berubah (nilai lama ≠ nilai baru).
 *    Dikirim ke  : Semua admin, kecuali warga yang mengubah profilnya sendiri.
 *    Judul       : "Profil Warga Diperbarui"
 *    Isi         : "{nama} mengubah {nomor WhatsApp / username / email}."
 *
 * 4. SUSUNAN PENGURUS RT DIPERBARUI
 *    Dipicu oleh : Salah satu dari:
 *                  • POST   /api/organisation/roles          → peran baru dibuat
 *                  • PATCH  /api/organisation/roles/[id]     → judul/urutan peran diubah
 *                  • DELETE /api/organisation/roles/[id]     → peran dihapus
 *                  • PATCH  /api/organisation/members/[id]   → slot anggota diisi / dikosongkan
 *                  • DELETE /api/organisation/members/[id]   → slot anggota dihapus
 *    Dikirim ke  : Semua warga aktif, kecuali admin yang melakukan perubahan.
 *    Judul       : "Pengurus RT Diperbarui"
 *    Isi         : Bervariasi sesuai aksi (misal: "{nama} telah ditambahkan ke
 *                  susunan pengurus RT." / "Peran baru "{title}" telah ditambahkan.")
 *
 * 5. TRANSAKSI PENGELUARAN KAS RT BARU
 *    Dipicu oleh : POST /api/kas-rt/transactions — hanya untuk transaksi
 *                  bertipe "expense" (pengeluaran).
 *    Dikirim ke  : Semua warga aktif, kecuali bendahara yang mencatat transaksi.
 *    Judul       : "Pengeluaran Kas RT Baru"
 *    Isi         : "{judul} – Rp {nominal} · Dicatat oleh: {nama}."
 *    Catatan     : Transaksi "income" (pemasukan) tetap hanya dikirim ke
 *                  pengguna yang memiliki role kas-RT (perilaku lama).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, ROLE_IDS_ADMIN } from "@/lib/constants/seed-ids";

type SupabaseClient = ReturnType<typeof createServerClient>;

export type NotificationInsert = {
  tenant_id: string;
  recipient_user_id: string;
  actor_user_id?: string | null;
  type: "SYSTEM" | "KAS_RT" | "RUMAH" | "ORGANISASI" | "MARKETPLACE";
  priority?: "LOW" | "NORMAL" | "HIGH";
  title: string;
  body: string;
  action_url?: string | null;
  entity_table?: string | null;
  entity_id?: string | null;
  dedupe_key?: string | null;
  metadata?: Record<string, unknown>;
  created_by?: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Recipient helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns every active user ID in the default tenant that currently holds at
 * least one admin role (as defined by ROLE_IDS_ADMIN).
 * Returns an empty array on any error.
 */
export async function getAdminUserIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  try {
    // 1. All non-revoked admin role assignments
    const { data: roleRows } = await supabase
      .from("tenant_user_roles")
      .select("tenant_user_id")
      .in("role_id", ROLE_IDS_ADMIN)
      .is("revoked_at", null);

    if (!roleRows?.length) return [];

    const tenantUserIds = (roleRows as { tenant_user_id: string }[]).map(
      (r) => r.tenant_user_id,
    );

    // 2. Resolve to user_ids, scoped to the default tenant & active status
    const { data: tuRows } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE")
      .in("id", tenantUserIds);

    return [
      ...new Set(
        ((tuRows ?? []) as { user_id: string }[])
          .map((r) => r.user_id)
          .filter(Boolean),
      ),
    ];
  } catch (err) {
    console.error("[Notifications] getAdminUserIds error:", err);
    return [];
  }
}

/**
 * Returns every active user ID in the default tenant.
 * Returns an empty array on any error.
 */
export async function getAllActiveUserIds(
  supabase: SupabaseClient,
): Promise<string[]> {
  try {
    const { data: rows } = await supabase
      .from("tenant_users")
      .select("user_id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("status", "ACTIVE");

    return [
      ...new Set(
        ((rows ?? []) as { user_id: string }[])
          .map((r) => r.user_id)
          .filter(Boolean),
      ),
    ];
  } catch (err) {
    console.error("[Notifications] getAllActiveUserIds error:", err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Insert helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bulk-insert notification rows.
 * Silently swallows errors (best-effort); callers should not rely on this
 * completing successfully before returning a response.
 */
export async function notifyMany(
  supabase: SupabaseClient,
  rows: NotificationInsert[],
  tag = "",
): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase
    .from("notifications")
    .insert(rows as unknown[]);
  if (error) {
    console.error(
      `[Notifications${tag ? ` – ${tag}` : ""}] Insert error:`,
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a notification to every admin user in the default tenant.
 *
 * When `base.dedupe_key` is provided, each row's key is automatically
 * suffixed with `:to:{userId}` so the DB unique index works correctly.
 *
 * `excludeUserId` – typically the actor; they are removed from the recipient
 * list so admins who performed the action don't notify themselves.
 */
export async function notifyAdmins(
  supabase: SupabaseClient,
  base: Omit<NotificationInsert, "recipient_user_id">,
  excludeUserId?: string | null,
): Promise<void> {
  try {
    const adminIds = await getAdminUserIds(supabase);
    const recipients = excludeUserId
      ? adminIds.filter((id) => id !== excludeUserId)
      : adminIds;

    if (!recipients.length) return;

    const rows: NotificationInsert[] = recipients.map((userId) => ({
      ...base,
      recipient_user_id: userId,
      dedupe_key: base.dedupe_key
        ? `${base.dedupe_key}:to:${userId}`
        : undefined,
    }));

    await notifyMany(supabase, rows, base.title);
  } catch (err) {
    console.error("[Notifications] notifyAdmins error:", err);
  }
}

/**
 * Send a notification to every active user in the default tenant.
 *
 * When `base.dedupe_key` is provided, each row's key is automatically
 * suffixed with `:to:{userId}` so the DB unique index works correctly.
 *
 * `excludeUserId` – typically the actor; they are removed from the recipient
 * list so the person who triggered the event doesn't notify themselves.
 */
export async function notifyAllActiveUsers(
  supabase: SupabaseClient,
  base: Omit<NotificationInsert, "recipient_user_id">,
  excludeUserId?: string | null,
): Promise<void> {
  try {
    const userIds = await getAllActiveUserIds(supabase);
    const recipients = excludeUserId
      ? userIds.filter((id) => id !== excludeUserId)
      : userIds;

    if (!recipients.length) return;

    const rows: NotificationInsert[] = recipients.map((userId) => ({
      ...base,
      recipient_user_id: userId,
      dedupe_key: base.dedupe_key
        ? `${base.dedupe_key}:to:${userId}`
        : undefined,
    }));

    await notifyMany(supabase, rows, base.title);
  } catch (err) {
    console.error("[Notifications] notifyAllActiveUsers error:", err);
  }
}
