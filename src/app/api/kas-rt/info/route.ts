import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TENANT_ID, DEFAULT_COMMUNITY_ID } from "@/lib/constants/seed-ids";

export interface KasRtInfoResponse {
  communityName: string;
}

export async function GET() {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { communityName: "Warga Digital" },
        { status: 200 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("communities")
      .select("name")
      .eq("tenant_id", tenantId)
      .eq("id", communityId)
      .maybeSingle();

    if (error || !data?.name) {
      console.warn("[Kas RT Info] Could not fetch community name:", error);
      return NextResponse.json(
        { communityName: "Warga Digital" },
        { status: 200 },
      );
    }

    return NextResponse.json({
      communityName: data.name,
    } as KasRtInfoResponse);
  } catch (error) {
    console.error("[Kas RT Info] Unexpected error:", error);
    return NextResponse.json(
      { communityName: "Warga Digital" },
      { status: 200 },
    );
  }
}
