import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, DEFAULT_COMMUNITY_ID } from "@/lib/constants/seed-ids";
import { requireAdmin } from "@/lib/auth/admin-guard";

interface AdminHouseRow {
  id: string;
  blok_rumah: string | null;
  name: string;
  address: string | null;
  total_residents: number;
  residents: Array<{
    user_id: string;
    full_name: string;
    relationship: string | null;
  }>;
  status: string;
  is_active: boolean;
  owner_full_name: string | null;
  source_full_name: string | null;
}

/**
 * GET /api/admin/houses
 * Returns active house blocks for admin list page.
 */
export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const tenantUser = await requireAdmin(supabase, session.userId);
  if (!tenantUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("houses")
    .select(
      [
        "id",
        "blok_rumah",
        "name",
        "address",
        "status",
        "is_active",
        "user_houses!left(user_id, relationship, status, users!user_houses_user_id_fkey(full_name))",
        "system_preregistered_house_owners!left(source_full_name, status)",
      ].join(","),
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("community_id", DEFAULT_COMMUNITY_ID)
    .eq("is_active", true)
    .order("blok_rumah", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[admin/houses] GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<
    Omit<
      AdminHouseRow,
      "total_residents" | "residents" | "owner_full_name" | "source_full_name"
    > & {
      user_houses?: Array<{
        user_id: string | null;
        relationship: string | null;
        status: string | null;
        users:
          | { full_name: string | null }
          | Array<{ full_name: string | null }>
          | null;
      }>;
      system_preregistered_house_owners?: Array<{
        source_full_name: string | null;
        status: string | null;
      }>;
    }
  >;

  const houses: AdminHouseRow[] = rows.map((row) => {
    const activeResidentLinks = (row.user_houses ?? []).filter(
      (link) => link.status === "ACTIVE",
    );
    const residentMap = new Map<
      string,
      {
        user_id: string;
        full_name: string;
        relationship: string | null;
      }
    >();
    for (const link of activeResidentLinks) {
      const userId = link.user_id?.trim();
      if (!userId || residentMap.has(userId)) continue;
      const fullNameRaw = Array.isArray(link.users)
        ? (link.users[0]?.full_name ?? null)
        : (link.users?.full_name ?? null);
      residentMap.set(userId, {
        user_id: userId,
        full_name: fullNameRaw?.trim() || "Tanpa nama",
        relationship: link.relationship,
      });
    }
    const residents = Array.from(residentMap.values());
    const totalResidents = residents.length;

    const ownerFullName =
      activeResidentLinks
        .filter((link) => link.relationship === "OWNER")
        .map((link) =>
          Array.isArray(link.users)
            ? (link.users[0]?.full_name ?? null)
            : (link.users?.full_name ?? null),
        )
        .find((fullName) => Boolean(fullName?.trim())) ?? null;

    const sourceFullName =
      (row.system_preregistered_house_owners ?? [])
        .find((entry) => entry.status === "PRE_REGISTERED")
        ?.source_full_name?.trim() ?? null;

    return {
      id: row.id,
      blok_rumah: row.blok_rumah,
      name: ownerFullName ?? sourceFullName ?? "",
      address: row.address,
      total_residents: totalResidents,
      residents,
      status: row.status,
      is_active: row.is_active,
      owner_full_name: ownerFullName,
      source_full_name: sourceFullName,
    };
  });

  return NextResponse.json({ houses });
}
