import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import type { OrganisationTreeApi, OrganisationRoleApi, OrganisationMemberApi } from "@/lib/organisation-api";

/**
 * GET /api/organisation
 * Returns full organisation tree (roles + members) for the default tenant.
 * Requires authenticated session (organisasi page is behind login).
 */
export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data: roles, error: rolesError } = await supabase
      .from("organisation_roles")
      .select("id, title, sort_order")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .order("sort_order", { ascending: true });

    if (rolesError) {
      // eslint-disable-next-line no-console
      console.error("[Organisation] GET roles error:", rolesError);
      return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
    }

    if (!roles?.length) {
      return NextResponse.json({ roles: [] } satisfies OrganisationTreeApi);
    }

    const roleIds = roles.map((r) => r.id);
    const { data: members, error: membersError } = await supabase
      .from("organisation_members")
      .select("id, organisation_role_id, user_id, full_name, block_name, whatsapp_number, profile_picture_url, sort_order")
      .in("organisation_role_id", roleIds)
      .order("sort_order", { ascending: true });

    if (membersError) {
      // eslint-disable-next-line no-console
      console.error("[Organisation] GET members error:", membersError);
      return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
    }

    const memberList = members ?? [];
    const userIds = [...new Set(memberList.map((m) => m.user_id).filter(Boolean))] as string[];
    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
    let userAvatarMap: Record<string, string | null> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from("users")
        .select("id, avatar_path")
        .in("id", userIds);
      userAvatarMap = (users ?? []).reduce<Record<string, string | null>>((acc, u) => {
        acc[u.id] =
          u.avatar_path && baseUrl
            ? `${baseUrl}/storage/v1/object/public/avatars/${u.avatar_path}`
            : null;
        return acc;
      }, {});
    }

    const membersByRole = memberList.reduce<Record<string, OrganisationMemberApi[]>>((acc, m) => {
      const roleId = m.organisation_role_id;
      if (!acc[roleId]) acc[roleId] = [];
      const profilePictureUrl = m.user_id
        ? (userAvatarMap[m.user_id] ?? m.profile_picture_url ?? null)
        : (m.profile_picture_url ?? null);
      acc[roleId].push({
        id: m.id,
        userId: m.user_id ?? null,
        fullName: m.full_name,
        blockName: m.block_name ?? "",
        whatsappNumber: m.whatsapp_number,
        profilePictureUrl,
        sortOrder: m.sort_order ?? 0,
      });
      return acc;
    }, {});

    const tree: OrganisationTreeApi = {
      roles: roles.map((r) => ({
        id: r.id,
        title: r.title,
        sortOrder: r.sort_order ?? 0,
        members: membersByRole[r.id] ?? [],
      })),
    };

    return NextResponse.json(tree);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] GET error:", error);
    return NextResponse.json({ message: "Gagal memuat organisasi" }, { status: 500 });
  }
}
