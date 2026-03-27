"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TagIcon,
  DocumentTextIcon,
  Bars3BottomLeftIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import { PageLoader } from "@/components/ui";
import { useAuthStore } from "@/stores/auth-store";
import { hasAdminRoleInProfile } from "@/lib/roles";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  applies_to: "income" | "expense" | "both";
  title_template: string;
  desc_template: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface ProfileData {
  fullName?: string;
  roles?: Array<{ id: number; name: string; description: string | null }>;
  residences?: Array<{
    roles?: Array<{ id: number; name: string; description: string | null }>;
  }>;
}

interface ToastState {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

type AppliesToFilter = "all" | "income" | "expense" | "both";
type AppliesTo = "income" | "expense" | "both";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAppliesToLabel(v: AppliesTo): string {
  if (v === "income") return "Pemasukan";
  if (v === "expense") return "Pengeluaran";
  return "Keduanya";
}

function applyPreview(template: string): string {
  return template.replace(/\{bulan\}/g, "Juli").replace(/\{blok\}/g, "A1");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(toast.id), 3800);
    return () => window.clearTimeout(t);
  }, [toast.id, onDismiss]);

  const bg =
    toast.type === "success"
      ? "bg-emerald-600"
      : toast.type === "error"
        ? "bg-red-600"
        : "bg-amber-500";

  const Icon =
    toast.type === "success"
      ? CheckCircleIcon
      : toast.type === "error"
        ? ExclamationTriangleIcon
        : InformationCircleIcon;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 text-white shadow-lg ${bg}`}
      style={{
        animation: "toastIn 260ms cubic-bezier(0.22,1,0.36,1) forwards",
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 shrink-0 rounded-full p-0.5 opacity-70 hover:opacity-100"
        aria-label="Tutup notifikasi"
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function AppliesToBadge({ value }: { value: AppliesTo }) {
  const cfg = {
    income: {
      label: "Pemasukan",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    expense: {
      label: "Pengeluaran",
      cls: "bg-rose-100 text-rose-700 border-rose-200",
      dot: "bg-rose-500",
    },
    both: {
      label: "Keduanya",
      cls: "bg-sky-100 text-sky-700 border-sky-200",
      dot: "bg-sky-500",
    },
  }[value];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      {active ? "Aktif" : "Nonaktif"}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl bg-app-surface shadow-sm">
      <div className="flex gap-3 p-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-app-surface-alt" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-app-surface-alt" />
          <div className="h-3 w-full animate-pulse rounded-full bg-app-surface-alt" />
        </div>
      </div>
    </div>
  );
}

// ─── Form sheet ───────────────────────────────────────────────────────────────

interface FormSheetProps {
  editing: Category | null;
  onClose: () => void;
  onSaved: (cat: Category) => void;
  onToast: (msg: string, type: ToastState["type"]) => void;
}

function CategoryFormSheet({
  editing,
  onClose,
  onSaved,
  onToast,
}: FormSheetProps) {
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>(
    editing?.applies_to ?? "income",
  );
  const [titleTemplate, setTitleTemplate] = useState(
    editing?.title_template ?? "",
  );
  const [descTemplate, setDescTemplate] = useState(
    editing?.desc_template ?? "",
  );
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => nameRef.current?.focus(), 220);
    return () => window.clearTimeout(t);
  }, []);

  const titlePreview = useMemo(
    () => applyPreview(titleTemplate),
    [titleTemplate],
  );
  const descPreview = useMemo(() => applyPreview(descTemplate), [descTemplate]);

  const isValid = name.trim().length > 0 && name.trim().length <= 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: name.trim(),
      applies_to: appliesTo,
      title_template: titleTemplate.trim(),
      desc_template: descTemplate.trim(),
      is_active: isActive,
    };

    try {
      const res = await apiFetch(
        isEdit
          ? `/api/admin/kas-rt-categories/${editing!.id}`
          : "/api/admin/kas-rt-categories",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = (await res.json().catch(() => ({}))) as {
        category?: Category;
        error?: string;
      };

      if (!res.ok) {
        setFormError(body.error ?? "Terjadi kesalahan.");
        return;
      }

      if (body.category) {
        onSaved(body.category);
        onToast(
          isEdit
            ? "Kategori berhasil diperbarui."
            : "Kategori berhasil ditambahkan.",
          "success",
        );
        onClose();
      }
    } catch {
      setFormError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setSubmitting(false);
    }
  }

  const appliesToOptions: { value: AppliesTo; label: string; desc: string }[] =
    [
      {
        value: "income",
        label: "Pemasukan",
        desc: "Hanya untuk transaksi masuk",
      },
      {
        value: "expense",
        label: "Pengeluaran",
        desc: "Hanya untuk transaksi keluar",
      },
      { value: "both", label: "Keduanya", desc: "Muncul di semua jenis" },
    ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
        style={{ animation: "fadeIn 200ms ease forwards" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[430px] overflow-hidden rounded-t-3xl bg-app-surface shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.25)]"
        style={{
          animation: "slideUp 240ms cubic-bezier(0.22,1,0.36,1) forwards",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit kategori" : "Tambah kategori"}
      >
        {/* Drag indicator */}
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-app-body-muted/25" />
        </div>

        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 pb-3 pt-1"
            style={{ borderBottom: "1px solid var(--color-input-border)" }}
          >
            <div>
              <h2 className="text-base font-bold text-app-title">
                {isEdit ? "Edit Kategori" : "Tambah Kategori Baru"}
              </h2>
              <p className="mt-0.5 text-xs text-app-body-muted">
                {isEdit
                  ? "Ubah informasi kategori kas RT"
                  : "Kategori baru akan tersedia di form transaksi"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-full text-app-body-muted transition hover:bg-app-surface-alt disabled:opacity-50"
              aria-label="Tutup"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[72dvh] overflow-y-auto px-5 pb-6 pt-4 space-y-5">
            {/* Error banner */}
            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-xs font-medium text-red-700">{formError}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-app-body">
                Nama Kategori <span className="text-red-500">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="cth. IPL, Kebersihan, Denda…"
                className="w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3.5 py-2.5 text-sm text-app-body placeholder:text-app-body-muted/60 outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,white_84%)]"
              />
              <p className="mt-1 text-right text-[10px] text-app-body-muted">
                {name.trim().length}/100
              </p>
            </div>

            {/* Applies to */}
            <div>
              <p className="mb-2 text-xs font-semibold text-app-body">
                Berlaku untuk <span className="text-red-500">*</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {appliesToOptions.map((opt) => {
                  const selected = appliesTo === opt.value;
                  const accentMap = {
                    income: "emerald",
                    expense: "rose",
                    both: "sky",
                  }[opt.value];
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAppliesTo(opt.value)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-center transition ${
                        selected
                          ? `border-${accentMap}-400 bg-${accentMap}-50`
                          : "border-[var(--color-input-border)] bg-white hover:border-[var(--color-primary-muted)]"
                      }`}
                      style={
                        selected
                          ? {
                              borderColor: `var(--color-primary)`,
                              background: `color-mix(in srgb, var(--color-primary) 8%, white)`,
                            }
                          : {}
                      }
                    >
                      <span
                        className="text-[11px] font-bold"
                        style={
                          selected
                            ? { color: "var(--color-primary)" }
                            : { color: "var(--color-body)" }
                        }
                      >
                        {opt.label}
                      </span>
                      <span className="text-[9px] leading-tight text-app-body-muted">
                        {opt.desc}
                      </span>
                      {selected && (
                        <CheckCircleSolid
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--color-primary)" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title template */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-semibold text-app-body">
                  Template Judul
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="flex items-center gap-1 text-[10px] font-medium transition"
                  style={{ color: "var(--color-primary)" }}
                >
                  <EyeIcon className="h-3 w-3" />
                  {showPreview ? "Sembunyikan" : "Pratinjau"}
                </button>
              </div>
              <input
                type="text"
                value={titleTemplate}
                onChange={(e) => setTitleTemplate(e.target.value)}
                placeholder="cth. IPL Bulan {bulan}"
                className="w-full rounded-xl border border-[var(--color-input-border)] bg-white px-3.5 py-2.5 text-sm text-app-body placeholder:text-app-body-muted/60 outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,white_84%)]"
              />
              {showPreview && titleTemplate && (
                <div
                  className="mt-1.5 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 7%, white)",
                  }}
                >
                  <EyeIcon
                    className="mt-0.5 h-3 w-3 shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <span
                    className="font-medium"
                    style={{ color: "var(--color-title)" }}
                  >
                    {titlePreview}
                  </span>
                </div>
              )}
            </div>

            {/* Desc template */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-app-body">
                Template Deskripsi
              </label>
              <textarea
                value={descTemplate}
                onChange={(e) => setDescTemplate(e.target.value)}
                placeholder="cth. Pembayaran IPL untuk blok {blok} periode {bulan}"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--color-input-border)] bg-white px-3.5 py-2.5 text-sm text-app-body placeholder:text-app-body-muted/60 outline-none transition focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-primary)_16%,white_84%)]"
              />
              {showPreview && descTemplate && (
                <div
                  className="mt-1.5 flex items-start gap-1.5 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-primary) 7%, white)",
                  }}
                >
                  <EyeIcon
                    className="mt-0.5 h-3 w-3 shrink-0"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <span
                    className="leading-relaxed"
                    style={{ color: "var(--color-title)" }}
                  >
                    {descPreview}
                  </span>
                </div>
              )}
            </div>

            {/* Placeholder hint */}
            <div
              className="flex items-start gap-2 rounded-xl px-3.5 py-3"
              style={{
                background:
                  "color-mix(in srgb, var(--color-primary) 6%, white)",
                border:
                  "1px solid color-mix(in srgb, var(--color-primary) 18%, white)",
              }}
            >
              <InformationCircleIcon
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--color-primary)" }}
              />
              <div>
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--color-title)" }}
                >
                  Placeholder yang tersedia
                </p>
                <p className="mt-0.5 text-[11px] text-app-body-muted leading-relaxed">
                  <code className="rounded bg-white/80 px-1 font-mono">
                    {"{bulan}"}
                  </code>{" "}
                  — nama bulan dalam Bahasa Indonesia{" "}
                  <span className="text-[10px] opacity-70">(cth. Juli)</span>
                  <br />
                  <code className="rounded bg-white/80 px-1 font-mono">
                    {"{blok}"}
                  </code>{" "}
                  — blok/nomor rumah warga{" "}
                  <span className="text-[10px] opacity-70">(cth. A1)</span>
                </p>
              </div>
            </div>

            {/* Active toggle */}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-app-body">
                Status
              </p>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border px-3.5 py-3 transition"
                style={
                  isActive
                    ? {
                        borderColor: "var(--color-primary)",
                        background:
                          "color-mix(in srgb, var(--color-primary) 6%, white)",
                      }
                    : {
                        borderColor: "var(--color-input-border)",
                        background: "white",
                      }
                }
              >
                <span
                  className="text-sm font-medium"
                  style={
                    isActive
                      ? { color: "var(--color-primary)" }
                      : { color: "var(--color-body-muted)" }
                  }
                >
                  {isActive ? "Kategori aktif" : "Kategori nonaktif"}
                </span>
                <span
                  className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${isActive ? "" : "bg-gray-200"}`}
                  style={isActive ? { background: "var(--color-primary)" } : {}}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                      isActive ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between gap-3 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-3"
            style={{ borderTop: "1px solid var(--color-input-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-2xl px-5 py-2.5 text-sm font-semibold text-app-body-muted transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isValid || submitting}
              className="flex min-w-[120px] items-center justify-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "var(--color-primary)" }}
            >
              {submitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : isEdit ? (
                "Simpan Perubahan"
              ) : (
                "Tambah Kategori"
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

interface DeleteModalProps {
  category: Category;
  confirming: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({
  category,
  confirming,
  error,
  onCancel,
  onConfirm,
}: DeleteModalProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
        style={{ animation: "fadeIn 180ms ease forwards" }}
        onClick={onCancel}
      />
      <div
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-[360px] -translate-y-1/2 overflow-hidden rounded-3xl bg-app-surface shadow-2xl"
        style={{
          animation: "fadeInScale 220ms cubic-bezier(0.22,1,0.36,1) forwards",
        }}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex flex-col items-center px-6 pb-6 pt-7 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
            <TrashIcon className="h-7 w-7 text-red-500" />
          </div>
          <h3 className="text-base font-bold text-app-title">
            Hapus Kategori?
          </h3>
          <p className="mt-2 text-sm text-app-body-muted leading-relaxed">
            Kategori{" "}
            <span className="font-semibold text-app-body">
              &ldquo;{category.name}&rdquo;
            </span>{" "}
            akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </p>

          {error && (
            <div className="mt-3 w-full rounded-xl bg-red-50 px-3.5 py-2.5">
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div
          className="flex gap-3 px-5 pb-5"
          style={{ borderTop: "1px solid var(--color-input-border)" }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 rounded-2xl border border-[var(--color-input-border)] py-2.5 text-sm font-semibold text-app-body transition hover:bg-app-surface-alt active:scale-95 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirming ? (
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
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}

function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const leftBar = {
    income: "bg-emerald-500",
    expense: "bg-rose-500",
    both: "bg-sky-500",
  }[category.applies_to];

  return (
    <div className="group relative flex overflow-hidden rounded-2xl bg-app-surface shadow-sm transition hover:shadow-md">
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${leftBar}`} />

      <div className="flex flex-1 flex-col gap-2 px-3.5 py-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <AppliesToBadge value={category.applies_to} />
            <ActivePill active={category.is_active} />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-app-surface-alt hover:text-app-title active:scale-90"
              aria-label={`Edit kategori ${category.name}`}
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-app-body-muted transition hover:bg-red-50 hover:text-red-600 active:scale-90"
              aria-label={`Hapus kategori ${category.name}`}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Name */}
        <p className="text-sm font-bold leading-tight text-app-title">
          {category.name}
        </p>

        {/* Templates */}
        {category.title_template && (
          <div className="flex items-start gap-1.5">
            <DocumentTextIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-body-muted/60" />
            <p className="text-xs text-app-body-muted line-clamp-1">
              {category.title_template}
            </p>
          </div>
        )}
        {category.desc_template && (
          <div className="flex items-start gap-1.5">
            <Bars3BottomLeftIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-app-body-muted/60" />
            <p className="text-xs text-app-body-muted/80 line-clamp-2 leading-relaxed">
              {category.desc_template}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KasRtCategoriesPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearUser = useAuthStore((s) => s.clearUser);

  const [hasMounted, setHasMounted] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter / search
  const [filterAppliesTo, setFilterAppliesTo] =
    useState<AppliesToFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // CRUD
  const [showFormSheet, setShowFormSheet] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const toastCounterRef = useRef(0);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      toastCounterRef.current += 1;
      const id = toastCounterRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Mount ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // ── Access guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasMounted) return;
    if (!isAuthenticated) {
      router.replace("/auth/login?redirect=/admin/kas-rt-categories");
      return;
    }

    let cancelled = false;
    (async () => {
      setCheckingAccess(true);
      try {
        const res = await apiFetch("/api/profile");
        if (!res.ok) {
          if (res.status === 401) {
            clearUser();
            router.replace("/auth/login?redirect=/admin/kas-rt-categories");
            return;
          }
          router.replace("/landing");
          return;
        }
        const data = (await res.json()) as ProfileData;
        if (!hasAdminRoleInProfile(data)) {
          router.replace("/landing");
          return;
        }
      } catch {
        router.replace("/landing");
      } finally {
        if (!cancelled) setCheckingAccess(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasMounted, isAuthenticated, router, clearUser]);

  // ── Load categories ───────────────────────────────────────────────────────────
  const loadCategories = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const res = await apiFetch("/api/admin/kas-rt-categories");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setLoadError(body.error ?? "Gagal memuat kategori.");
        return;
      }
      const data = (await res.json()) as { categories: Category[] };
      setCategories(data.categories);
    } catch {
      setLoadError("Gagal terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!checkingAccess) void loadCategories();
  }, [checkingAccess, loadCategories]);

  // ── Derived data ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const income = categories.filter((c) => c.applies_to === "income").length;
    const expense = categories.filter((c) => c.applies_to === "expense").length;
    const both = categories.filter((c) => c.applies_to === "both").length;
    const active = categories.filter((c) => c.is_active).length;
    return { income, expense, both, active, total: categories.length };
  }, [categories]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => {
      const matchType =
        filterAppliesTo === "all" || c.applies_to === filterAppliesTo;
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.title_template.toLowerCase().includes(q) ||
        c.desc_template.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [categories, filterAppliesTo, searchQuery]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleSaved = useCallback((cat: Category) => {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cat;
        return next;
      }
      return [cat, ...prev];
    });
  }, []);

  const openEdit = useCallback((cat: Category) => {
    setEditingCategory(cat);
    setShowFormSheet(true);
  }, []);

  const openAdd = useCallback(() => {
    setEditingCategory(null);
    setShowFormSheet(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowFormSheet(false);
    setEditingCategory(null);
  }, []);

  const openDeleteConfirm = useCallback((cat: Category) => {
    setDeletingCategory(cat);
    setDeleteError(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingCategory) return;
    setDeleteConfirming(true);
    setDeleteError(null);

    try {
      const res = await apiFetch(
        `/api/admin/kas-rt-categories/${deletingCategory.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setDeleteError(body.error ?? "Gagal menghapus kategori.");
        return;
      }

      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      showToast(
        `Kategori "${deletingCategory.name}" berhasil dihapus.`,
        "success",
      );
      setDeletingCategory(null);
    } catch {
      setDeleteError("Gagal terhubung ke server.");
    } finally {
      setDeleteConfirming(false);
    }
  }, [deletingCategory, showToast]);

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (!hasMounted || !isAuthenticated || checkingAccess) {
    return <PageLoader message="Memuat halaman kategori…" />;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const filterPills: { key: AppliesToFilter; label: string; count: number }[] =
    [
      { key: "all", label: "Semua", count: stats.total },
      { key: "income", label: "Pemasukan", count: stats.income },
      { key: "expense", label: "Pengeluaran", count: stats.expense },
      { key: "both", label: "Keduanya", count: stats.both },
    ];

  return (
    <main className="flex h-full min-h-0 flex-col bg-app-surface-alt">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section
        className="relative shrink-0 overflow-hidden px-4 pb-5 pt-4 text-white"
        style={{
          background: `linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)`,
        }}
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90"
              aria-label="Kembali ke admin"
            >
              <ChevronLeftIcon className="h-5 w-5 text-white" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70">
                Kas RT · Admin
              </p>
              <h1 className="truncate text-lg font-extrabold leading-tight text-white">
                Kategori Transaksi
              </h1>
            </div>
            <button
              type="button"
              onClick={() => loadCategories(true)}
              disabled={refreshing || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition hover:bg-white/30 active:scale-90 disabled:opacity-50"
              aria-label="Segarkan"
            >
              <ArrowPathIcon
                className={`h-4 w-4 text-white ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          {/* Stats strip */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Total", value: stats.total },
              { label: "Pemasukan", value: stats.income },
              { label: "Pengeluaran", value: stats.expense },
              { label: "Aktif", value: stats.active },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl bg-white/15 px-2 py-2 text-center backdrop-blur-sm"
              >
                <p className="text-[10px] text-white/70 font-medium leading-tight">
                  {s.label}
                </p>
                {loading && !refreshing ? (
                  <div className="mx-auto mt-1 h-4 w-8 animate-pulse rounded bg-white/20" />
                ) : (
                  <p className="text-base font-extrabold text-white leading-tight">
                    {s.value}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search + Filter (sticky) ────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 bg-app-surface-alt px-4 pb-3 pt-3 space-y-2.5 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.08)]">
        {/* Error banner */}
        {loadError && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{loadError}</p>
            <button
              type="button"
              onClick={() => void loadCategories(true)}
              className="shrink-0 text-xs font-semibold text-red-600 underline underline-offset-2"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Search bar */}
        <div
          className="flex items-center gap-2.5 rounded-2xl border bg-app-surface px-3.5 py-2.5 shadow-sm"
          style={{ borderColor: "var(--color-input-border)" }}
        >
          <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-app-body-muted/60" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kategori, template…"
            className="flex-1 bg-transparent text-sm text-app-body placeholder:text-app-body-muted/50 outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-app-body-muted/60 hover:text-app-body-muted"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {filterPills.map((pill) => {
            const active = filterAppliesTo === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => setFilterAppliesTo(pill.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-95 ${
                  active
                    ? "text-white shadow-sm"
                    : "bg-app-surface text-app-body-muted"
                }`}
                style={
                  active
                    ? { background: "var(--color-primary)" }
                    : { border: "1px solid var(--color-input-border)" }
                }
              >
                {pill.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-app-surface-alt text-app-body-muted"
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Scrollable list ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3">
        {/* ── Category list ─────────────────────────────────────────────────── */}
        {loading && !refreshing ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--color-input-border)] bg-app-surface py-12 text-center">
            <TagIcon className="h-10 w-10 text-app-body-muted/40" />
            <div>
              <p className="text-sm font-semibold text-app-body-muted">
                {searchQuery || filterAppliesTo !== "all"
                  ? "Tidak ada kategori yang sesuai"
                  : "Belum ada kategori"}
              </p>
              <p className="mt-1 text-xs text-app-body-muted/70">
                {searchQuery || filterAppliesTo !== "all"
                  ? "Coba ubah filter atau kata kunci pencarian"
                  : "Tekan tombol + untuk menambahkan kategori pertama"}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Group by applies_to when showing all */}
            {filterAppliesTo !== "all" ? (
              filtered.map((cat) => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => openDeleteConfirm(cat)}
                />
              ))
            ) : (
              <>
                {(["income", "expense", "both"] as AppliesTo[]).map((type) => {
                  const group = filtered.filter((c) => c.applies_to === type);
                  if (group.length === 0) return null;
                  const headerCfg = {
                    income: {
                      label: "Pemasukan",
                      cls: "text-emerald-700",
                      bar: "bg-emerald-500",
                    },
                    expense: {
                      label: "Pengeluaran",
                      cls: "text-rose-700",
                      bar: "bg-rose-500",
                    },
                    both: {
                      label: "Keduanya",
                      cls: "text-sky-700",
                      bar: "bg-sky-500",
                    },
                  }[type];
                  return (
                    <div key={type}>
                      <div className="mb-2 flex items-center gap-2">
                        <div
                          className={`h-3 w-1 rounded-full ${headerCfg.bar}`}
                        />
                        <p
                          className={`text-xs font-bold uppercase tracking-wider ${headerCfg.cls}`}
                        >
                          {headerCfg.label}
                          <span className="ml-1.5 font-normal text-app-body-muted">
                            ({group.length})
                          </span>
                        </p>
                      </div>
                      <div className="space-y-2.5">
                        {group.map((cat) => (
                          <CategoryCard
                            key={cat.id}
                            category={cat}
                            onEdit={() => openEdit(cat)}
                            onDelete={() => openDeleteConfirm(cat)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-[4.75rem] right-4 z-30">
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
          style={{
            background: "var(--color-primary)",
            boxShadow: "0 8px 24px -6px var(--color-primary-shadow)",
          }}
          aria-label="Tambah kategori baru"
        >
          <PlusIcon className="h-5 w-5" />
          Tambah
        </button>
      </div>

      {/* ── Form sheet ──────────────────────────────────────────────────────── */}
      {showFormSheet && (
        <CategoryFormSheet
          editing={editingCategory}
          onClose={closeForm}
          onSaved={handleSaved}
          onToast={showToast}
        />
      )}

      {/* ── Delete confirm modal ─────────────────────────────────────────────── */}
      {deletingCategory && (
        <DeleteConfirmModal
          category={deletingCategory}
          confirming={deleteConfirming}
          error={deleteError}
          onCancel={() => {
            if (!deleteConfirming) setDeletingCategory(null);
          }}
          onConfirm={handleDelete}
        />
      )}

      {/* ── Toasts ──────────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none fixed bottom-24 inset-x-4 z-[60] mx-auto flex max-w-[400px] flex-col gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast toast={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </main>
  );
}
