import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

interface NotificationPatchBody {
  markAllRead?: true;
  notificationId?: string;
}

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, type, priority, title, body, action_url, metadata, read_at, created_at",
      )
      .eq("recipient_user_id", session.userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Notifications GET] Supabase error:", error);
      return NextResponse.json(
        { error: "Gagal memuat notifikasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      notifications: (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        priority: row.priority,
        title: row.title,
        body: row.body,
        actionUrl: row.action_url ?? null,
        metadata: row.metadata ?? {},
        readAt: row.read_at ?? null,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error("[Notifications GET] Unexpected error:", error);
    return NextResponse.json(
      { error: "Gagal memuat notifikasi" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<NotificationPatchBody>;
    const supabase = createServerClient();
    const nowIso = new Date().toISOString();

    if (body.markAllRead === true) {
      const { error } = await supabase
        .from("notifications")
        .update({
          read_at: nowIso,
          updated_at: nowIso,
          updated_by: session.userId,
        })
        .eq("recipient_user_id", session.userId)
        .is("read_at", null);

      if (error) {
        console.error("[Notifications PATCH] markAll error:", error);
        return NextResponse.json(
          { error: "Gagal menandai notifikasi" },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, mode: "all" });
    }

    if (!body.notificationId || typeof body.notificationId !== "string") {
      return NextResponse.json(
        { error: "notificationId tidak valid" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({
        read_at: nowIso,
        updated_at: nowIso,
        updated_by: session.userId,
      })
      .eq("id", body.notificationId)
      .eq("recipient_user_id", session.userId)
      .is("read_at", null);

    if (error) {
      console.error("[Notifications PATCH] single error:", error);
      return NextResponse.json(
        { error: "Gagal menandai notifikasi" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, mode: "single" });
  } catch (error) {
    console.error("[Notifications PATCH] Unexpected error:", error);
    return NextResponse.json(
      { error: "Gagal memproses notifikasi" },
      { status: 500 },
    );
  }
}
