import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { THEMES } from "@/lib/themes";
import {
  normalizeWaNumber,
  validateNormalizedWaNumber,
} from "@/lib/phone-utils";
import { notifyAdmins } from "@/lib/notifications";

/** Format IDR amount as "Rp X.XXX" / "Rp X,XJt" / "Rp X,XM" */
function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1).replace(".", ",")} Jt`;
  }
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/** Mask WA number for display (e.g. +62 812-****-5678) */
function maskWaNumber(wa: string | null): string | null {
  if (!wa || wa.length < 6) return wa;
  const digits = wa.replace(/\D/g, "");
  if (digits.length < 10) return "+62 ***";
  const last = digits.slice(-4);
  return `+62 ***-****-${last}`;
}

/**
 * GET /api/profile
 * Returns current user profile (and primary house if any). Requires session.
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "id, full_name, username, wa_number, email, date_of_birth, status, created_at, avatar_path, theme_id",
      )
      .eq("id", session.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Profil tidak ditemukan" },
        { status: 404 },
      );
    }

    // All active house links (multiple residences: different tenants/communities)
    const { data: allLinks } = await supabase
      .from("user_houses")
      .select("house_id, tenant_id, is_primary")
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .order("is_primary", { ascending: false });

    type HouseMember = {
      userId: string;
      fullName: string;
      username: string | null;
      relationship: string;
      isPrimary: boolean;
    };
    type Residence = {
      tenant: { id: string; name: string };
      community: { id: string; code: string; name: string | null };
      house: {
        houseId: string;
        blok_rumah: string | null;
        address: string | null;
        name: string;
        members: HouseMember[];
      };
      isPrimary: boolean;
      roles: Array<{ id: number; name: string; description: string | null }>;
    };

    const residences: Residence[] = [];

    if (allLinks && allLinks.length > 0) {
      for (const link of allLinks as {
        house_id: string;
        tenant_id: string;
        is_primary?: boolean;
      }[]) {
        const houseId = link.house_id;
        const tenantId = link.tenant_id;
        const isPrimary = link.is_primary ?? false;

        const [houseRes, membersRes, tenantRes] = await Promise.all([
          supabase
            .from("houses")
            .select("blok_rumah, address, name, community_id")
            .eq("id", houseId)
            .single(),
          supabase
            .from("user_houses")
            .select(
              "user_id, relationship, is_primary, users!user_houses_user_id_fkey(full_name, username)",
            )
            .eq("house_id", houseId)
            .eq("status", "ACTIVE")
            .order("is_primary", { ascending: false }),
          supabase
            .from("tenants")
            .select("id, name")
            .eq("id", tenantId)
            .single(),
        ]);

        const houseRow = houseRes.data as {
          blok_rumah: string | null;
          address: string | null;
          name: string;
          community_id?: string;
        } | null;
        const memberRows = membersRes.data ?? [];
        const communityId = houseRow?.community_id;
        const tenantRow = tenantRes.data as { id: string; name: string } | null;

        if (!houseRow || !tenantRow) continue;

        let community: {
          id: string;
          code: string;
          name: string | null;
        } | null = null;
        if (communityId) {
          const { data: communityRow } = await supabase
            .from("communities")
            .select("id, code, name")
            .eq("id", communityId)
            .single();
          if (communityRow) {
            community = {
              id: communityRow.id,
              code: communityRow.code,
              name: communityRow.name ?? null,
            };
          }
        }
        if (!community) {
          community = { id: "", code: "", name: null };
        }

        type MemberRow = {
          user_id: string;
          relationship: string;
          is_primary?: boolean;
          users:
            | { full_name: string; username: string | null }
            | { full_name: string; username: string | null }[]
            | null;
        };
        const members: HouseMember[] = (memberRows as MemberRow[]).map(
          (row) => {
            const u = Array.isArray(row.users) ? row.users[0] : row.users;
            return {
              userId: row.user_id,
              fullName: u?.full_name ?? "—",
              username: u?.username ?? null,
              relationship: row.relationship,
              isPrimary: row.is_primary ?? false,
            };
          },
        );

        const { data: tenantUserRow } = await supabase
          .from("tenant_users")
          .select("id")
          .eq("user_id", session.userId)
          .eq("tenant_id", tenantId)
          .eq("status", "ACTIVE")
          .maybeSingle();
        let roles: Array<{
          id: number;
          name: string;
          description: string | null;
        }> = [];
        if (tenantUserRow?.id) {
          const { data: turRows } = await supabase
            .from("tenant_user_roles")
            .select("role_id")
            .eq("tenant_user_id", tenantUserRow.id)
            .is("revoked_at", null);
          if (turRows && turRows.length > 0) {
            const roleIds = [
              ...new Set(
                (turRows as { role_id: number }[]).map((r) => r.role_id),
              ),
            ];
            const { data: roleRows } = await supabase
              .from("roles")
              .select("id, name, description")
              .in("id", roleIds);
            if (roleRows)
              roles = roleRows.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description ?? null,
              }));
          }
        }

        residences.push({
          tenant: { id: tenantRow.id, name: tenantRow.name },
          community,
          house: {
            houseId,
            blok_rumah: houseRow.blok_rumah ?? null,
            address: houseRow.address ?? null,
            name: houseRow.name ?? "",
            members,
          },
          isPrimary,
          roles,
        });
      }
    }

    const firstResidence = residences[0] ?? null;
    const house = firstResidence?.house ?? null;

    // Pending join requests for houses where current user is OWNER
    const { data: ownedHouseLinks } = await supabase
      .from("user_houses")
      .select("house_id")
      .eq("user_id", session.userId)
      .eq("relationship", "OWNER")
      .eq("status", "ACTIVE");

    let pendingJoinRequests: Array<{
      id: string;
      houseId: string;
      requesterFullName: string;
      blokRumah: string;
      createdAt: string;
    }> = [];
    if (ownedHouseLinks && ownedHouseLinks.length > 0) {
      const ownedHouseIds = ownedHouseLinks.map((r) => r.house_id);
      const { data: requests } = await supabase
        .from("house_join_requests")
        .select("id, requester_user_id, house_id, created_at")
        .in("house_id", ownedHouseIds)
        .eq("status", "PENDING");

      if (requests && requests.length > 0) {
        const houseIds = [...new Set(requests.map((r) => r.house_id))];
        const { data: houses } = await supabase
          .from("houses")
          .select("id, blok_rumah")
          .in("id", houseIds);
        const houseMap = new Map(
          (houses ?? []).map((h) => [h.id, h.blok_rumah ?? "—"]),
        );
        const requesterIds = [
          ...new Set(requests.map((r) => r.requester_user_id)),
        ];
        const { data: users } = await supabase
          .from("users")
          .select("id, full_name")
          .in("id", requesterIds);
        const userMap = new Map(
          (users ?? []).map((u) => [u.id, u.full_name ?? "—"]),
        );
        pendingJoinRequests = requests.map((r) => ({
          id: r.id,
          houseId: r.house_id,
          requesterFullName: userMap.get(r.requester_user_id) ?? "—",
          blokRumah: houseMap.get(r.house_id) ?? "—",
          createdAt: r.created_at,
        }));
      }
    }

    // If user has no house, check for pending join request (requester side)
    let pendingJoinRequest: {
      blokRumah: string;
      ownerFullName: string;
      status: string;
    } | null = null;
    if (!firstResidence) {
      const { data: myRequest } = await supabase
        .from("house_join_requests")
        .select("id, house_id")
        .eq("requester_user_id", session.userId)
        .eq("status", "PENDING")
        .maybeSingle();

      if (myRequest?.house_id) {
        const { data: houseRow } = await supabase
          .from("houses")
          .select("blok_rumah")
          .eq("id", myRequest.house_id)
          .single();
        const blokRumah = houseRow?.blok_rumah ?? "—";
        const { data: ownerLink } = await supabase
          .from("user_houses")
          .select("user_id")
          .eq("house_id", myRequest.house_id)
          .eq("relationship", "OWNER")
          .eq("status", "ACTIVE")
          .limit(1)
          .maybeSingle();
        let ownerFullName = "—";
        if (ownerLink?.user_id) {
          const { data: ownerUser } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", ownerLink.user_id)
            .single();
          ownerFullName = ownerUser?.full_name ?? "—";
        }
        pendingJoinRequest = { blokRumah, ownerFullName, status: "PENDING" };
      }
    }

    const tenant = firstResidence?.tenant ?? null;
    const community = firstResidence?.community ?? null;

    // Deduplicated union of roles across ALL residences (not just the first one).
    // A user who lives in multiple houses may hold an admin role in a non-primary
    // residence; flattening here ensures profile.roles is always complete.
    const seenRoleIds = new Set<number>();
    const roles = residences
      .flatMap((r) => r.roles)
      .filter((role) => {
        if (seenRoleIds.has(role.id)) return false;
        seenRoleIds.add(role.id);
        return true;
      });

    // Badges (user's earned badges)
    const { data: userBadgeRows } = await supabase
      .from("user_badges")
      .select("badge_id, earned_at")
      .eq("user_id", session.userId)
      .order("earned_at", { ascending: false });
    const badges: Array<{
      id: number;
      code: string;
      name: string;
      description: string | null;
      icon: string;
      earnedAt: string;
    }> = [];
    if (userBadgeRows && userBadgeRows.length > 0) {
      const badgeIds = [
        ...new Set(
          (userBadgeRows as { badge_id: number; earned_at: string }[]).map(
            (r) => r.badge_id,
          ),
        ),
      ];
      const { data: badgeRows } = await supabase
        .from("badges")
        .select("id, code, name, description, icon, sort_order")
        .in("id", badgeIds);
      const earnedAtMap = new Map(
        (userBadgeRows as { badge_id: number; earned_at: string }[]).map(
          (r) => [r.badge_id, r.earned_at],
        ),
      );
      if (badgeRows) {
        badgeRows.sort((a, b) => a.sort_order - b.sort_order);
        for (const b of badgeRows) {
          badges.push({
            id: b.id,
            code: b.code,
            name: b.name,
            description: b.description ?? null,
            icon: b.icon,
            earnedAt: earnedAtMap.get(b.id) ?? b.id.toString(),
          });
        }
      }
    }

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const profilePictureUrl =
      user.avatar_path && baseUrl
        ? `${baseUrl}/storage/v1/object/public/avatars/${user.avatar_path}`
        : null;

    const themeId = (user as { theme_id?: string }).theme_id ?? "green";

    /* ── Wallet balance (sum of income − expense from wallet_transactions) ── */
    const [walletIncomeRes, walletExpenseRes] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("user_id", session.userId)
        .eq("tenant_id", DEFAULT_TENANT_ID)
        .eq("type", "income"),
      supabase
        .from("wallet_transactions")
        .select("amount")
        .eq("user_id", session.userId)
        .eq("tenant_id", DEFAULT_TENANT_ID)
        .eq("type", "expense"),
    ]);

    const sumWallet = (rows: { amount: number }[] | null): number =>
      (rows ?? []).reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    const walletIncome = sumWallet(
      walletIncomeRes.data as { amount: number }[] | null,
    );
    const walletExpense = sumWallet(
      walletExpenseRes.data as { amount: number }[] | null,
    );
    const walletBalance = walletIncome - walletExpense;

    return NextResponse.json({
      id: user.id,
      fullName: user.full_name,
      username: user.username ?? null,
      waNumber: user.wa_number ?? null,
      waNumberMasked: maskWaNumber(user.wa_number),
      email: user.email ?? null,
      dateOfBirth: user.date_of_birth ?? null,
      status: user.status,
      createdAt: user.created_at,
      profilePictureUrl,
      themeId,
      tenant,
      community,
      roles,
      badges,
      house,
      residences,
      pendingJoinRequests,
      pendingJoinRequest,
      walletBalance,
      walletBalanceFormatted: formatRupiah(Math.max(walletBalance, 0)),
    });
  } catch (err) {
    console.error("[Profile GET] Error:", err);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

/** Valid theme ids for appearance (must match src/lib/themes.ts) */
const VALID_THEME_IDS = THEMES.map((t) => t.id);

/** Allowed fields for profile update (no wa_number, pin_hash, status) */
const ALLOWED_KEYS = [
  "full_name",
  "email",
  "date_of_birth",
  "username",
  "theme_id",
  "wa_number",
] as const;

/**
 * PATCH /api/profile
 * Update current user profile. Requires session.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        const v = body[key];
        if (key === "username") {
          if (v === null || v === "") {
            updates[key] = null;
          } else if (typeof v === "string") {
            const trimmed = v.trim();
            if (trimmed.length < 3 || trimmed.length > 30) {
              return NextResponse.json(
                { error: "Username harus 3–30 karakter" },
                { status: 400 },
              );
            }
            if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
              return NextResponse.json(
                { error: "Username hanya huruf, angka, dan underscore" },
                { status: 400 },
              );
            }
            updates[key] = trimmed;
          }
        } else if (key === "wa_number") {
          if (v === null || v === "") {
            updates[key] = null;
          } else if (typeof v === "string") {
            const normalized = normalizeWaNumber(v.trim());
            const waError = validateNormalizedWaNumber(normalized);
            if (waError) {
              return NextResponse.json({ error: waError }, { status: 400 });
            }
            updates[key] = normalized;
          }
        } else if (key === "theme_id") {
          if (typeof v !== "string" || !v.trim()) {
            updates[key] = "green";
          } else if (VALID_THEME_IDS.includes(v.trim())) {
            updates[key] = v.trim();
          } else {
            return NextResponse.json(
              { error: "Tema tidak valid" },
              { status: 400 },
            );
          }
        } else if (key === "full_name") {
          if (typeof v !== "string" || !v.trim()) {
            return NextResponse.json(
              { error: "Nama lengkap wajib diisi" },
              { status: 400 },
            );
          }
          if (v.trim().length < 2) {
            return NextResponse.json(
              { error: "Nama minimal 2 karakter" },
              { status: 400 },
            );
          }
          updates.full_name = v.trim();
        } else if (key === "email") {
          updates[key] =
            v === null || v === "" ? null : String(v).trim() || null;
        } else if (key === "date_of_birth") {
          updates[key] =
            v === null || v === "" ? null : String(v).trim() || null;
        }
      }
    }

    // Validation: username or wa_number must not both be empty
    const hasUsername =
      updates.username !== null &&
      updates.username !== undefined &&
      updates.username !== "";
    const hasWaNumber =
      updates.wa_number !== null &&
      updates.wa_number !== undefined &&
      updates.wa_number !== "";
    const updatingUsername = "username" in body;
    const updatingWaNumber = "wa_number" in body;

    if (updatingUsername || updatingWaNumber) {
      // Get current user's data to check existing values
      const supabaseForCheck = createServerClient();
      const { data: currentUser } = await supabaseForCheck
        .from("users")
        .select("username, wa_number")
        .eq("id", session.userId)
        .single();

      const finalUsername = updatingUsername
        ? (updates.username ?? null)
        : (currentUser?.username ?? null);
      const finalWaNumber = updatingWaNumber
        ? (updates.wa_number ?? null)
        : (currentUser?.wa_number ?? null);

      if (!finalUsername && !finalWaNumber) {
        return NextResponse.json(
          {
            error:
              "Username atau nomor WhatsApp wajib diisi (minimal satu harus aktif)",
          },
          { status: 400 },
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diubah" },
        { status: 400 },
      );
    }

    updates.updated_at = new Date().toISOString();
    updates.updated_by = session.userId;

    // ── Pre-fetch old values for change-detection (wa_number, username, email) ─
    const sensitiveKeys = ["wa_number", "username", "email"] as const;
    const trackingFields = sensitiveKeys.filter((k) => k in body);
    let oldSensitiveValues: {
      wa_number?: string | null;
      username?: string | null;
      email?: string | null;
      full_name?: string | null;
    } = {};
    if (trackingFields.length > 0) {
      const supabasePre = createServerClient();
      const { data: preUser } = await supabasePre
        .from("users")
        .select("wa_number, username, email, full_name")
        .eq("id", session.userId)
        .single();
      oldSensitiveValues = (preUser as typeof oldSensitiveValues) ?? {};
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", session.userId)
      .select(
        "id, full_name, username, wa_number, email, date_of_birth, theme_id, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Username, email, atau nomor WhatsApp sudah dipakai" },
          { status: 409 },
        );
      }
      console.error("[Profile PATCH] Supabase error:", error);
      return NextResponse.json(
        { error: "Gagal menyimpan profil" },
        { status: 500 },
      );
    }

    // ── Notify all admins if a sensitive field actually changed ───────────────
    if (trackingFields.length > 0) {
      const changedLabels: string[] = [];
      if (
        "wa_number" in body &&
        String(updates.wa_number ?? "") !==
          String(oldSensitiveValues.wa_number ?? "")
      ) {
        changedLabels.push("nomor WhatsApp");
      }
      if (
        "username" in body &&
        String(updates.username ?? "") !==
          String(oldSensitiveValues.username ?? "")
      ) {
        changedLabels.push("username");
      }
      if (
        "email" in body &&
        String(updates.email ?? "") !== String(oldSensitiveValues.email ?? "")
      ) {
        changedLabels.push("email");
      }

      if (changedLabels.length > 0) {
        const displayName =
          (data as { full_name?: string | null }).full_name?.trim() ||
          oldSensitiveValues.full_name?.trim() ||
          "Warga";
        await notifyAdmins(
          supabase,
          {
            tenant_id: DEFAULT_TENANT_ID,
            actor_user_id: session.userId,
            type: "SYSTEM",
            priority: "NORMAL",
            title: "Profil Warga Diperbarui",
            body: `${displayName} mengubah ${changedLabels.join(" dan ")}.`,
            action_url: "/admin/warga",
            entity_table: "users",
            entity_id: session.userId,
            metadata: { changedFields: changedLabels },
            created_by: session.userId,
          },
          session.userId, // exclude the actor (they changed their own profile)
        );
      }
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: data.id,
        fullName: data.full_name,
        username: data.username ?? null,
        waNumber: maskWaNumber(data.wa_number),
        email: data.email ?? null,
        dateOfBirth: data.date_of_birth ?? null,
        themeId: (data as { theme_id?: string }).theme_id ?? "green",
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error("[Profile PATCH] Error:", err);
    return NextResponse.json(
      { error: "Gagal menyimpan profil" },
      { status: 500 },
    );
  }
}
