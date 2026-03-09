import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";
import { requireCanManageOrganisation } from "../require-manage";

/**
 * POST /api/organisation/roles
 * Body: { title: string, sortOrder?: number }
 * Creates a new organisation role for the default tenant.
 */
export async function POST(request: Request) {
  const forbidden = await requireCanManageOrganisation();
  if (forbidden) return forbidden;

  try {
    const body = (await request.json()) as { title?: string; sortOrder?: number };
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ message: "Judul peran wajib diisi." }, { status: 400 });
    }
    const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? body.sortOrder : 0;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("organisation_roles")
      .insert({
        tenant_id: DEFAULT_TENANT_ID,
        title,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      })
      .select("id, title, sort_order")
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.error("[Organisation] POST role error:", error);
      return NextResponse.json({ message: "Gagal menambah peran." }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      sortOrder: data.sort_order ?? 0,
      members: [],
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Organisation] POST role error:", error);
    return NextResponse.json({ message: "Gagal menambah peran." }, { status: 500 });
  }
}
