import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";

const AVATAR_BUCKET = "avatars";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/**
 * POST /api/profile/avatar
 * Upload profile picture. Expects multipart/form-data with field "file".
 * Replaces existing avatar. Returns new profilePictureUrl.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File tidak ditemukan. Gunakan field 'file'." },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Format tidak didukung. Gunakan JPEG, PNG, WebP, atau HEIC." },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const safeExt = ["jpeg", "jpg", "png", "webp", "heic"].includes(ext)
      ? ext
      : "jpg";
    const path = `${session.userId}/avatar.${safeExt}`;

    const supabase = createServerClient();
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Profile avatar] Upload error:", uploadError);
      return NextResponse.json(
        { error: "Gagal mengunggah foto. Coba lagi." },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        avatar_path: path,
        updated_at: new Date().toISOString(),
        updated_by: session.userId,
      })
      .eq("id", session.userId);

    if (updateError) {
      console.error("[Profile avatar] Update user error:", updateError);
      return NextResponse.json(
        { error: "Gagal menyimpan referensi foto." },
        { status: 500 },
      );
    }

    const baseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? "";
    const profilePictureUrl = baseUrl
      ? `${baseUrl}/storage/v1/object/public/avatars/${path}`
      : null;

    return NextResponse.json({
      success: true,
      profilePictureUrl,
    });
  } catch (err) {
    console.error("[Profile avatar] Error:", err);
    return NextResponse.json(
      { error: "Gagal mengunggah foto profil." },
      { status: 500 },
    );
  }
}
