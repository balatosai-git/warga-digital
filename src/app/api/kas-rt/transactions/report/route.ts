"use server";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_COMMUNITY_ID,
  DEFAULT_TENANT_ID,
} from "@/lib/constants/seed-ids";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ── PDF builder (plain PDF 1.4, no external deps) ────────────────────────────

function buildSimplePdf(lines: string[]): Uint8Array {
  const escapeText = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const wrapText = (text: string, maxLen: number): string[] => {
    const result: string[] = [];
    let remaining = text;
    while (remaining.length > maxLen) {
      let breakIndex = remaining.lastIndexOf(" ", maxLen);
      if (breakIndex <= 0) breakIndex = maxLen;
      result.push(remaining.slice(0, breakIndex));
      remaining = remaining.slice(breakIndex).trimStart();
    }
    if (remaining.length > 0) result.push(remaining);
    return result;
  };

  const physicalLines: string[] = [];
  for (const line of lines) {
    for (const part of wrapText(line, 110)) physicalLines.push(part);
  }

  const maxLinesPerPage = 48;
  const pagesLines: string[][] = [];
  for (let i = 0; i < physicalLines.length; i += maxLinesPerPage) {
    pagesLines.push(physicalLines.slice(i, i + maxLinesPerPage));
  }
  if (pagesLines.length === 0) pagesLines.push([""]);

  const encoder = new TextEncoder();
  const offsets: number[] = [];
  let pdf = "%PDF-1.4\n";

  const addObject = (obj: string) => {
    offsets.push(pdf.length);
    pdf += obj;
  };

  const pageCount = pagesLines.length;

  addObject("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  let kids = "";
  for (let i = 0; i < pageCount; i++) kids += `${3 + i} 0 R `;
  addObject(
    `2 0 obj\n<< /Type /Pages /Kids [${kids.trim()}] /Count ${pageCount} >>\nendobj\n`,
  );

  const fontObjNum = 3 + pageCount;
  const contentsStartNum = fontObjNum + 1;

  for (let i = 0; i < pageCount; i++) {
    addObject(
      `${3 + i} 0 obj\n` +
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentsStartNum + i} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>\n` +
        "endobj\n",
    );
  }

  addObject(
    `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );

  for (let i = 0; i < pageCount; i++) {
    const parts: string[] = ["BT", "/F1 10 Tf", "50 770 Td"];
    for (const line of pagesLines[i]!) {
      parts.push(`(${escapeText(line)}) Tj`);
      parts.push("0 -14 Td");
    }
    parts.push("ET");
    const stream = parts.join("\n");
    const length = encoder.encode(stream).length;
    addObject(
      `${contentsStartNum + i} 0 obj\n<< /Length ${length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }

  const xrefStart = pdf.length;
  pdf += "xref\n";
  pdf += `0 ${offsets.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets)
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  pdf += "trailer\n";
  pdf += `<< /Size ${offsets.length + 1} /Root 1 0 R >>\n`;
  pdf += "startxref\n";
  pdf += `${xrefStart}\n`;
  pdf += "%%EOF";

  return encoder.encode(pdf);
}

// ── Excel builder (exceljs) ──────────────────────────────────────────────────

async function buildExcel(
  rows: Row[],
  startLabel: string,
  endLabel: string,
  categoryFilter: string | null,
  blockFilter: string | null,
  totalIncome: number,
  totalExpense: number,
  net: number,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Warga Digital";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("Laporan Kas RT", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.5,
        right: 0.5,
        top: 0.75,
        bottom: 0.75,
        header: 0.3,
        footer: 0.3,
      },
    },
  });

  // Column definitions
  sheet.columns = [
    { key: "no", width: 5 },
    { key: "date", width: 13 },
    { key: "title", width: 38 },
    { key: "block", width: 13 },
    { key: "category", width: 22 },
    { key: "type", width: 15 },
    { key: "amount", width: 20 },
  ];

  const COL_COUNT = 7;
  const lastCol = "G";

  // ── Colour palette ──────────────────────────────────────────────────────────
  const GREEN_DARK = "1A6B3C";
  const GREEN_MID = "2D8653";
  const GREEN_LIGHT = "E8F5EE";
  const GREEN_STRIPE = "F3FAF6";
  const RED_SOFT = "C0392B";
  const BORDER_COLOR = "B2D8C4";
  const GREY_TEXT = "6B7280";
  const WHITE = "FFFFFF";

  const thinBorder: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: "FF" + BORDER_COLOR },
  };
  const medBorder: Partial<ExcelJS.Border> = {
    style: "medium",
    color: { argb: "FF" + GREEN_MID },
  };

  // ── Helper: apply border to a row range ────────────────────────────────────
  const applyTableBorder = (
    row: ExcelJS.Row,
    isFirst: boolean,
    isLast: boolean,
  ) => {
    for (let c = 1; c <= COL_COUNT; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: isFirst ? medBorder : thinBorder,
        bottom: isLast ? medBorder : thinBorder,
        left: c === 1 ? medBorder : thinBorder,
        right: c === COL_COUNT ? medBorder : thinBorder,
      };
    }
  };

  let currentRow = 1;

  // ── SECTION 1 : Report title ───────────────────────────────────────────────
  const titleRow = sheet.getRow(currentRow++);
  titleRow.height = 30;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "LAPORAN KAS RT 03";
  titleCell.font = { bold: true, size: 16, color: { argb: "FF" + GREEN_DARK } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + GREEN_LIGHT },
  };
  sheet.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`);

  // Period row
  const periodRow = sheet.getRow(currentRow++);
  periodRow.height = 18;
  const periodCell = periodRow.getCell(1);
  periodCell.value = `Periode: ${startLabel}  s.d.  ${endLabel}`;
  periodCell.font = { size: 11, color: { argb: "FF" + GREEN_DARK } };
  periodCell.alignment = { horizontal: "center", vertical: "middle" };
  periodCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + GREEN_LIGHT },
  };
  sheet.mergeCells(`A${periodRow.number}:${lastCol}${periodRow.number}`);

  // Optional filter rows
  if (categoryFilter) {
    const r = sheet.getRow(currentRow++);
    r.height = 16;
    const c = r.getCell(1);
    c.value = `Filter Kategori: ${categoryFilter}`;
    c.font = { size: 10, italic: true, color: { argb: "FF" + GREY_TEXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  }
  if (blockFilter) {
    const r = sheet.getRow(currentRow++);
    r.height = 16;
    const c = r.getCell(1);
    c.value = `Filter Blok: ${blockFilter}`;
    c.font = { size: 10, italic: true, color: { argb: "FF" + GREY_TEXT } };
    c.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(`A${r.number}:${lastCol}${r.number}`);
  }

  // Spacer
  sheet.getRow(currentRow++).height = 6;

  // ── SECTION 2 : Summary ────────────────────────────────────────────────────
  const summaryHeaderRow = sheet.getRow(currentRow++);
  summaryHeaderRow.height = 20;
  const shc = summaryHeaderRow.getCell(1);
  shc.value = "RINGKASAN";
  shc.font = { bold: true, size: 11, color: { argb: "FF" + WHITE } };
  shc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  shc.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + GREEN_MID },
  };
  sheet.mergeCells(
    `A${summaryHeaderRow.number}:${lastCol}${summaryHeaderRow.number}`,
  );

  const summaryData = [
    {
      label: "Total Pemasukan",
      value: totalIncome,
      color: "1A6B3C",
      bold: false,
    },
    {
      label: "Total Pengeluaran",
      value: totalExpense,
      color: RED_SOFT,
      bold: false,
    },
    {
      label: "Saldo Bersih",
      value: net,
      color: net >= 0 ? "1A6B3C" : RED_SOFT,
      bold: true,
    },
  ];

  for (const s of summaryData) {
    const r = sheet.getRow(currentRow++);
    r.height = 18;

    const labelCell = r.getCell(1);
    labelCell.value = s.label;
    labelCell.font = { bold: s.bold, size: 10, color: { argb: "FF333333" } };
    labelCell.alignment = { horizontal: "left", vertical: "middle", indent: 2 };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF9FAFB" },
    };
    sheet.mergeCells(`A${r.number}:E${r.number}`);

    const valueCell = r.getCell(6);
    valueCell.value = s.value;
    valueCell.numFmt = '"Rp "#,##0';
    valueCell.font = {
      bold: s.bold,
      size: 10,
      color: { argb: "FF" + s.color },
    };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };
    valueCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF9FAFB" },
    };
    sheet.mergeCells(`F${r.number}:${lastCol}${r.number}`);
  }

  // Spacer
  sheet.getRow(currentRow++).height = 6;

  // ── SECTION 3 : Transactions table ────────────────────────────────────────
  const tableHeaderRow = sheet.getRow(currentRow++);
  tableHeaderRow.height = 20;
  const thc = tableHeaderRow.getCell(1);
  thc.value = "RINCIAN TRANSAKSI";
  thc.font = { bold: true, size: 11, color: { argb: "FF" + WHITE } };
  thc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  thc.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF" + GREEN_MID },
  };
  sheet.mergeCells(
    `A${tableHeaderRow.number}:${lastCol}${tableHeaderRow.number}`,
  );

  const colHeaders = [
    "No",
    "Tanggal",
    "Judul Transaksi",
    "Blok",
    "Kategori",
    "Tipe",
    "Nominal",
  ];
  const colAligns: ExcelJS.Alignment["horizontal"][] = [
    "center",
    "center",
    "left",
    "center",
    "left",
    "center",
    "right",
  ];

  const colHeaderRow = sheet.getRow(currentRow++);
  colHeaderRow.height = 20;
  colHeaders.forEach((h, i) => {
    const cell = colHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, size: 10, color: { argb: "FF" + WHITE } };
    cell.alignment = { horizontal: colAligns[i], vertical: "middle" };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + GREEN_DARK },
    };
    cell.border = {
      top: medBorder,
      bottom: medBorder,
      left: i === 0 ? medBorder : thinBorder,
      right: i === COL_COUNT - 1 ? medBorder : thinBorder,
    };
  });

  const dataStartRow = currentRow;

  if (rows.length === 0) {
    const emptyRow = sheet.getRow(currentRow++);
    emptyRow.height = 18;
    const ec = emptyRow.getCell(1);
    ec.value = "Tidak ada transaksi untuk filter ini.";
    ec.font = { italic: true, size: 10, color: { argb: "FF" + GREY_TEXT } };
    ec.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(`A${emptyRow.number}:${lastCol}${emptyRow.number}`);
    applyTableBorder(emptyRow, true, true);
  } else {
    rows.forEach((row, idx) => {
      const isLast = idx === rows.length - 1;
      const isEven = idx % 2 === 1;
      const rowBg = isEven ? GREEN_STRIPE : WHITE;

      const r = sheet.getRow(currentRow++);
      r.height = 18;

      const cells: {
        value: ExcelJS.CellValue;
        align: ExcelJS.Alignment["horizontal"];
        numFmt?: string;
      }[] = [
        { value: idx + 1, align: "center" },
        { value: formatDateShort(row.date), align: "center" },
        { value: row.title ?? "-", align: "left" },
        { value: row.reference ?? "-", align: "center" },
        { value: row.category ?? "-", align: "left" },
        {
          value: row.type === "income" ? "Pemasukan" : "Pengeluaran",
          align: "center",
        },
        { value: Number(row.amount), align: "right", numFmt: '"Rp "#,##0' },
      ];

      cells.forEach((cd, ci) => {
        const cell = r.getCell(ci + 1);
        cell.value = cd.value;
        if (cd.numFmt) cell.numFmt = cd.numFmt;
        cell.alignment = {
          horizontal: cd.align,
          vertical: "middle",
          wrapText: ci === 2,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF" + rowBg },
        };

        // Colour-code the Tipe column
        if (ci === 5) {
          cell.font = {
            size: 10,
            bold: true,
            color: {
              argb: row.type === "income" ? "FF" + GREEN_DARK : "FF" + RED_SOFT,
            },
          };
        } else if (ci === 6) {
          cell.font = {
            size: 10,
            bold: true,
            color: {
              argb: row.type === "income" ? "FF" + GREEN_DARK : "FF" + RED_SOFT,
            },
          };
        } else {
          cell.font = { size: 10 };
        }
      });

      applyTableBorder(r, idx === 0, isLast);
    });

    // ── Totals footer row ──────────────────────────────────────────────────
    const totalsRow = sheet.getRow(currentRow++);
    totalsRow.height = 20;

    const tc1 = totalsRow.getCell(1);
    tc1.value = "TOTAL";
    tc1.font = { bold: true, size: 10, color: { argb: "FF" + WHITE } };
    tc1.alignment = { horizontal: "center", vertical: "middle" };
    tc1.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + GREEN_DARK },
    };
    sheet.mergeCells(`A${totalsRow.number}:E${totalsRow.number}`);

    const typeCell = totalsRow.getCell(6);
    typeCell.value = "Saldo Bersih";
    typeCell.font = { bold: true, size: 10, color: { argb: "FF" + WHITE } };
    typeCell.alignment = { horizontal: "center", vertical: "middle" };
    typeCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + GREEN_DARK },
    };

    const netCell = totalsRow.getCell(7);
    netCell.value = net;
    netCell.numFmt = '"Rp "#,##0';
    netCell.font = {
      bold: true,
      size: 10,
      color: { argb: net >= 0 ? "FFFFFFFF" : "FFFFCCCC" },
    };
    netCell.alignment = { horizontal: "right", vertical: "middle" };
    netCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF" + GREEN_DARK },
    };

    for (let c = 1; c <= COL_COUNT; c++) {
      totalsRow.getCell(c).border = {
        top: medBorder,
        bottom: medBorder,
        left: c === 1 ? medBorder : thinBorder,
        right: c === COL_COUNT ? medBorder : thinBorder,
      };
    }
  }

  // ── Print area and freeze panes ────────────────────────────────────────────
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: dataStartRow - 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const tenantId = DEFAULT_TENANT_ID;
    const communityId = DEFAULT_COMMUNITY_ID;

    if (!tenantId || !communityId) {
      return NextResponse.json(
        { message: "Konfigurasi tenant/komunitas tidak ditemukan." },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const categoryFilter = searchParams.get("category")?.trim() || null;
    const blockFilter = searchParams.get("block")?.trim() || null;
    const format = searchParams.get("format") === "excel" ? "excel" : "pdf";

    if (!start || !end) {
      return NextResponse.json(
        { message: "Tanggal mulai dan akhir wajib diisi." },
        { status: 400 },
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { message: "Format tanggal tidak valid." },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { message: "Tanggal mulai tidak boleh setelah tanggal akhir." },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    let query = supabase
      .from("kas_rt_transactions")
      .select("id, title, amount, type, date, reference, details, category")
      .eq("tenant_id", tenantId)
      .eq("community_id", communityId)
      .gte("date", start)
      .lte("date", end)
      .order("date", { ascending: true });

    if (categoryFilter) query = query.ilike("category", `%${categoryFilter}%`);
    if (blockFilter) query = query.ilike("reference", `%${blockFilter}%`);

    const { data, error } = await query;

    if (error || !data) {
      console.error("[Kas RT] Fetch report transactions error:", error);
      return NextResponse.json(
        { message: "Gagal memuat transaksi untuk laporan." },
        { status: 500 },
      );
    }

    const rows = data as Row[];

    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of rows) {
      if (row.type === "income") totalIncome += Number(row.amount);
      else totalExpense += Number(row.amount);
    }
    const net = totalIncome - totalExpense;

    const startLabel = formatDateLabel(start);
    const endLabel = formatDateLabel(end);

    // ── Excel ──────────────────────────────────────────────────────────────
    if (format === "excel") {
      const buffer = await buildExcel(
        rows,
        startLabel,
        endLabel,
        categoryFilter,
        blockFilter,
        totalIncome,
        totalExpense,
        net,
      );

      const fileName = `laporan-kas-rt_${start}_sampai_${end}.xlsx`;

      return new NextResponse(buffer as BodyInit, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": String((buffer as ArrayBuffer).byteLength),
        },
      });
    }

    // ── PDF ────────────────────────────────────────────────────────────────
    const lines: string[] = [];
    lines.push("LAPORAN KAS RT 03");
    lines.push("========================================");
    lines.push(`Periode: ${startLabel} s.d. ${endLabel}`);
    if (categoryFilter) lines.push(`Filter kategori : ${categoryFilter}`);
    if (blockFilter) lines.push(`Filter blok     : ${blockFilter}`);
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
      lines.push(
        "----------------------------------------------------------------------------------------------------------------------------------",
      );
      for (const row of rows) {
        const typeLabel = row.type === "income" ? "Pemasukan" : "Pengeluaran";
        const amountLabel = formatCurrency(Number(row.amount));
        lines.push(
          `${formatDateShort(row.date)} | ${row.title ?? "-"} | ${row.reference ?? "-"} | ${row.category ?? "-"} | ${typeLabel} | ${amountLabel}`,
        );
        if (row.details?.trim()) lines.push(`Catatan: ${row.details}`);
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
  } catch (err) {
    console.error("[Kas RT] Unexpected report error:", err);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyiapkan laporan." },
      { status: 500 },
    );
  }
}
