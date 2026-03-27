"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  PencilSquareIcon,
  TableCellsIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type TransactionType = "income" | "expense";

interface TransactionAttachment {
  file_name: string;
  url: string;
  mime_type: string | null;
}

interface KasRtCategory {
  id: string;
  name: string;
  applies_to: "income" | "expense" | "both";
  title_template: string;
  desc_template: string;
  sort_order: number;
}

interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  created_at?: string;
  created_by?: string | null;
  created_by_full_name?: string | null;
  reference: string;
  details: string | null;
  category: string | null;
  attachments: TransactionAttachment[];
}

interface KasRtFormState {
  type: TransactionType;
  categoryId: string;
  amount: string;
  date: string;
  reference: string;
  title: string;
  details: string;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function toDateInputValue(date: Date) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function formatAmountDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits === "") return "";
  return Number(digits).toLocaleString("en-US");
}

function parseAmountInput(value: string): string {
  return value.replace(/\D/g, "");
}

function getMonthNameIndonesian(date: Date): string {
  return date.toLocaleString("id-ID", { month: "long" });
}

/**
 * Replace {bulan} and {blok} placeholders in a template string.
 */
function applyTemplate(
  template: string,
  vars: { bulan: string; blok: string },
): string {
  return template
    .replace(/\{bulan\}/g, vars.bulan)
    .replace(/\{blok\}/g, vars.blok);
}

function getDefaultKasRtForm(now: Date): KasRtFormState {
  return {
    type: "income",
    categoryId: "",
    amount: "120000",
    date: toDateInputValue(now),
    reference: "",
    title: "",
    details: "",
  };
}

