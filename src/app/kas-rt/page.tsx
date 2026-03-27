"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChevronLeftIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MapPinIcon,
  PencilSquareIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRupiahCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const millions = abs / 1_000_000;
    return `${sign}${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}jt`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}rb`;
  }
  return `${sign}${abs.toLocaleString("id-ID")}`;
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

// ─── Focus ring helpers ───────────────────────────────────────────────────────

function applyFocusRing(el: HTMLElement) {
  el.style.borderColor = "var(--color-primary)";
  el.style.boxShadow =
    "0 0 0 3px color-mix(in srgb, var(--color-primary) 16%, white 84%)";
}

function clearFocusRing(el: HTMLElement) {
  el.style.borderColor = "var(--color-input-border)";
  el.style.boxShadow = "none";
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function KasRTPage() {
  const now = new Date();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [blockFilter, setBlockFilter] = useState("");
  const [startDate, setStartDate] = useState(
    toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [endDate, setEndDate] = useState(toDateInputValue(now));
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // ── Pull-to-refresh ──────────────────────────────────────────────────────────
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(now);

  // ── Transaction list ──────────────────────────────────────────────────────────
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // ── Download modal ────────────────────────────────────────────────────────────
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

  // ── Form state ────────────────────────────────────────────────────────────────
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

  // ── Categories ────────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<KasRtCategory[]>([]);
  const [canSubmitTransaction, setCanSubmitTransaction] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Edit / delete state ───────────────────────────────────────────────────────
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionItem | null>(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // ── Duplicate-check modal ─────────────────────────────────────────────────────
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matches: TransactionItem[];
    onConfirm: () => void;
  } | null>(null);

  const isIncomeForm = form.type === "income";

  // ── Mount / auth guard ────────────────────────────────────────────────────────
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

  // ── Derived ───────────────────────────────────────────────────────────────────
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.applies_to === form.type || c.applies_to === "both",
      ),
    [categories, form.type],
  );

  const allCategoryNames = useMemo(
    () => Array.from(new Set(categories.map((c) => c.name))).sort(),
    [categories],
  );

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

  const totals = useMemo(() => {
    const balance = transactions.reduce(
      (sum, tx) => (tx.type === "income" ? sum + tx.amount : sum - tx.amount),
      0,
    );

    const thisMonthIndex = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonthDate = new Date(thisYear, thisMonthIndex - 1, 1);
    const prevMonthIndex = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    const thisMonthIncome = transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return (
          tx.type === "income" &&
          d.getMonth() === thisMonthIndex &&
          d.getFullYear() === thisYear
        );
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const thisMonthExpense = transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return (
          tx.type === "expense" &&
          d.getMonth() === thisMonthIndex &&
          d.getFullYear() === thisYear
        );
      })
      .reduce((sum, tx) => sum + tx.amount, 0);

    const thisMonthNet = thisMonthIncome - thisMonthExpense;

    const prevMonthNet = transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        return d.getMonth() === prevMonthIndex && d.getFullYear() === prevYear;
      })
      .reduce(
        (sum, tx) => (tx.type === "income" ? sum + tx.amount : sum - tx.amount),
        0,
      );

    // Balance as of the last day of the previous month
    const prevMonthEnd = new Date(thisYear, thisMonthIndex, 0);
    const prevMonthEndStr = toDateInputValue(prevMonthEnd);
    const prevMonthEndLabel = prevMonthEnd.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const balanceEndOfPrevMonth = transactions
      .filter((tx) => tx.date <= prevMonthEndStr)
      .reduce(
        (sum, tx) => (tx.type === "income" ? sum + tx.amount : sum - tx.amount),
        0,
      );

    const deltaFromPrevious = thisMonthNet - prevMonthNet;
    return {
      balance,
      balanceEndOfPrevMonth,
      prevMonthEndLabel,
      thisMonthIncome,
      thisMonthExpense,
      thisMonthNet,
      deltaFromPrevious,
    };
  }, [now, transactions]);

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

  const activeAdvancedFilterCount = useMemo(() => {
    const defaultStart = toDateInputValue(
      new Date(now.getFullYear(), now.getMonth(), 1),
    );
    return [
      categoryFilter.trim() !== "",
      blockFilter.trim() !== "",
      startDate !== defaultStart,
    ].filter(Boolean).length;
  }, [categoryFilter, blockFilter, startDate, now]);

  // ── Validation ────────────────────────────────────────────────────────────────
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

  // ── Data loaders ──────────────────────────────────────────────────────────────
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
      // silently ignore
    }
  }

  const loadCategories = useCallback(async () => {
    try {
      const response = await apiFetch("/api/kas-rt/categories");
      if (!response.ok) return;
      const data = (await response.json()) as KasRtCategory[];
      setCategories(data);
    } catch {
      // silently ignore
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

  // ── Download report ───────────────────────────────────────────────────────────
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

  // ── Pull-to-refresh touch handlers ────────────────────────────────────────────
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
    if (pullDistance > 48) void refreshData();
    setPullDistance(0);
    setTouchStartY(null);
  };

  // ── Form helpers ──────────────────────────────────────────────────────────────
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

  // ── Submit ────────────────────────────────────────────────────────────────────
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
      const selectedCategory = categories.find((c) => c.id === form.categoryId);
      const categoryName = selectedCategory?.name ?? null;
      let response: Response;

      if (editingTxId) {
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
        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("amount", String(amountNumber));
        formData.append("type", form.type);
        formData.append("date", form.date);
        formData.append("reference", form.reference.trim());
        formData.append("details", form.details.trim());
        if (categoryName) formData.append("category", categoryName);
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
          if (data?.message) message = data.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const created = (await response.json()) as TransactionItem;

      if (editingTxId) {
        setTransactions((prev) =>
          prev.map((t) => (t.id === created.id ? { ...t, ...created } : t)),
        );
        toast.success("Transaksi berhasil diperbarui.");
      } else {
        setTransactions((prev) => [created, ...prev]);
        toast.success("Transaksi kas RT berhasil disimpan.");
      }

      setForm(getDefaultKasRtForm(new Date()));
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  // ─────────────────────────────────────────────────────────────────────────────

  if (isInitialLoading) {
    return <PageLoader message="Memuat kas RT..." />;
  }

  const stepButtonStyle = (step: 1 | 2 | 3) => ({
    background:
      formStep >= step
        ? isIncomeForm
          ? "var(--color-primary)"
          : "#dc2626"
        : "var(--color-input-border)",
  });

  const nextButtonDisabled =
    (formStep === 1 && !isStep1Valid) || (formStep === 2 && !isStep2Valid);

  const actionButtonStyle = (disabled: boolean) => ({
    background: disabled
      ? "var(--color-body-muted)"
      : isIncomeForm
        ? "var(--color-primary)"
        : "#dc2626",
    boxShadow:
      disabled || !isIncomeForm
        ? "none"
        : "0 8px 22px -12px var(--color-primary-shadow)",
  });

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Scrollable container (hero + filter + list) ────────────────────── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* ── Gradient Hero ──────────────────────────────────────────────────── */}
        <section
          className="relative shrink-0 overflow-hidden px-4 pb-5 pt-5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)",
          }}
          aria-label="Kas RT"
        >
          {/* Decorative blobs */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10"
            aria-hidden
          />

          <div className="relative z-10">
            {/* Nav row */}
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                  Warga Digital · Keuangan
                </p>
                <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                  Kas RT
                </h1>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDownloadError(null);
                  setIsDownloadModalOpen(true);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
                aria-label="Unduh laporan kas RT"
              >
                <ArrowDownTrayIcon className="h-4 w-4 text-white" />
              </button>

              <button
                type="button"
                onClick={() => void refreshData()}
                disabled={isRefreshing}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
                aria-label="Segarkan data"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 text-white ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            {/* Balance showcase */}
            <div className="mt-5 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/60">
                  Saldo Total
                </p>
                <p className="mt-1 truncate text-[22px] font-extrabold leading-tight text-white">
                  {formatRupiah(totals.balance)}
                </p>
                <p className="mt-1 text-[10px] text-white/50">
                  Periode{" "}
                  {now.toLocaleString("id-ID", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {canSubmitTransaction && (
                <button
                  type="button"
                  onClick={openForm}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/20 px-3.5 py-2.5 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-white/30 active:scale-95"
                  aria-label="Catat transaksi baru"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Catat
                </button>
              )}
            </div>

            {/* Stats strip — 3 informational metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Saldo akhir bulan lalu */}
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Saldo Bln Lalu
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {formatRupiahCompact(totals.balanceEndOfPrevMonth)}
                </p>
                <p className="mt-0.5 text-[8px] leading-tight text-white/50">
                  {totals.prevMonthEndLabel}
                </p>
              </div>

              {/* Pemasukan bulan ini */}
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Masuk Bln Ini
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {formatRupiahCompact(totals.thisMonthIncome)}
                </p>
                <p className="mt-0.5 text-[8px] leading-tight text-white/50">
                  {now.toLocaleString("id-ID", { month: "short" })}
                </p>
              </div>

              {/* Pengeluaran bulan ini */}
              <div className="rounded-xl bg-white/15 px-2 py-2.5 text-center backdrop-blur-sm">
                <p className="text-[9px] font-semibold uppercase tracking-wider leading-tight text-white/60">
                  Keluar Bln Ini
                </p>
                <p className="mt-1 text-sm font-extrabold leading-tight text-white">
                  {formatRupiahCompact(totals.thisMonthExpense)}
                </p>
                <p className="mt-0.5 text-[8px] leading-tight text-white/50">
                  {now.toLocaleString("id-ID", { month: "short" })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 bg-app-surface-alt px-4 py-3"
          style={{ borderBottom: "1px solid var(--color-input-border)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {(
                [
                  { key: "all", label: "Semua" },
                  { key: "income", label: "Pemasukan" },
                  { key: "expense", label: "Pengeluaran" },
                ] as const
              ).map(({ key, label }) => {
                const isActive = typeFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTypeFilter(key)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition active:scale-95 ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-app-surface text-app-body-muted hover:bg-app-surface-alt"
                    }`}
                    style={
                      isActive
                        ? { background: "var(--color-primary)" }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsFilterOpen(true)}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-surface transition hover:bg-app-surface-alt active:scale-90"
              aria-label="Filter lanjutan"
            >
              <FunnelIcon className="h-4 w-4 text-app-body-muted" />
              {activeAdvancedFilterCount > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold leading-none text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  {activeAdvancedFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── List content ────────────────────────────────────────────────── */}
        <div
          className="px-4 pb-8 pt-3"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Pull-to-refresh indicator */}
          {(pullDistance > 0 || isRefreshing) && (
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
          )}

          {/* Empty state */}
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-app-surface px-6 py-10 text-center shadow-[0_4px_16px_rgba(0,40,5,0.05)]">
              <BanknotesIcon
                className="h-10 w-10 text-app-body-muted/30"
                aria-hidden
              />
              <p className="text-sm font-bold text-app-body-muted">
                {transactions.length === 0
                  ? "Belum ada transaksi"
                  : "Tidak ada transaksi"}
              </p>
              <p className="max-w-[180px] text-xs leading-relaxed text-app-body-muted/70">
                {transactions.length === 0
                  ? "Mulai catat transaksi pemasukan dan pengeluaran kas RT."
                  : "Tidak ada transaksi yang cocok dengan filter aktif."}
              </p>
              {transactions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setCategoryFilter("");
                    setBlockFilter("");
                    setStartDate(
                      toDateInputValue(
                        new Date(now.getFullYear(), now.getMonth(), 1),
                      ),
                    );
                    setEndDate(toDateInputValue(now));
                  }}
                  className="text-xs font-bold transition hover:opacity-70"
                  style={{ color: "var(--color-primary)" }}
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            /* Transaction list */
            <div className="space-y-2.5">
              {filteredTransactions.map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <article
                    key={tx.id}
                    className="rounded-2xl bg-app-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {tx.category && (
                          <span className="text-[10px] font-medium text-app-body-muted">
                            {tx.category}
                          </span>
                        )}
                        <h3
                          className={`text-sm font-bold leading-snug text-app-title ${tx.category ? "mt-0.5" : ""}`}
                        >
                          {tx.title}
                        </h3>
                        {tx.details && (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-app-body-muted">
                            {tx.details}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-extrabold ${isIncome ? "text-app-primary" : "text-red-600"}`}
                        >
                          {isIncome ? "+" : "-"}
                          {formatRupiah(tx.amount)}
                        </p>
                        {canSubmitTransaction && (
                          <div className="mt-1 flex justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => openEditForm(tx)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl transition hover:bg-app-primary-muted active:scale-90"
                              style={{ color: "var(--color-primary)" }}
                              aria-label={`Edit transaksi ${tx.title}`}
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTx(tx)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 active:scale-90"
                              aria-label={`Hapus transaksi ${tx.title}`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detail row */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-body-muted">
                      <div className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-3.5 w-3.5" aria-hidden />
                        <span>
                          {new Date(tx.date).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {tx.reference && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="h-3.5 w-3.5" aria-hidden />
                          <span>Blok {tx.reference}</span>
                        </div>
                      )}
                      {tx.created_by_full_name && (
                        <div className="flex items-center gap-1">
                          <UserCircleIcon className="h-3.5 w-3.5" aria-hidden />
                          <span className="max-w-[120px] truncate">
                            {tx.created_by_full_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Attachments */}
                    {tx.attachments?.length ? (
                      <div className="mt-3 flex justify-end">
                        <details className="rounded-xl bg-app-surface-alt px-3 py-2">
                          <summary className="cursor-pointer list-none text-right text-xs font-medium text-app-body-muted [&::-webkit-details-marker]:hidden">
                            📎 {tx.attachments.length} lampiran
                          </summary>
                          <ul className="mt-2 space-y-2">
                            {tx.attachments.map((att) => {
                              const isImage =
                                att.mime_type?.startsWith("image/");
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
                                        className="max-h-48 rounded-xl object-contain"
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
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2 hover:no-underline"
                                      style={{ color: "var(--color-primary)" }}
                                    >
                                      <DocumentTextIcon className="h-3.5 w-3.5" />
                                      Buka dokumen
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
              })}
            </div>
          )}

          {/* Footer */}
          <p className="mt-4 text-center text-[10px] text-app-body-muted/50">
            Diperbarui{" "}
            {refreshedAt.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · {transactions.length} transaksi
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FILTER BOTTOM SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      {isFilterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsFilterOpen(false)}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
            style={{
              maxWidth: "var(--app-max-width)",
              animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Filter transaksi"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: "var(--color-input-border)" }}
              />
            </div>

            <div className="px-5 pb-8 pt-3">
              {/* Sheet header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-extrabold text-app-title">
                    Filter Transaksi
                  </h2>
                  <p className="mt-0.5 text-xs text-app-body-muted">
                    Saring berdasarkan kategori, blok, atau tanggal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90"
                  aria-label="Tutup filter"
                >
                  <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Kategori
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                    style={{ borderColor: "var(--color-input-border)" }}
                    onFocus={(e) => applyFocusRing(e.currentTarget)}
                    onBlur={(e) => clearFocusRing(e.currentTarget)}
                  >
                    <option value="">Semua kategori</option>
                    {allCategoryNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Block */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Blok
                  </label>
                  <select
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                    style={{ borderColor: "var(--color-input-border)" }}
                    onFocus={(e) => applyFocusRing(e.currentTarget)}
                    onBlur={(e) => clearFocusRing(e.currentTarget)}
                  >
                    <option value="">Semua blok</option>
                    {allBlockNames.map((blok) => (
                      <option key={blok} value={blok}>
                        Blok {blok}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      Dari
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                      style={{ borderColor: "var(--color-input-border)" }}
                      onFocus={(e) => applyFocusRing(e.currentTarget)}
                      onBlur={(e) => clearFocusRing(e.currentTarget)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      Hingga
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                      style={{ borderColor: "var(--color-input-border)" }}
                      onFocus={(e) => applyFocusRing(e.currentTarget)}
                      onBlur={(e) => clearFocusRing(e.currentTarget)}
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("");
                    setBlockFilter("");
                    setStartDate(
                      toDateInputValue(
                        new Date(now.getFullYear(), now.getMonth(), 1),
                      ),
                    );
                    setEndDate(toDateInputValue(now));
                  }}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95"
                  style={{
                    background: "var(--color-primary)",
                    boxShadow: "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DOWNLOAD BOTTOM SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      {isDownloadModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDownloading && setIsDownloadModalOpen(false)}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
            style={{
              maxWidth: "var(--app-max-width)",
              animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kas-rt-download-title"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: "var(--color-input-border)" }}
              />
            </div>

            <div className="px-5 pb-8 pt-3">
              {/* Sheet header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2
                    id="kas-rt-download-title"
                    className="text-lg font-extrabold text-app-title"
                  >
                    Unduh Laporan
                  </h2>
                  <p className="mt-0.5 text-xs text-app-body-muted">
                    Pilih rentang tanggal dan format laporan
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    !isDownloading && setIsDownloadModalOpen(false)
                  }
                  disabled={isDownloading}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
                  aria-label="Tutup"
                >
                  <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Format selector */}
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Format Laporan
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["excel", "pdf"] as const).map((fmt) => {
                      const isSelected = downloadFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setDownloadFormat(fmt)}
                          className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${
                            isSelected
                              ? "text-white shadow-sm"
                              : "bg-white text-app-body-muted"
                          }`}
                          style={
                            isSelected
                              ? {
                                  background: "var(--color-primary)",
                                  borderColor: "var(--color-primary)",
                                }
                              : { borderColor: "var(--color-input-border)" }
                          }
                        >
                          {fmt === "excel" ? (
                            <TableCellsIcon className="h-4 w-4" />
                          ) : (
                            <DocumentTextIcon className="h-4 w-4" />
                          )}
                          {fmt === "excel" ? "Excel (.xlsx)" : "PDF (.pdf)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      value={downloadStartDate}
                      onChange={(e) => setDownloadStartDate(e.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                      style={{ borderColor: "var(--color-input-border)" }}
                      onFocus={(e) => applyFocusRing(e.currentTarget)}
                      onBlur={(e) => clearFocusRing(e.currentTarget)}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                      Hingga
                    </label>
                    <input
                      type="date"
                      value={downloadEndDate}
                      onChange={(e) => setDownloadEndDate(e.target.value)}
                      className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                      style={{ borderColor: "var(--color-input-border)" }}
                      onFocus={(e) => applyFocusRing(e.currentTarget)}
                      onBlur={(e) => clearFocusRing(e.currentTarget)}
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                    Kategori{" "}
                    <span className="font-normal normal-case text-app-body-muted/70">
                      (opsional)
                    </span>
                  </label>
                  <select
                    value={downloadCategory}
                    onChange={(e) => setDownloadCategory(e.target.value)}
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                    style={{ borderColor: "var(--color-input-border)" }}
                    onFocus={(e) => applyFocusRing(e.currentTarget)}
                    onBlur={(e) => clearFocusRing(e.currentTarget)}
                  >
                    <option value="">Semua kategori</option>
                    {allCategoryNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Block */}
                <div>
                  <label
                    htmlFor="download-block"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                  >
                    Blok{" "}
                    <span className="font-normal normal-case text-app-body-muted/70">
                      (opsional)
                    </span>
                  </label>
                  <input
                    id="download-block"
                    type="text"
                    value={downloadBlock}
                    onChange={(e) => setDownloadBlock(e.target.value)}
                    placeholder="Biarkan kosong untuk semua blok"
                    className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                    style={{ borderColor: "var(--color-input-border)" }}
                    onFocus={(e) => applyFocusRing(e.currentTarget)}
                    onBlur={(e) => clearFocusRing(e.currentTarget)}
                  />
                </div>

                {/* Error banner */}
                {downloadError && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-[13px] text-red-600">{downloadError}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    !isDownloading && setIsDownloadModalOpen(false)
                  }
                  disabled={isDownloading}
                  className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
                  style={{ background: "var(--color-surface-alt)" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  disabled={
                    isDownloading || !downloadStartDate || !downloadEndDate
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    background:
                      isDownloading || !downloadStartDate || !downloadEndDate
                        ? "var(--color-body-muted)"
                        : "var(--color-primary)",
                    boxShadow:
                      isDownloading || !downloadStartDate || !downloadEndDate
                        ? "none"
                        : "0 8px 22px -12px var(--color-primary-shadow)",
                  }}
                >
                  {isDownloading ? (
                    <>
                      <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      Menyiapkan...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Unduh Laporan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TRANSACTION FORM BOTTOM SHEET
      ══════════════════════════════════════════════════════════════════════ */}
      {isFormOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeForm}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed bottom-0 left-1/2 z-50 w-full -translate-x-1/2 rounded-t-[2rem] bg-app-surface shadow-[0_-20px_60px_rgba(0,40,5,0.18)]"
            style={{
              maxWidth: "var(--app-max-width)",
              animation: "sheetUp 0.3s cubic-bezier(0.34,1.4,0.64,1)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="kas-rt-form-title"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3">
              <div
                className="h-1 w-10 rounded-full"
                style={{ background: "var(--color-input-border)" }}
              />
            </div>

            <div className="px-5 pb-8 pt-3">
              {/* Sheet header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2
                    id="kas-rt-form-title"
                    className="text-lg font-extrabold text-app-title"
                  >
                    {editingTxId ? "Edit Transaksi" : "Catat Transaksi"}
                  </h2>
                  <p className="mt-0.5 text-xs text-app-body-muted">
                    Langkah {formStep} dari 3
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl transition hover:bg-app-surface-alt active:scale-90 disabled:opacity-40"
                  aria-label="Tutup form"
                >
                  <XMarkIcon className="h-5 w-5 text-app-body-muted" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="mb-5 flex gap-2">
                {([1, 2, 3] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => {
                      if (step === 3) reApplyTemplatesWithBlok();
                      setFormStep(step);
                    }}
                    className="h-1.5 flex-1 rounded-full transition-all"
                    style={stepButtonStyle(step)}
                    aria-label={`Langkah ${step}`}
                  />
                ))}
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* ── Step 1: Jenis + Kategori ──────────────────────────── */}
                {formStep === 1 && (
                  <div className="space-y-4">
                    {/* Type toggle */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Jenis Transaksi
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {(["income", "expense"] as TransactionType[]).map(
                          (value) => {
                            const active = form.type === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleTypeChange(value)}
                                className={`rounded-2xl border py-3 text-sm font-bold transition active:scale-95 ${
                                  active
                                    ? "text-white shadow-sm"
                                    : "bg-white text-app-body-muted"
                                }`}
                                style={
                                  active
                                    ? value === "income"
                                      ? {
                                          background:
                                            "rgba(13, 148, 136, 0.15)",
                                          borderColor:
                                            "rgba(13, 148, 136, 0.3)",
                                          color: "var(--color-primary)",
                                        }
                                      : {
                                          background: "rgba(220, 38, 38, 0.15)",
                                          borderColor: "rgba(220, 38, 38, 0.3)",
                                          color: "#dc2626",
                                        }
                                    : {
                                        borderColor:
                                          "var(--color-input-border)",
                                      }
                                }
                              >
                                {value === "income"
                                  ? "➕ Pemasukan"
                                  : "➖ Pengeluaran"}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Category selection */}
                    <div>
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Kategori{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </p>
                      {visibleCategories.length === 0 ? (
                        <div className="animate-pulse rounded-2xl bg-app-surface-alt p-8" />
                      ) : (
                        <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto">
                          {visibleCategories.map((cat) => {
                            const isSelected = form.categoryId === cat.id;
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => handleCategoryChange(cat.id)}
                                className={`rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition active:scale-[0.97] ${
                                  isSelected
                                    ? "text-white shadow-sm"
                                    : "bg-white text-app-body"
                                }`}
                                style={
                                  isSelected
                                    ? isIncomeForm
                                      ? {
                                          background:
                                            "var(--color-primary-light, rgba(13, 148, 136, 0.15))",
                                          borderColor:
                                            "var(--color-primary-light, rgba(13, 148, 136, 0.3))",
                                          color: "var(--color-primary)",
                                        }
                                      : {
                                          background: "rgba(220, 38, 38, 0.15)",
                                          borderColor: "rgba(220, 38, 38, 0.3)",
                                          color: "#dc2626",
                                        }
                                    : {
                                        borderColor:
                                          "var(--color-input-border)",
                                      }
                                }
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

                {/* ── Step 2: Jumlah, Tanggal, Blok ────────────────────── */}
                {formStep === 2 && (
                  <div className="space-y-4">
                    {/* Amount */}
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                        Jumlah{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <div
                        className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 transition-all"
                        style={{ borderColor: "var(--color-input-border)" }}
                      >
                        <span className="text-sm font-bold text-app-body-muted">
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
                          className="flex-1 bg-transparent text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 outline-none"
                          placeholder="0"
                          onFocus={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) applyFocusRing(parent as HTMLElement);
                          }}
                          onBlur={(e) => {
                            const parent = e.currentTarget.parentElement;
                            if (parent) clearFocusRing(parent as HTMLElement);
                          }}
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label
                        htmlFor="form-date"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Tanggal{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        id="form-date"
                        type="date"
                        value={form.date}
                        onChange={(e) =>
                          updateFormField("date", e.target.value)
                        }
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>

                    {/* Blok */}
                    <div>
                      <label
                        htmlFor="form-reference"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Blok{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        id="form-reference"
                        type="text"
                        value={form.reference}
                        onChange={(e) =>
                          updateFormField("reference", e.target.value)
                        }
                        placeholder="Contoh: N2"
                        maxLength={20}
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>
                  </div>
                )}

                {/* ── Step 3: Judul, Deskripsi, Lampiran ───────────────── */}
                {formStep === 3 && (
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label
                        htmlFor="form-title"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Judul Transaksi{" "}
                        <span className="font-normal normal-case text-red-500">
                          *
                        </span>
                      </label>
                      <input
                        id="form-title"
                        type="text"
                        value={form.title}
                        onChange={(e) =>
                          updateFormField("title", e.target.value)
                        }
                        placeholder="Contoh: IPL Bulan Juni"
                        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label
                        htmlFor="form-details"
                        className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-app-body-muted"
                      >
                        Deskripsi{" "}
                        <span className="font-normal normal-case text-app-body-muted/70">
                          (opsional)
                        </span>
                      </label>
                      <textarea
                        id="form-details"
                        value={form.details}
                        onChange={(e) =>
                          updateFormField("details", e.target.value)
                        }
                        rows={3}
                        placeholder="Catatan, rincian biaya, dll."
                        className="w-full resize-none rounded-2xl border bg-white px-4 py-3 text-sm font-semibold text-app-title placeholder:text-app-body-muted/50 focus:outline-none"
                        style={{ borderColor: "var(--color-input-border)" }}
                        onFocus={(e) => applyFocusRing(e.currentTarget)}
                        onBlur={(e) => clearFocusRing(e.currentTarget)}
                      />
                    </div>

                    {/* Attachments */}
                    {!editingTxId ? (
                      <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-app-body-muted">
                          Lampiran{" "}
                          <span className="font-normal normal-case text-app-body-muted/70">
                            (opsional)
                          </span>
                        </p>
                        <div
                          className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3"
                          style={{ borderColor: "var(--color-input-border)" }}
                        >
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
                            className="shrink-0 cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold text-white transition active:scale-90"
                            style={{ background: "var(--color-primary)" }}
                          >
                            Pilih File
                          </label>
                          <span className="flex-1 truncate text-xs text-app-body-muted">
                            {attachmentLabel}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs italic text-app-body-muted/70">
                        Lampiran tidak dapat diubah pada mode edit.
                      </p>
                    )}
                  </div>
                )}

                {/* Error banner */}
                {formError && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-[13px] text-red-600">{formError}</p>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      formStep > 1
                        ? setFormStep((s) => (s - 1) as 1 | 2 | 3)
                        : closeForm()
                    }
                    disabled={isSubmitting}
                    className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
                    style={{ background: "var(--color-surface-alt)" }}
                  >
                    {formStep > 1 ? "Kembali" : "Batal"}
                  </button>

                  {formStep < 3 ? (
                    <button
                      type="button"
                      disabled={nextButtonDisabled}
                      onClick={() => {
                        if (formStep === 2) {
                          reApplyTemplatesWithBlok();
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
                      className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(nextButtonDisabled)}
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
                      className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      style={actionButtonStyle(!isFormValid || isSubmitting)}
                    >
                      {isSubmitting ? (
                        <>
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        "Simpan"
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DUPLICATE WARNING DIALOG
      ══════════════════════════════════════════════════════════════════════ */}
      {duplicateWarning && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={() => setDuplicateWarning(null)}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-2.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
            style={{
              maxWidth: "360px",
              animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            role="alertdialog"
            aria-modal="true"
          >
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-amber-100">
              <ExclamationTriangleIcon className="h-7 w-7 text-amber-600" />
            </div>

            <h3 className="text-center text-base font-extrabold text-app-title">
              Transaksi Sudah Ada
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-app-body-muted">
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

            {/* Existing transactions list */}
            <div className="mt-3 max-h-36 overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50/60">
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
                      tx.type === "income" ? "text-app-primary" : "text-red-600"
                    }`}
                  >
                    {tx.type === "income" ? "+" : "-"}
                    {formatRupiah(tx.amount)}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95"
                style={{ background: "var(--color-surface-alt)" }}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={duplicateWarning.onConfirm}
                className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-95"
              >
                Tetap Lanjut
              </button>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION DIALOG
      ══════════════════════════════════════════════════════════════════════ */}
      {deletingTx && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleteConfirming && setDeletingTx(null)}
            aria-hidden
            style={{ animation: "fadeIn 0.2s ease" }}
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-app-surface p-6 shadow-[0_32px_64px_rgba(0,0,0,0.18)]"
            style={{
              maxWidth: "360px",
              animation: "dialogIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
            }}
            role="alertdialog"
            aria-modal="true"
          >
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-red-100">
              <TrashIcon className="h-7 w-7 text-red-600" />
            </div>

            <h3 className="text-center text-base font-extrabold text-app-title">
              Hapus Transaksi?
            </h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-app-body-muted">
              <span className="font-semibold text-app-body">
                &ldquo;{deletingTx.title}&rdquo;
              </span>{" "}
              akan dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>

            {/* Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => !isDeleteConfirming && setDeletingTx(null)}
                disabled={isDeleteConfirming}
                className="flex-1 rounded-2xl py-3 text-sm font-bold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
                style={{ background: "var(--color-surface-alt)" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteTx}
                disabled={isDeleteConfirming}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: "#dc2626" }}
              >
                {isDeleteConfirming ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Menghapus...
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
