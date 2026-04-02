"use server";

import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServerClient } from "@/lib/supabase/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

// ── Types ────────────────────────────────────────────────────────────────────

type TransactionRow = {
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

// ── PDF Builder (pdf-lib) ────────────────────────────────────────────────────

async function buildPdf(
  rows: TransactionRow[],
  startLabel: string,
  endLabel: string,
  categoryFilter: string | null,
  blockFilter: string | null,
  totalIncome: number,
  totalExpense: number,
  net: number,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28; // A4 width in points
  const PAGE_HEIGHT = 841.89; // A4 height in points
  const MARGIN = 50;
  const LINE_HEIGHT = 14;

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const drawText = (
    text: string,
    xPos: number,
    yPos: number,
    fnt = font,
    size = 10,
    color = rgb(0, 0, 0),
  ) => {
    page.drawText(text, { x: xPos, y: yPos, font: fnt, size, color });
  };

  const ensureSpace = (linesNeeded: number) => {
    const needed = linesNeeded * LINE_HEIGHT;
    if (y - MARGIN < needed) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // ── Title & Header ─────────────────────────────────────────────────────
  drawText("LAPORAN KAS RT 03", MARGIN, y, boldFont, 16);
  y -= LINE_HEIGHT * 1.5;

  drawText(
    `Periode: ${startLabel} s.d. ${endLabel}`,
    MARGIN,
    y,
    font,
    10,
    rgb(0.3, 0.3, 0.3),
  );
  y -= LINE_HEIGHT;

  if (categoryFilter) {
    drawText(
      `Filter kategori: ${categoryFilter}`,
      MARGIN,
      y,
      font,
      10,
      rgb(0.3, 0.3, 0.3),
    );
    y -= LINE_HEIGHT;
  }
  if (blockFilter) {
    drawText(
      `Filter blok: ${blockFilter}`,
      MARGIN,
      y,
      font,
      10,
      rgb(0.3, 0.3, 0.3),
    );
    y -= LINE_HEIGHT;
  }

  y -= LINE_HEIGHT * 0.5;

  // ── Summary Section ─────────────────────────────────────────────────────
  drawText("RINGKASAN", MARGIN, y, boldFont, 12);
  y -= LINE_HEIGHT;
  drawText(`Total pemasukan  : ${formatCurrency(totalIncome)}`, MARGIN, y);
  y -= LINE_HEIGHT;
  drawText(`Total pengeluaran: ${formatCurrency(totalExpense)}`, MARGIN, y);
  y -= LINE_HEIGHT;
  drawText(
    `Saldo bersih     : ${formatCurrency(net)}`,
    MARGIN,
    y,
    boldFont,
    10,
    net >= 0 ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1),
  );
  y -= LINE_HEIGHT * 1.5;

  // ── Transaction Table ───────────────────────────────────────────────────
  drawText("RINCIAN TRANSAKSI", MARGIN, y, boldFont, 12);
  y -= LINE_HEIGHT;

  // Column positions
  const colDate = MARGIN;
  const colTitle = MARGIN + 80;
  const colBlock = MARGIN + 280;
  const colCategory = MARGIN + 340;
  const colType = MARGIN + 420;
  const colAmount = MARGIN + 490;

  // Header row
  drawText("Tanggal", colDate, y, boldFont, 8);
  drawText("Judul", colTitle, y, boldFont, 8);
  drawText("Blok", colBlock, y, boldFont, 8);
  drawText("Kategori", colCategory, y, boldFont, 8);
  drawText("Tipe", colType, y, boldFont, 8);
  drawText("Nominal", colAmount, y, boldFont, 8);
  y -= LINE_HEIGHT * 0.8;

  // Separator line
  page.drawRectangle({
    x: MARGIN,
    y: y - 1,
    width: PAGE_WIDTH - MARGIN * 2,
    height: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= LINE_HEIGHT * 0.5;

  if (rows.length === 0) {
    drawText(
      "Tidak ada transaksi untuk filter ini.",
      MARGIN,
      y,
      font,
      10,
      rgb(0.5, 0.5, 0.5),
    );
  } else {
    ensureSpace(rows.length * 2 + 2);

    for (const row of rows) {
      const typeLabel = row.type === "income" ? "Pemasukan" : "Pengeluaran";
      const typeColor =
        row.type === "income" ? rgb(0.1, 0.5, 0.2) : rgb(0.7, 0.1, 0.1);

      drawText(formatDateShort(row.date), colDate, y, font, 8);
      drawText(row.title ?? "-", colTitle, y, font, 8);
      drawText(row.reference ?? "-", colBlock, y, font, 8);
      drawText(row.category ?? "-", colCategory, y, font, 8);
      drawText(typeLabel, colType, y, font, 8, typeColor);
      drawText(formatCurrency(Number(row.amount)), colAmount, y, font, 8);
      y -= LINE_HEIGHT;

      if (row.details?.trim()) {
        drawText(
          `Catatan: ${row.details}`,
          colTitle,
          y,
          font,
          7,
          rgb(0.5, 0.5, 0.5),
        );
        y -= LINE_HEIGHT * 0.7;
      }
    }
  }

  return pdfDoc.save();
}

// ── Excel Builder (exceljs) ──────────────────────────────────────────────────

async function buildExcel(
  rows: TransactionRow[],
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
  const GREEN_STRIPE = "F4FAF6";
  const RED_SOFT = "FDECEA";
  const BORDER_COLOR = "D0D5DD";
  const GREY_TEXT = "667085";
  const WHITE = "FFFFFF";

  const thinBorder: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: BORDER_COLOR },
  };
  const medBorder: Partial<ExcelJS.Border> = {
    style: "medium",
    color: { argb: GREEN_DARK },
  };

  const applyTableBorder = (rowNum: number) => {
    for (let c = 1; c <= COL_COUNT; c++) {
      const cell = sheet.getCell(rowNum, c);
      cell.border = {
        top: thinBorder,
        bottom: thinBorder,
        left: thinBorder,
        right: thinBorder,
      };
    }
  };

  let currentRow = 1;

  // ── Title Row ───────────────────────────────────────────────────────────────
  const titleRow = sheet.getRow(currentRow);
  titleRow.height = 32;
  const titleCell = titleRow.getCell(1);
  titleCell.value = "Laporan Kas RT 03";
  titleCell.font = { bold: true, size: 16, color: { argb: GREEN_DARK } };
  titleCell.alignment = { horizontal: "left", vertical: "middle" };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  currentRow++;

  // ── Period Row ──────────────────────────────────────────────────────────────
  const periodRow = sheet.getRow(currentRow);
  periodRow.height = 20;
  const periodCell = periodRow.getCell(1);
  periodCell.value = `Periode: ${startLabel} s.d. ${endLabel}`;
  periodCell.font = { size: 11, color: { argb: GREY_TEXT } };
  periodCell.alignment = { horizontal: "left", vertical: "middle" };
  sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  currentRow++;

  if (categoryFilter) {
    const r = sheet.getRow(currentRow);
    r.height = 18;
    const c = r.getCell(1);
    c.value = `Filter kategori: ${categoryFilter}`;
    c.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
    currentRow++;
  }
  if (blockFilter) {
    const r = sheet.getRow(currentRow);
    r.height = 18;
    const c = r.getCell(1);
    c.value = `Filter blok: ${blockFilter}`;
    c.font = { size: 10, italic: true, color: { argb: GREY_TEXT } };
    c.alignment = { horizontal: "left", vertical: "middle" };
    sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
    currentRow++;
  }

  currentRow++; // spacer

  // ── Summary Section ─────────────────────────────────────────────────────────
  const summaryHeaderRow = sheet.getRow(currentRow);
  summaryHeaderRow.height = 24;
  const shc = summaryHeaderRow.getCell(1);
  shc.value = "Ringkasan";
  shc.font = { bold: true, size: 12, color: { argb: GREEN_DARK } };
  shc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  shc.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  currentRow++;

  const summaryData = [
    {
      label: "Total Pemasukan",
      value: totalIncome,
      color: GREEN_MID,
      bold: false,
    },
    {
      label: "Total Pengeluaran",
      value: totalExpense,
      color: "C0392B",
      bold: false,
    },
    {
      label: "Saldo Bersih",
      value: net,
      color: net >= 0 ? GREEN_DARK : "C0392B",
      bold: true,
    },
  ];

  for (const item of summaryData) {
    const r = sheet.getRow(currentRow);
    r.height = 20;
    const labelCell = r.getCell(1);
    labelCell.value = item.label;
    labelCell.font = {
      bold: item.bold,
      size: 11,
      color: { argb: item.color },
    };
    labelCell.alignment = {
      horizontal: "left",
      vertical: "middle",
      indent: 2,
    };
    labelCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };

    const valueCell = r.getCell(COL_COUNT);
    valueCell.value = item.value;
    valueCell.numFmt = "#,##0";
    valueCell.font = {
      bold: item.bold,
      size: item.bold ? 12 : 11,
      color: { argb: item.color },
    };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };
    valueCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_LIGHT },
    };
    sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT - 1);
    currentRow++;
  }

  currentRow++; // spacer

  // ── Transaction Table ───────────────────────────────────────────────────────
  const tableHeaderRow = sheet.getRow(currentRow);
  tableHeaderRow.height = 22;
  const thc = tableHeaderRow.getCell(1);
  thc.value = "Rincian Transaksi";
  thc.font = { bold: true, size: 12, color: { argb: GREEN_DARK } };
  thc.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  thc.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
  currentRow++;

  const colHeaders = [
    "No",
    "Tanggal",
    "Judul",
    "Blok",
    "Kategori",
    "Tipe",
    "Nominal",
  ];
  const colAligns = [
    "center",
    "center",
    "left",
    "center",
    "left",
    "center",
    "right",
  ];
  const colHeaderRow = sheet.getRow(currentRow);
  colHeaderRow.height = 20;
  for (let i = 0; i < colHeaders.length; i++) {
    const cell = colHeaderRow.getCell(i + 1);
    cell.value = colHeaders[i];
    cell.font = { bold: true, size: 10, color: { argb: WHITE } };
    cell.alignment = {
      horizontal: colAligns[i] as "left" | "center" | "right",
      vertical: "middle",
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: GREEN_MID },
    };
    cell.border = {
      top: medBorder,
      bottom: medBorder,
      left: thinBorder,
      right: thinBorder,
    };
  }
  currentRow++;

  const dataStartRow = currentRow;

  if (rows.length === 0) {
    const emptyRow = sheet.getRow(currentRow);
    emptyRow.height = 24;
    const ec = emptyRow.getCell(1);
    ec.value = "Tidak ada transaksi untuk filter ini.";
    ec.font = { italic: true, size: 10, color: { argb: GREY_TEXT } };
    ec.alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT);
    currentRow++;
  } else {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const isLast = i === rows.length - 1;
      const isEven = i % 2 === 0;
      const rowBg = isEven ? GREEN_STRIPE : WHITE;

      const r = sheet.getRow(currentRow);
      r.height = 18;
      const cells = [
        { value: i + 1, align: "center" },
        { value: formatDateShort(row.date), align: "center" },
        { value: row.title ?? "-", align: "left" },
        { value: row.reference ?? "-", align: "center" },
        { value: row.category ?? "-", align: "left" },
        {
          value: row.type === "income" ? "Pemasukan" : "Pengeluaran",
          align: "center",
        },
        { value: Number(row.amount), align: "right" },
      ];

      for (let j = 0; j < cells.length; j++) {
        const cell = r.getCell(j + 1);
        cell.value = cells[j].value;
        cell.alignment = {
          horizontal: cells[j].align as "left" | "center" | "right",
          vertical: "middle",
          wrapText: j === 2,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: rowBg },
        };
        cell.border = {
          top: thinBorder,
          bottom: isLast ? medBorder : thinBorder,
          left: thinBorder,
          right: thinBorder,
        };

        if (j === 5) {
          cell.font = {
            size: 10,
            bold: false,
            color: {
              argb: row.type === "income" ? GREEN_DARK : "C0392B",
            },
          };
        } else if (j === 6) {
          cell.numFmt = "#,##0";
          cell.font = {
            size: 10,
            bold: false,
            color: {
              argb: row.type === "income" ? GREEN_DARK : "C0392B",
            },
          };
        } else {
          cell.font = { size: 10 };
        }
      }

      if (row.details?.trim()) {
        currentRow++;
        const noteRow = sheet.getRow(currentRow);
        noteRow.height = 16;
        const noteCell = noteRow.getCell(3);
        noteCell.value = `Catatan: ${row.details}`;
        noteCell.font = { size: 9, italic: true, color: { argb: GREY_TEXT } };
        noteCell.alignment = {
          horizontal: "left",
          vertical: "middle",
          wrapText: true,
        };
        sheet.mergeCells(currentRow, 3, currentRow, COL_COUNT);
      }

      currentRow++;
    }
  }

  // ── Totals Row ──────────────────────────────────────────────────────────────
  const totalsRow = sheet.getRow(currentRow);
  totalsRow.height = 22;
  const tc1 = totalsRow.getCell(1);
  tc1.value = "Total";
  tc1.font = { bold: true, size: 11, color: { argb: GREEN_DARK } };
  tc1.alignment = { horizontal: "left", vertical: "middle" };
  tc1.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  sheet.mergeCells(currentRow, 1, currentRow, COL_COUNT - 2);

  const typeCell = totalsRow.getCell(COL_COUNT - 1);
  typeCell.value = "";
  typeCell.font = { bold: true, size: 11, color: { argb: GREEN_DARK } };
  typeCell.alignment = { horizontal: "center", vertical: "middle" };
  typeCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };

  const netCell = totalsRow.getCell(COL_COUNT);
  netCell.value = net;
  netCell.numFmt = "#,##0";
  netCell.font = {
    bold: true,
    size: 12,
    color: { argb: net >= 0 ? GREEN_DARK : "C0392B" },
  };
  netCell.alignment = { horizontal: "right", vertical: "middle" };
  netCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: GREEN_LIGHT },
  };
  netCell.border = {
    top: medBorder,
    bottom: medBorder,
    left: thinBorder,
    right: thinBorder,
  };

  // Freeze panes
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: dataStartRow - 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

// ── GET handler ──────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    // ── Auth check ─────────────────────────────────────────────────────────
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

    const rows = data as TransactionRow[];

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
    const pdfBytes = await buildPdf(
      rows,
      startLabel,
      endLabel,
      categoryFilter,
      blockFilter,
      totalIncome,
      totalExpense,
      net,
    );
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
