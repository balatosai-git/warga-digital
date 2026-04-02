"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

export interface KasRtCategoryRow {
  id: string;
  name: string;
  applies_to: "income" | "expense" | "both";
  title_template: string;
  desc_template: string;
  sort_order: number;
}

export async function GET() {
  try {
    // Require authentication to access kas-rt categories
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("kas_rt_transaction_categories")
      .select("id, name, applies_to, title_template, desc_template, sort_order")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("[Kas RT] Fetch categories error:", error);
      return NextResponse.json(
        { message: "Gagal memuat kategori kas RT." },
        { status: 500 },
      );
    }

    return NextResponse.json((data ?? []) as KasRtCategoryRow[]);
  } catch (error) {
    console.error("[Kas RT] Unexpected GET categories error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat kategori." },
      { status: 500 },
    );
  }
}