export default function KasRTPage() {
  const now = new Date();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(toDateInputValue(now));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(now);

  // ── Transaction list ─────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // ── Download modal ───────────────────────────────────────────────────────────
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadStartDate, setDownloadStartDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [downloadEndDate, setDownloadEndDate] = useState(toDateInputValue(now));
  const [downloadCategory, setDownloadCategory] = useState("");
  const [downloadBlock, setDownloadBlock] = useState("");
  const [downloadFormat, setDownloadFormat] = useState<"excel" | "pdf">(
    "excel",
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attachmentLabel, setAttachmentLabel] = useState(
    "Belum ada file dipilih",
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<KasRtFormState>(() =>
    getDefaultKasRtForm(now),
  );

  // ── Categories ───────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<KasRtCategory[]>([]);

  /** Server-derived: only true when user has role permission; used to render Catat Transaksi. */
  const [canSubmitTransaction, setCanSubmitTransaction] = useState(false);
  /** True until the first transaction load completes (used for full-page loading spinner). */
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  /** Lightweight in-page toast for success notifications. */
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Edit / delete state ─────────────────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionItem | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  // ── Duplicate-check modal ────────────────────────────────────────────────────
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: TransactionItem[];
    onConfirm: () => void;
  } | null>(null);

  const isIncomeForm = form.type === "income";

  // Wait for client mount so persisted auth has time to rehydrate before redirecting
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [hasMounted, isAuthenticated, router]);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  // ── Derived: categories filtered to the current form type ───────────────────
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.applies_to === form.type || c.applies_to === "both",
      ),
    [categories, form.type],
  );

  // ── All unique category names (for filter/download dropdowns) ────────────────
  const allCategoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name))).sort(),
    [categories],
  );

  // ── All unique block/reference names (for the block filter dropdown) ─────────
  const allBlockNames = useMemo(
    () =>
      Array.from(
        new Set(
          transactions
            .map((t) => t.reference?.trim())
            .filter((r): r is string => Boolean(r)),
        ),
      ).sort(),
    [transactions],
  );

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const balance = transactions.reduce((sum, tx) => {
      return tx.type === "income" ? sum + tx.amount : sum - tx.amount;
    }, 0);

    const thisMonthIndex = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonthDate = new Date(thisYear, thisMonthIndex - 1, 1);
    const prevMonthIndex = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const thisMonthNet = transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === thisMonthIndex && d.getFullYear() === thisYear;
      })
      .reduce(
        (sum, tx) => (tx.type === "income" ? sum + tx.amount : sum - tx.amount),
        0,
      );

    const prevMonthNet = transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === prevMonthIndex && d.getFullYear() === prevYear;
      })
      .reduce(
        (sum, tx) => (tx.type === "income" ? sum + tx.amount : sum - tx.amount),
        0,
      );

    const deltaFromPrevious = thisMonthNet - prevMonthNet;
    return { balance, thisMonthNet, deltaFromPrevious };
  }, [now, transactions]);

  // ── Filtered transaction list ────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== "all" && tx.type !== typeFilter) return false;
        if (
          categoryFilter.trim() &&
          (!tx.category ||
            !tx.category
              .toLowerCase()
              .includes(categoryFilter.trim().toLowerCase()))
        )
          return false;
        if (
          blockFilter.trim() &&
          (tx.reference ?? "").trim().toLowerCase() !==
            blockFilter.trim().toLowerCase()
        )
          return false;
        if (startDate && tx.date < startDate) return false;
        if (endDate && tx.date > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        const aKey = a.created_at ?? a.date;
        const bKey = b.created_at ?? b.date;
        if (aKey === bKey) return 0;
        return aKey < bKey ? 1 : -1;
      });
  }, [
    transactions,
    typeFilter,
    categoryFilter,
    blockFilter,
    startDate,
    endDate,
  ]);

  // ── Validation ───────────────────────────────────────────────────────────────
  const isStep1Valid =
    (form.type === "income" || form.type === "expense") &&
    form.categoryId.length > 0;
  const isStep2Valid = useMemo(() => {
    const amountNumber = Number(form.amount);
    return (
      form.date.length > 0 &&
      form.reference.trim().length > 0 &&
      !Number.isNaN(amountNumber) &&
      amountNumber > 0
    );
  }, [form.amount, form.date, form.reference]);
  const isStep3Valid = form.title.trim().length > 0;
  const isFormValid = isStep1Valid && isStep2Valid && isStep3Valid;

  // ── Data loaders ─────────────────────────────────────────────────────────────
  async function loadTransactions() {
    try {
      const url = categoryFilter.trim()
        ? `/api/kas-rt/transactions?category=${encodeURIComponent(categoryFilter.trim())}`
        : "/api/kas-rt/transactions";
      const response = await apiFetch(url);
      if (!response.ok) return;
      const data = (await response.json()) as TransactionItem[];
      setTransactions(data);
    } catch {
      // silently ignore network errors on initial load
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kas-rt/categories");
      if (!response.ok) return;
      const data = (await response.json()) as KasRtCategory[];
      setCategories(data);
    } catch {
      // silently ignore; form falls back to empty list
    }
  }, []);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadTransactions();
      setRefreshedAt(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function init() {
      try {
        const permRes = await apiFetch("/api/kas-rt/permissions");
        if (permRes.ok) {
          const perm = (await permRes.json()) as {
            canSubmitTransaction?: boolean;
          };
          setCanSubmitTransaction(perm.canSubmitTransaction === true);
        }
      } catch {
        // ignore
      }
      await Promise.all([loadTransactions(), loadCategories()]);
      setIsInitialLoading(false);
    }
    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download report ──────────────────────────────────────────────────────────
  const handleDownloadReport = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      if (!downloadStartDate || !downloadEndDate) {
        setDownloadError("Tanggal mulai dan akhir wajib diisi.");
        setIsDownloading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("start", downloadStartDate);
      params.set("end", downloadEndDate);
      params.set("format", downloadFormat);
      if (downloadCategory.trim())
        params.set("category", downloadCategory.trim());
      if (downloadBlock.trim()) params.set("block", downloadBlock.trim());

      const response = await apiFetch(
        `/api/kas-rt/transactions/report?${params.toString()}`,
      );
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(err.message ?? "Gagal mengunduh laporan.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeStart = downloadStartDate || "awal";
      const safeEnd = downloadEndDate || "akhir";
      const ext = downloadFormat === "excel" ? "xlsx" : "pdf";
      link.download = `laporan-kas-rt-${safeStart}-sd-${safeEnd}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setIsDownloadModalOpen(false);
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "Terjadi kesalahan.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Permission check (canSubmit) is fetched inside init above ────────────────
  // kept as no-op here to avoid unused var lint

  // ── Pull-to-refresh touch handlers ──────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, details")) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, details")) return;
    if (touchStartY == null) return;
    const el = e.currentTarget as HTMLElement;
    if (el.scrollTop > 0) {
      setTouchStartY(null);
      setPullDistance(0);
      return;
    }
    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - touchStartY);
    setPullDistance(Math.min(distance, 80));
  };

  const onTouchEnd = () => {
    if (pullDistance > 48) {
      void refreshData();
    }
    setPullDistance(0);
    setTouchStartY(null);
  };

  // ── Form helpers ─────────────────────────────────────────────────────────────

  /**
   * Called when the user selects a category from the dropdown.
   * Auto-fills title and details from the category's templates.
   * {bulan} is resolved immediately; {blok} uses the current reference value (or "-").
   */
  const handleCategoryChange = (categoryId: string) => {
    const monthName = getMonthNameIndonesian(new Date());
    const blok = form.reference.trim() || "-";
    const selected = categories.find((c) => c.id === categoryId);
    if (selected) {
      setForm((prev) => ({
        ...prev,
        categoryId,
        title: applyTemplate(selected.title_template, {
          bulan: monthName,
          blok,
        }),
        details: applyTemplate(selected.desc_template, {
          bulan: monthName,
          blok,
        }),
      }));
    } else {
      setForm((prev) => ({ ...prev, categoryId: "" }));
    }
  };

  /**
   * Called when the user toggles income/expense.
   * If the currently selected category doesn't apply to the new type, it is cleared.
   */
  const handleTypeChange = (type: TransactionType) => {
    setForm((prev) => {
      const selected = categories.find((c) => c.id === prev.categoryId);
      const stillValid =
        selected &&
        (selected.applies_to === type || selected.applies_to === "both");
      return {
        ...prev,
        type,
        categoryId: stillValid ? prev.categoryId : "",
        title: stillValid ? prev.title : "",
        details: stillValid ? prev.details : "",
      };
    });
  };

  /**
   * Re-applies the selected category's templates with the actual block value.
   * Called when transitioning from Step 2 → Step 3 so {blok} is properly resolved.
   */
  const reApplyTemplatesWithBlok = () => {
    const selected = categories.find((c) => c.id === form.categoryId);
    if (!selected) return;
    const monthName = getMonthNameIndonesian(new Date());
    const blok = form.reference.trim() || "-";
    setForm((prev) => ({
      ...prev,
      title: applyTemplate(selected.title_template, { bulan: monthName, blok }),
      details: applyTemplate(selected.desc_template, {
        bulan: monthName,
        blok,
      }),
    }));
  };

  const openForm = () => {
    setFormError(null);
    const defaultForm = getDefaultKasRtForm(new Date());

    // Pre-select the first income category and fill templates
    const firstCategory = categories.find(
      (c) => c.applies_to === "income" || c.applies_to === "both",
    );
    if (firstCategory) {
      const monthName = getMonthNameIndonesian(new Date());
      defaultForm.categoryId = firstCategory.id;
      defaultForm.title = applyTemplate(firstCategory.title_template, {
        bulan: monthName,
        blok: "-",
      });
      defaultForm.details = applyTemplate(firstCategory.desc_template, {
        bulan: monthName,
        blok: "-",
      });
    }

    setForm(defaultForm);
    setFormStep(1);
    setIsFormOpen(true);
  };

  const openEditForm = useCallback(
    (tx: TransactionItem) => {
      setFormError(null);
      setEditingTxId(tx.id);
      const matchingCategory = categories.find((c) => c.name === tx.category);
      setForm({
        type: tx.type,
        categoryId: matchingCategory?.id ?? "",
        amount: String(tx.amount),
        date: tx.date,
        reference: tx.reference ?? "",
        title: tx.title,
        details: tx.details ?? "",
      });
      setFormStep(1);
      setIsFormOpen(true);
    },
    [categories],
  );

  const closeForm = useCallback(() => {
    if (isSubmitting) return;
    setIsFormOpen(false);
    setEditingTxId(null);
  }, [isSubmitting]);

  const updateFormField = <K extends keyof KasRtFormState>(
    key: K,
    value: KasRtFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (
    event,
  ) => {
    event.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const amountNumber = Number(form.amount);
    if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      setFormError("Nominal tidak valid.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Derive the category name from the selected categoryId
      const selectedCategory = categories.find((c) => c.id === form.categoryId);
      const categoryName = selectedCategory?.name ?? null;

      let response: Response;

      if (editingTxId) {
        // PATCH — edit existing transaction (JSON, no file upload on edit)
        response = await apiFetch(`/api/kas-rt/transactions/${editingTxId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            amount: amountNumber,
            type: form.type,
            date: form.date,
            reference: form.reference.trim() || null,
            details: form.details.trim() || null,
            category: categoryName,
          }),
        });
      } else {
        // POST — new transaction with optional file attachments
        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("amount", String(amountNumber));
        formData.append("type", form.type);
        formData.append("date", form.date);
        formData.append("reference", form.reference.trim());
        formData.append("details", form.details.trim());
        if (categoryName) {
          formData.append("category", categoryName);
        }
        const files = fileInputRef.current?.files;
        if (files && files.length) {
          Array.from(files).forEach((file) => {
            formData.append("attachments", file);
          });
        }
        response = await apiFetch("/api/kas-rt/transactions", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        let message = "Gagal menyimpan transaksi.";
        try {
          const data = (await response.json()) as { message?: string };
          if (data?.message) {
            message = data.message;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      const created = (await response.json()) as TransactionItem;

      if (editingTxId) {
        // Update the transaction in place in the list
        setTransactions((prev) =>
          prev.map((t) => (t.id === created.id ? { ...t, ...created } : t)),
        );
        toast.success("Transaksi berhasil diperbarui.");
      } else {
        setTransactions((prev) => [created, ...prev]);
        toast.success("Transaksi kas RT berhasil disimpan.");
      }

      setForm(getDefaultKasRtForm(new Date()));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setAttachmentLabel("Belum ada file dipilih");
      setFormStep(1);
      setIsFormOpen(false);
      setEditingTxId(null);
      void refreshData();
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Terjadi kesalahan saat menyimpan.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTx = useCallback(async () => {
    if (!deletingTx) return;
    setIsDeleteConfirming(true);
    try {
      const res = await apiFetch(`/api/kas-rt/transactions/${deletingTx.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(body.message ?? "Gagal menghapus transaksi.");
        return;
      }
      setTransactions((prev) => prev.filter((t) => t.id !== deletingTx.id));
      toast.success(`Transaksi "${deletingTx.title}" berhasil dihapus.`);
      setDeletingTx(null);
    } catch {
      toast.error("Gagal terhubung ke server.");
    } finally {
      setIsDeleteConfirming(false);
    }
  }, [deletingTx]);

  if (isInitialLoading) {
    return <PageLoader message="Memuat kas RT..." />;
  }

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex items-center justify-center text-xs text-app-body-muted transition-all"
          style={{ height: `${Math.max(32, pullDistance)}px` }}
          aria-live="polite"
        >
          {isRefreshing
            ? "Menyegarkan transaksi..."
            : pullDistance > 48
              ? "Lepaskan untuk refresh"
              : "Tarik untuk refresh"}
        </div>

        {/* ── Balance card ─────────────────────────────────────────────────── */}
        <section className="rounded-3xl bg-emerald-600 p-5 text-white shadow-[0_20px_40px_-24px_rgba(16,24,40,0.65)]">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-emerald-50/90">
            Kas RT 03
          </p>
          <h1 className="mt-2 text-[1.85rem] font-bold leading-tight">
            {formatRupiah(totals.balance)}
          </h1>
          <p className="mt-2 text-sm text-emerald-50/95">
            Periode{" "}
            {now.toLocaleString("id-ID", { month: "long", year: "numeric" })}
          </p>
          <div className="mt-4 rounded-2xl bg-white/95 px-4 py-3 text-emerald-950 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-app-body-muted">
              Netto bulan ini
            </p>
            <p
              className={`mt-1 text-base font-bold ${
                totals.thisMonthNet >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {totals.thisMonthNet >= 0 ? "" : "-"}
              {formatRupiah(Math.abs(totals.thisMonthNet))}
            </p>
            <p className="mt-1 text-xs text-app-body-muted">
              Perbandingan dari bulan lalu:{" "}
              {totals.deltaFromPrevious >= 0 ? "+" : "-"}
              {formatRupiah(Math.abs(totals.deltaFromPrevious))}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-emerald-800 shadow-sm transition hover:bg-white active:scale-[0.98]"
                aria-expanded={isFilterOpen}
                aria-controls="transaction-filter-panel"
                aria-label={
                  isFilterOpen ? "Tutup filter" : "Buka filter transaksi"
                }
              >
                <FunnelIcon className="h-5 w-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => {
                  setDownloadError(null);
                  setIsDownloadModalOpen(true);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/95 text-emerald-800 shadow-sm transition hover:bg-white active:scale-[0.98]"
                aria-label="Unduh laporan kas RT"
              >
                <ArrowDownTrayIcon className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {canSubmitTransaction && (
              <button
                type="button"
                onClick={openForm}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition active:scale-[0.98]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  +
                </span>
                <span>Catat Transaksi</span>
              </button>
            )}
          </div>
        </section>

        {/* ── Filter panel ─────────────────────────────────────────────────── */}
        {isFilterOpen && (
          <div
            id="transaction-filter-panel"
            className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-200/80 bg-white/95 p-3 shadow-[0_16px_34px_-26px_rgba(22,101,52,0.55)]"
          >
            <label className="text-sm font-medium text-app-body">
              Jenis transaksi
              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(event.target.value as "all" | TransactionType)
                }
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none"
              >
                <option value="all">Semua transaksi</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </label>

            <label className="text-sm font-medium text-app-body">
              Kategori
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none"
              >
                <option value="">Semua kategori</option>
                {allCategoryNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-app-body">
              Blok
              <select
                value={blockFilter}
                onChange={(event) => setBlockFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none"
              >
                <option value="">Semua blok</option>
                {allBlockNames.map((blok) => (
                  <option key={blok} value={blok}>
                    Blok {blok}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium text-app-body">
                Tanggal mulai
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none"
                />
              </label>
              <label className="text-sm font-medium text-app-body">
                Tanggal akhir
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none"
                />
              </label>
            </div>
          </div>
        )}

        <p className="mt-3 text-xs text-app-body-muted">
          Terakhir diperbarui:{" "}
          {refreshedAt.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* ── Transaction list ──────────────────────────────────────────────── */}
        <section
          className="mt-4 space-y-3"
          aria-label="Daftar transaksi kas RT"
        >
          {filteredTransactions.length === 0 ? (
            <div className="rounded-2xl bg-app-surface p-5 text-center text-sm text-app-body-muted shadow-sm">
              Tidak ada transaksi untuk filter ini.
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isIncome = tx.type === "income";
              return (
                <article
                  key={tx.id}
                  className="rounded-2xl border border-emerald-100/80 bg-app-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-app-title">
                        {tx.title}
                      </h3>
                      {tx.details && (
                        <p className="mt-1 text-sm text-app-body line-clamp-2">
                          {tx.details}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p
                        className={`text-sm font-bold ${isIncome ? "text-emerald-700" : "text-red-600"}`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatRupiah(tx.amount)}
                      </p>
                      {canSubmitTransaction && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => openEditForm(tx)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-emerald-50 hover:text-emerald-700 active:scale-90"
                            aria-label={`Edit transaksi ${tx.title}`}
                          >
                            <PencilSquareIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-red-50 hover:text-red-600 active:scale-90"
                            aria-label={`Hapus transaksi ${tx.title}`}
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-body-muted">
                    <span>
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {tx.reference && (
                      <>
                        <span
                          className="inline-block h-1 w-1 rounded-full bg-emerald-300"
                          aria-hidden
                        />
                        <span>Blok {tx.reference}</span>
                      </>
                    )}
                    {tx.category && (
                      <>
                        <span
                          className="inline-block h-1 w-1 rounded-full bg-emerald-300"
                          aria-hidden
                        />
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isIncome
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {tx.category}
                        </span>
                      </>
                    )}
                    {tx.created_by_full_name && (
                      <>
                        <span
                          className="inline-block h-1 w-1 rounded-full bg-emerald-300"
                          aria-hidden
                        />
                        <span>Dicatat oleh: {tx.created_by_full_name}</span>
                      </>
                    )}
                  </div>

                  {tx.attachments?.length ? (
                    <div className="mt-3 flex justify-end">
                      <details className="rounded-xl bg-emerald-50/70 p-2">
                        <summary className="cursor-pointer list-none text-right text-xs text-app-body-muted [&::-webkit-details-marker]:hidden">
                          Lampiran
                        </summary>
                        <ul className="mt-2 space-y-2 text-sm">
                          {tx.attachments.map((att) => {
                            const isImage = att.mime_type?.startsWith("image/");
                            if (isImage && att.url) {
                              return (
                                <li key={att.url}>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block"
                                  >
                                    <img
                                      src={att.url}
                                      alt=""
                                      className="max-h-48 rounded-lg border border-emerald-200 object-contain hover:opacity-90"
                                    />
                                  </a>
                                </li>
                              );
                            }
                            if (att.url) {
                              return (
                                <li key={att.url}>
                                  <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-app-primary underline hover:no-underline"
                                  >
                                    📎 Buka dokumen
                                  </a>
                                </li>
                              );
                            }
                            return null;
                          })}
                        </ul>
                      </details>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      </div>

      {/* ── Download modal ──────────────────────────────────────────────────── */}
      {isDownloadModalOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={() => {
            if (!isDownloading) {
              setIsDownloadModalOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-app-surface p-4 shadow-[0_-16px_40px_-24px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kas-rt-download-title"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2
                  id="kas-rt-download-title"
                  className="text-base font-bold text-app-title"
                >
                  Unduh laporan kas RT
                </h2>
                <p className="mt-1 text-xs text-app-body-muted">
                  Pilih rentang tanggal dan filter opsional sebelum mengunduh
                  laporan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !isDownloading && setIsDownloadModalOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-app-body-muted hover:bg-app-surface-alt/70 disabled:opacity-50"
                disabled={isDownloading}
              >
                Tutup
              </button>
            </div>

            <div className="space-y-3">
              {/* Format selector */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-app-body">
                  Format laporan
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDownloadFormat("excel")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      downloadFormat === "excel"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-emerald-100 bg-white text-app-body-muted hover:border-emerald-300"
                    }`}
                  >
                    <TableCellsIcon className="h-3.5 w-3.5" />
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadFormat("pdf")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      downloadFormat === "pdf"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-emerald-100 bg-white text-app-body-muted hover:border-emerald-300"
                    }`}
                  >
                    <DocumentTextIcon className="h-3.5 w-3.5" />
                    PDF (.pdf)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-app-body">
                  Tanggal mulai
                  <input
                    type="date"
                    value={downloadStartDate}
                    onChange={(event) =>
                      setDownloadStartDate(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none focus-visible:outline-none"
                  />
                </label>
                <label className="block text-xs font-medium text-app-body">
                  Tanggal akhir
                  <input
                    type="date"
                    value={downloadEndDate}
                    onChange={(event) => setDownloadEndDate(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none focus-visible:outline-none"
                  />
                </label>
              </div>

              <label className="block text-xs font-medium text-app-body">
                Kategori
                <select
                  value={downloadCategory}
                  onChange={(event) => setDownloadCategory(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none focus-visible:outline-none"
                >
                  <option value="">Semua kategori</option>
                  {allCategoryNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-medium text-app-body">
                Blok
                <input
                  type="text"
                  value={downloadBlock}
                  onChange={(event) => setDownloadBlock(event.target.value)}
                  placeholder="Biarkan kosong untuk semua blok"
                  className="mt-1 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-app-body focus:border-emerald-400 focus:outline-none focus-visible:outline-none"
                />
              </label>

              {downloadError && (
                <p className="text-xs text-red-600">{downloadError}</p>
              )}

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-emerald-100/60 pt-3">
                <button
                  type="button"
                  onClick={() =>
                    !isDownloading && setIsDownloadModalOpen(false)
                  }
                  className="rounded-2xl px-4 py-2 text-xs font-semibold text-app-body-muted disabled:opacity-50"
                  disabled={isDownloading}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={
                    isDownloading || !downloadStartDate || !downloadEndDate
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDownloading ? "Menyiapkan laporan..." : "Unduh laporan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction form modal ──────────────────────────────────────────── */}
      {isFormOpen && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
          onClick={closeForm}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl bg-app-surface p-4 shadow-[0_-16px_40px_-24px_rgba(15,23,42,0.6)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kas-rt-form-title"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2
                id="kas-rt-form-title"
                className="text-base font-bold text-app-title"
              >
                {editingTxId ? "Edit Transaksi" : "Transaksi Kas RT"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                  isIncomeForm
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
                disabled={isSubmitting}
              >
                Tutup
              </button>
            </div>

            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              {/* Step indicator */}
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      // Re-apply templates with actual blok when jumping to step 3
                      if (step === 3) {
                        reApplyTemplatesWithBlok();
                      }
                      setFormStep(step);
                    }}
                    className={`h-2 flex-1 rounded-full transition ${
                      formStep === step
                        ? isIncomeForm
                          ? "bg-emerald-600"
                          : "bg-red-600"
                        : "bg-app-body-muted/30"
                    }`}
                    aria-label={`Langkah ${step}`}
                  />
                ))}
              </div>

              {/* ── Step 1: Jenis + Kategori ─────────────────────────────── */}
              {formStep === 1 && (
                <div className="space-y-4 pt-1">
                  {/* Income / Expense toggle */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-app-body">
                      Jenis transaksi
                    </p>
                    <div
                      className={`inline-flex rounded-2xl p-1 ${
                        isIncomeForm ? "bg-emerald-50" : "bg-red-50"
                      }`}
                    >
                      {(["income", "expense"] as TransactionType[]).map(
                        (value) => {
                          const active = form.type === value;
                          const activeClasses =
                            value === "income"
                              ? active
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-transparent text-emerald-800"
                              : active
                                ? "bg-red-600 text-white shadow-sm"
                                : "bg-transparent text-red-800";
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => handleTypeChange(value)}
                              className={`min-w-[4.5rem] rounded-2xl px-3 py-1 text-xs font-semibold transition ${activeClasses}`}
                            >
                              {value === "income" ? "Pemasukan" : "Pengeluaran"}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {/* Category selection */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-app-body">
                      Kategori{" "}
                      <span
                        className={
                          isIncomeForm ? "text-emerald-500" : "text-red-500"
                        }
                      >
                        *
                      </span>
                    </p>
                    {visibleCategories.length === 0 ? (
                      <p className="text-xs text-app-body-muted">
                        Memuat kategori…
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {visibleCategories.map((cat) => {
                          const isSelected = form.categoryId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => handleCategoryChange(cat.id)}
                              className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97] ${
                                isSelected
                                  ? isIncomeForm
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                                    : "border-red-500 bg-red-50 text-red-800 shadow-sm"
                                  : "border-app-border bg-white text-app-body hover:border-emerald-300"
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 2: Jumlah, Tanggal, Blok ─────────────────────────── */}
              {formStep === 2 && (
                <div className="space-y-4 pt-1">
                  <label className="block text-xs font-medium text-app-body">
                    Jumlah
                    <div
                      className={`mt-1 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 ${
                        isIncomeForm
                          ? "border-emerald-200 focus-within:border-emerald-400"
                          : "border-red-200 focus-within:border-red-400"
                      }`}
                    >
                      <span className="text-xs font-semibold text-app-body-muted">
                        Rp
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatAmountDisplay(form.amount)}
                        onChange={(e) =>
                          updateFormField(
                            "amount",
                            parseAmountInput(e.target.value),
                          )
                        }
                        className="w-full border-none bg-transparent text-sm text-app-body outline-none focus:ring-0 focus-visible:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </label>
                  <label className="block text-xs font-medium text-app-body">
                    Tanggal
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => updateFormField("date", e.target.value)}
                      className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-app-body focus:outline-none focus-visible:outline-none ${
                        isIncomeForm
                          ? "border-emerald-200 focus:border-emerald-400"
                          : "border-red-200 focus:border-red-400"
                      }`}
                    />
                  </label>
                  <label className="block text-xs font-medium text-app-body">
                    Blok <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={form.reference}
                      onChange={(e) =>
                        updateFormField("reference", e.target.value)
                      }
                      placeholder="Contoh: N2"
                      maxLength={20}
                      className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-app-body focus:outline-none focus-visible:outline-none ${
                        isIncomeForm
                          ? "border-emerald-200 focus:border-emerald-400"
                          : "border-red-200 focus:border-red-400"
                      }`}
                    />
                  </label>
                </div>
              )}

              {/* ── Step 3: Judul, Deskripsi, Lampiran ────────────────────── */}
              {formStep === 3 && (
                <div className="space-y-4 pt-1">
                  <label className="block text-xs font-medium text-app-body">
                    Judul transaksi <span className="text-red-500">*</span>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => updateFormField("title", e.target.value)}
                      placeholder="Contoh: IPL Bulan Juni"
                      className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm text-app-body focus:outline-none focus-visible:outline-none ${
                        isIncomeForm
                          ? "border-emerald-200 focus:border-emerald-400"
                          : "border-red-200 focus:border-red-400"
                      }`}
                    />
                  </label>
                  <label className="block text-xs font-medium text-app-body">
                    Deskripsi
                    <textarea
                      value={form.details}
                      onChange={(e) =>
                        updateFormField("details", e.target.value)
                      }
                      rows={3}
                      placeholder="Catatan, rincian biaya, dll."
                      className={`mt-1 w-full resize-none rounded-xl border bg-white px-3 py-2 text-sm text-app-body focus:outline-none focus-visible:outline-none ${
                        isIncomeForm
                          ? "border-emerald-200 focus:border-emerald-400"
                          : "border-red-200 focus:border-red-400"
                      }`}
                    />
                  </label>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-app-body">
                      {editingTxId
                        ? "Lampiran (tidak dapat diubah)"
                        : "Lampiran"}
                    </p>
                    {!editingTxId && (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = e.target.files;
                            if (!files?.length)
                              setAttachmentLabel("Belum ada file dipilih");
                            else if (files.length === 1)
                              setAttachmentLabel(files[0].name);
                            else
                              setAttachmentLabel(
                                `${files.length} file dipilih`,
                              );
                          }}
                          className="absolute h-0 w-0 opacity-0"
                          id="kas-rt-attachment-input"
                        />
                        <label
                          htmlFor="kas-rt-attachment-input"
                          className={`cursor-pointer rounded-xl border-0 px-3 py-1.5 text-xs font-semibold transition ${
                            isIncomeForm
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          Pilih file
                        </label>
                        <span className="text-xs text-app-body-muted">
                          {attachmentLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {formError && (
                <p className="mt-1 text-xs text-red-600">{formError}</p>
              )}

              {/* ── Navigation buttons ─────────────────────────────────────── */}
              <div
                className={`mt-3 flex items-center justify-between gap-2 border-t pt-3 ${
                  isIncomeForm ? "border-emerald-100/60" : "border-red-100/60"
                }`}
              >
                <div className="flex gap-2">
                  {formStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setFormStep((s) => (s - 1) as 1 | 2 | 3)}
                      className="rounded-2xl px-4 py-2 text-xs font-semibold text-app-body-muted"
                      disabled={isSubmitting}
                    >
                      Kembali
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={closeForm}
                      className="rounded-2xl px-4 py-2 text-xs font-semibold text-app-body-muted"
                      disabled={isSubmitting}
                    >
                      Batal
                    </button>
                  )}
                </div>
                {formStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (formStep === 2) {
                        reApplyTemplatesWithBlok();

                        // Duplicate block+month check (skip when editing same tx)
                        const formMonth = new Date(form.date).getMonth();
                        const formYear = new Date(form.date).getFullYear();
                        const formBlock = form.reference.trim().toLowerCase();
                        const matches = transactions.filter((tx) => {
                          if (editingTxId && tx.id === editingTxId)
                            return false;
                          const d = new Date(tx.date);
                          return (
                            (tx.reference ?? "").trim().toLowerCase() ===
                              formBlock &&
                            d.getMonth() === formMonth &&
                            d.getFullYear() === formYear
                          );
                        });
                        if (matches.length > 0) {
                          setDuplicateWarning({
                            matches,
                            onConfirm: () => {
                              setDuplicateWarning(null);
                              setFormStep(3);
                            },
                          });
                          return;
                        }
                      }
                      setFormStep((s) => (s + 1) as 1 | 2 | 3);
                    }}
                    disabled={
                      (formStep === 1 && !isStep1Valid) ||
                      (formStep === 2 && !isStep2Valid)
                    }
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                      isIncomeForm ? "bg-emerald-600" : "bg-red-600"
                    } disabled:opacity-50`}
                  >
                    Lanjut
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!isFormValid || isSubmitting}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSubmit(
                        e as unknown as React.FormEvent<HTMLFormElement>,
                      );
                    }}
                    className={`rounded-2xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition ${
                      !isFormValid || isSubmitting
                        ? "cursor-not-allowed opacity-50"
                        : isIncomeForm
                          ? "bg-emerald-600 active:scale-[0.98]"
                          : "bg-red-600 active:scale-[0.98]"
                    }`}
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan"}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Duplicate warning modal ──────────────────────────────────────── */}
      {duplicateWarning && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            style={{ animation: "fadeIn 180ms ease forwards" }}
            onClick={() => setDuplicateWarning(null)}
          />
          <div
            className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-[390px] -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{
              animation:
                "fadeInScale 220ms cubic-bezier(0.22,1,0.36,1) forwards",
            }}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex flex-col items-center px-5 pb-2 pt-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
                <ExclamationTriangleIcon className="h-7 w-7 text-amber-500" />
              </div>
              <h3 className="text-base font-bold text-app-title">
                Transaksi Sudah Ada
              </h3>
              <p className="mt-1.5 text-sm text-app-body-muted leading-relaxed">
                Sudah ada{" "}
                <span className="font-semibold text-app-body">
                  {duplicateWarning.matches.length} transaksi
                </span>{" "}
                untuk blok{" "}
                <span className="font-semibold text-app-body">
                  {form.reference}
                </span>{" "}
                pada bulan yang sama.
              </p>
            </div>

            {/* Existing transactions list */}
            <div className="mx-4 mb-4 mt-3 max-h-36 overflow-y-auto rounded-2xl border border-amber-100 bg-amber-50/60">
              {duplicateWarning.matches.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b border-amber-100/60 px-3 py-2 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-app-body">
                      {tx.title}
                    </p>
                    <p className="text-[10px] text-app-body-muted">
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                      })}
                      {tx.category ? ` · ${tx.category}` : ""}
                    </p>
                  </div>
                  <span
                    className={`ml-2 shrink-0 text-xs font-bold ${
                      tx.type === "income" ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2.5 border-t border-emerald-100/60 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 rounded-2xl border border-emerald-200 py-2.5 text-sm font-semibold text-app-body-muted transition hover:bg-app-surface-alt active:scale-95"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={duplicateWarning.onConfirm}
                className="flex-1 rounded-2xl bg-amber-500 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-95"
              >
                Tetap Lanjutkan
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {deletingTx && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            style={{ animation: "fadeIn 180ms ease forwards" }}
            onClick={() => !isDeleteConfirming && setDeletingTx(null)}
          />
          <div
            className="fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-[390px] -translate-y-1/2 overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{
              animation:
                "fadeInScale 220ms cubic-bezier(0.22,1,0.36,1) forwards",
            }}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex flex-col items-center px-5 pb-2 pt-6 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <TrashIcon className="h-7 w-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-app-title">
                Hapus Transaksi?
              </h3>
              <p className="mt-1.5 text-sm text-app-body-muted leading-relaxed">
                <span className="font-semibold text-app-body">
                  &ldquo;{deletingTx.title}&rdquo;
                </span>{" "}
                akan dihapus. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex gap-2.5 border-t border-red-100/60 px-4 py-3.5">
              <button
                type="button"
                onClick={() => !isDeleteConfirming && setDeletingTx(null)}
                disabled={isDeleteConfirming}
                className="flex-1 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-app-body-muted transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteTx}
                disabled={isDeleteConfirming}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleteConfirming ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Menghapus…
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Ya, Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
