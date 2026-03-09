"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
  ROLE_IDS_CAN_SUBMIT_KAS_RT,
} from "@/lib/constants/seed-ids";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    let title: string | undefined;
    let amount: number | undefined;
    let type: "income" | "expense" | undefined;
    let date: string | undefined;
    let reference: string | undefined | null;
    let details: string | undefined | null;
    let category: string | undefined | null;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const getString = (key: string) => {
        const value = form.get(key);
        return typeof value === "string" ? value : null;
      };

      title = getString("title") ?? undefined;
      const amountRaw = getString("amount");
      amount = amountRaw != null ? Number(amountRaw) : undefined;
      const typeRaw = getString("type");
      type = typeRaw === "income" || typeRaw === "expense" ? typeRaw : undefined;
      date = getString("date") ?? undefined;
      reference = getString("reference");
      details = getString("details");
      const catRaw = getString("category");
      category = catRaw != null && String(catRaw).trim() ? String(catRaw).trim() : null;

      files = form
        .getAll("attachments")
        .filter((value): value is File => value instanceof File);
    } else {
      const body = (await request.json()) as {
        title?: string;
        amount?: number;
        type?: "income" | "expense";
        date?: string;
        reference?: string | null;
        details?: string | null;
        category?: string | null;
      };
      title = body.title;
      amount = body.amount;
      type = body.type;
      date = body.date;
      reference = body.reference ?? null;
      details = body.details ?? null;
      category = body.category != null && String(body.category).trim() ? String(body.category).trim() : null;
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { message: "Judul transaksi wajib diisi." },
        { status: 400 }
      );
    }

    if (amount == null || typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Nominal transaksi tidak valid." },
        { status: 400 }
      );
    }

    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { message: "Jenis transaksi tidak valid." },
        { status: 400 }
      );
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { message: "Tanggal transaksi wajib diisi." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }

    const session = await getSessionFromCookie();
    if (!session) {
      return NextResponse.json(
        { message: "Anda harus masuk untuk mencatat transaksi." },
        { status: 401 }
      );
    }
    const supabaseAuth = createServerClient();
    const { data: tenantUser } = await supabaseAuth
      .from("tenant_users")
      .select("id")
      .eq("tenant_id", DEFAULT_TENANT_ID)
      .eq("user_id", session.userId)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (!tenantUser) {
      return NextResponse.json(
        { message: "Akses ditolak." },
        { status: 403 }
      );
    }
    const { data: roleAssignments } = await supabaseAuth
      .from("tenant_user_roles")
      .select("id")
      .eq("tenant_user_id", tenantUser.id)
      .in("role_id", ROLE_IDS_CAN_SUBMIT_KAS_RT)
      .is("revoked_at", null);
    if (!roleAssignments?.length) {
      return NextResponse.json(
        { message: "Anda tidak memiliki izin untuk mencatat transaksi kas RT." },
        { status: 403 }
      );
    }

    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 }
      );
    }

    const supabase = createServerClient();

    const detailsValue = (details ?? "").trim() || null;

    const { data, error } = await supabase
      .from("kas_rt_transactions")
      .insert({
        tenant_id: tenantId,
        community_id: communityId,
        title: title.trim(),
        amount,
        type,
        date,
        reference: reference?.trim() || null,
        details: detailsValue,
        category: category?.trim() || null,
      })
      .select(
        "id, title, amount, type, date, reference, details, category"
      )
      .single();

    if (error || !data) {
      console.error("[Kas RT] Insert transaction error:", error);
      return NextResponse.json(
        { message: "Gagal menyimpan transaksi kas RT." },
        { status: 500 }
      );
    }

    const attachmentNames: string[] = [];
    const attachmentsToInsert: {
      transaction_id: string;
      file_name: string;
      storage_path: string;
      mime_type: string | null;
      size_bytes: number;
    }[] = [];

    if (files.length > 0) {
      const bucketId =
        process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";

      for (const file of files) {
        try {
          const extension =
            file.name.includes(".") && file.name.split(".").length > 1
              ? file.name.split(".").pop()
              : "bin";
          const path = `${data.id}/${Date.now()}-${
            Math.random().toString(36).slice(2)
          }.${extension}`;

          const uploadResult = await supabase.storage
            .from(bucketId)
            .upload(path, file, {
              contentType: file.type || undefined,
            });

          if (uploadResult.error) {
            console.error(
              "[Kas RT] Upload attachment error:",
              uploadResult.error
            );
            continue;
          }

          attachmentsToInsert.push({
            transaction_id: data.id,
            file_name: file.name,
            storage_path: path,
            mime_type: file.type || null,
            size_bytes: file.size,
          });

          attachmentNames.push(file.name);
        } catch (err) {
          console.error("[Kas RT] Unexpected upload error:", err);
        }
      }

      if (attachmentsToInsert.length > 0) {
        const { error: attachmentError } = await supabase
          .from("kas_rt_attachments")
          .insert(attachmentsToInsert);
        if (attachmentError) {
          console.error(
            "[Kas RT] Insert attachment rows error:",
            attachmentError
          );
        }
      }
    }

    const attachmentPayload: { file_name: string; url: string; mime_type: string | null }[] = [];
    if (files.length > 0 && attachmentsToInsert.length > 0) {
      const bucketId =
        process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
      const signedUrlExpiresIn = 3600;
      for (const att of attachmentsToInsert) {
        const { data: signed } = await supabase.storage
          .from(bucketId)
          .createSignedUrl(att.storage_path, signedUrlExpiresIn);
        attachmentPayload.push({
          file_name: att.file_name,
          url: signed?.signedUrl ?? "",
          mime_type: att.mime_type,
        });
      }
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      amount: Number(data.amount),
      type: data.type,
      date: data.date,
      reference: data.reference ?? "",
      details: data.details ?? "",
      category: data.category ?? null,
      attachments: attachmentPayload,
    });
  } catch (error) {
    console.error("[Kas RT] Unexpected error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan transaksi." },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get("category")?.trim() || null;

    const supabase = createServerClient();

    let query = supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, reference, details, category, kas_rt_attachments(file_name, storage_path, mime_type)"
      )
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .order("date", { ascending: false });

    if (categoryFilter) {
      query = query.ilike("category", `%${categoryFilter}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error("[Kas RT] Fetch transactions error:", error);
      return NextResponse.json(
        { message: "Gagal memuat transaksi kas RT." },
        { status: 500 }
      );
    }

    const bucketId =
      process.env.SUPABASE_BUCKET_KAS_RT ?? "kas-rt-attachments";
    const signedUrlExpiresIn = 3600; // 1 hour

    const result = await Promise.all(
      data.map(async (row: any) => {
        const attachmentsRaw = Array.isArray(row.kas_rt_attachments)
          ? (row.kas_rt_attachments as {
              file_name: string;
              storage_path: string;
              mime_type: string | null;
            }[])
          : [];
        const attachments: { file_name: string; url: string; mime_type: string | null }[] = [];
        for (const att of attachmentsRaw) {
          const { data: signed } = await supabase.storage
            .from(bucketId)
            .createSignedUrl(att.storage_path, signedUrlExpiresIn);
          attachments.push({
            file_name: att.file_name,
            url: signed?.signedUrl ?? "",
            mime_type: att.mime_type ?? null,
          });
        }
        return {
          id: row.id as string,
          title: row.title as string,
          amount: Number(row.amount),
          type: row.type as "income" | "expense",
          date: row.date as string,
          reference: (row.reference as string | null) ?? "",
          details: (row.details as string | null) ?? "",
          category: (row.category as string | null) ?? null,
          attachments,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Kas RT] Unexpected GET error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat transaksi." },
      { status: 500 }
    );
  }
}

