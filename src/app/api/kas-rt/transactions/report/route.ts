"use server";

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_COMMUNITY_ID, DEFAULT_TENANT_ID } from "@/lib/constants/seed-ids";

function buildSimplePdf(lines: string[]): Uint8Array {
  const escapeText = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const wrapText = (text: string, maxLen: number): string[] => {
    const result: string[] = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let breakIndex = remaining.lastIndexOf(" ", maxLen);
      if (breakIndex <= 0) {
        breakIndex = maxLen;
      }
      result.push(remaining.slice(0, breakIndex));
      remaining = remaining.slice(breakIndex).trimStart();
    }
    if (remaining.length > 0) {
      result.push(remaining);
    }
    return result;
  };

  const physicalLines: string[] = [];
  for (const line of lines) {
    const wrapped = wrapText(line, 110);
    for (const part of wrapped) {
      physicalLines.push(part);
    }
  }

  const maxLinesPerPage = 48;
  const pagesLines: string[][] = [];
  for (let i = 0; i < physicalLines.length; i += maxLinesPerPage) {
    pagesLines.push(physicalLines.slice(i, i + maxLinesPerPage));
  }

  if (pagesLines.length === 0) {
    pagesLines.push([""]);
  }

  const encoder = new TextEncoder();
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";

  const addObject = (obj: string) => {
    offsets.push(pdf.length);
    pdf += obj;
  };

  const pageCount = pagesLines.length;

  // 1: Catalog
  addObject(
    "1 0 obj\n" +
      "<< /Type /Catalog /Pages 2 0 R >>\n" +
      "endobj\n"
  );

  // 2: Pages
  let kids = "";
  for (let i = 0; i < pageCount; i += 1) {
    const pageObjNum = 3 + i;
    kids += `${pageObjNum} 0 R `;
  }
  addObject(
    `2 0 obj\n<< /Type /Pages /Kids [${kids.trim()}] /Count ${pageCount} >>\nendobj\n`
  );

  const fontObjNum = 3 + pageCount;
  const contentsStartNum = fontObjNum + 1;

  // Page objects
  for (let i = 0; i < pageCount; i += 1) {
    const pageObjNum = 3 + i;
    const contentsObjNum = contentsStartNum + i;
    addObject(
      `${pageObjNum} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentsObjNum} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\n` +
        "endobj\n"
    );
  }

  // Font object
  addObject(
    `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
  );

  // Contents objects
  for (let i = 0; i < pageCount; i += 1) {
    const contentsObjNum = contentsStartNum + i;
    const contentParts: string[] = [];
    contentParts.push("BT");
    contentParts.push("/F1 10 Tf");
    contentParts.push("50 770 Td");
    for (const line of pagesLines[i]!) {
      contentParts.push(`(${escapeText(line)}) Tj`);
      contentParts.push("0 -14 Td");
    }
    contentParts.push("ET");
    const contentStream = contentParts.join("\n");
    const contentBytes = encoder.encode(contentStream);
    const length = contentBytes.length;

    addObject(
      `${contentsObjNum} 0 obj\n<< /Length ${length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
    );
  }

  const xrefStart = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${offsets.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    const offsetStr = offset.toString().padStart(10, "0");
    pdf += `${offsetStr} 00000 n \n`;
  }

  pdf += "trailer\n";
  pdf += `<< /Size ${offsets.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefStart}\n`;
  pdf += "%%EOF";

  return encoder.encode(pdf);
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
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const categoryFilter = searchParams.get("category")?.trim() || null;
    const blockFilter = searchParams.get("block")?.trim() || null;

    if (!start || !end) {
      return NextResponse.json(
        { message: "Tanggal mulai dan akhir wajib diisi." },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        { message: "Tanggal mulai tidak boleh setelah tanggal akhir." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    let query = supabase
      .from("kas_rt_transactions")
      .select(
        "id, title, amount, type, date, reference, details, category"
      )
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (categoryFilter) {
      query = query.ilike("category", `%${categoryFilter}%`);
    }

    if (blockFilter) {
      query = query.ilike("reference", `%${blockFilter}%`);
    }

    const { data, error } = await query;

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error("[Kas RT] Fetch report transactions error:", error);
      return NextResponse.json(
        { message: "Gagal memuat transaksi untuk laporan." },
        { status: 500 }
      );
    }

    type Row = {
      id: string;
      title: string;
      amount: number;
      type: "income" | "expense";
      date: string;
      reference: string | null;
      details: string | null;
      category: string | null;
    };

    const rows = data as Row[];

    let totalIncome = 0;
    let totalExpense = 0;

    for (const row of rows) {
      if (row.type === "income") {
        totalIncome += Number(row.amount);
      } else {
        totalExpense += Number(row.amount);
      }
    }

    const net = totalIncome - totalExpense;

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);

    const lines: string[] = [];
    lines.push("LAPORAN KAS RT 03");
    lines.push("========================================");

    const startLabel = startDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const endLabel = endDate.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    lines.push(`Periode: ${startLabel} s.d. ${endLabel}`);
    if (categoryFilter) {
      lines.push(`Filter kategori : ${categoryFilter}`);
    }
    if (blockFilter) {
      lines.push(`Filter blok     : ${blockFilter}`);
    }
    lines.push("");
    lines.push("RINGKASAN");
    lines.push("----------------------------------------");
    lines.push(`Total pemasukan  : ${formatCurrency(totalIncome)}`);
    lines.push(`Total pengeluaran: ${formatCurrency(totalExpense)}`);
    lines.push(`Saldo bersih     : ${formatCurrency(net)}`);
    lines.push("");
    lines.push("RINCIAN TRANSAKSI");
    lines.push("----------------------------------------");

    if (rows.length === 0) {
      lines.push("Tidak ada transaksi untuk filter ini.");
    } else {
      lines.push("Tanggal    | Judul | Blok | Kategori | Tipe | Nominal");
      lines.push("----------------------------------------------------------------------------------------------------------------------------------");
      for (const row of rows) {
        const dateLabel = new Date(row.date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        });
        const title = row.title ?? "-";
        const blockLabel = row.reference ?? "-";
        const categoryLabel = row.category ?? "-";
        const typeLabel = row.type === "income" ? "Pemasukan" : "Pengeluaran";
        const amountLabel = formatCurrency(Number(row.amount));

        lines.push(
          `${dateLabel} | ${title} | ${blockLabel} | ${categoryLabel} | ${typeLabel} | ${amountLabel}`
        );
        if (row.details && row.details.trim()) {
          lines.push(`Catatan: ${row.details}`);
        }
        lines.push("");
      }
    }

    const pdfBytes = buildSimplePdf(lines);

    const fileName = `laporan-kas-rt_${start}_sampai_${end}.pdf`;

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(pdfBytes.byteLength),
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Kas RT] Unexpected report error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyiapkan laporan." },
      { status: 500 }
    );
  }
}

