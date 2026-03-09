"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";

type TransactionType = "income" | "expense";
type CategoryType = "gaji" | "belanja" | "tagihan" | "tabungan" | "transfer" | "lainnya";

interface WalletTransaction {
  id: string;
  title: string;
  category: CategoryType;
  amount: number;
  type: TransactionType;
  date: string;
  note: string;
}

const CATEGORY_LABELS: Record<CategoryType, string> = {
  gaji: "Gaji & Pendapatan",
  belanja: "Belanja",
  tagihan: "Tagihan & Utilitas",
  tabungan: "Tabungan",
  transfer: "Transfer",
  lainnya: "Lainnya",
};

const TRANSACTIONS: WalletTransaction[] = [
  {
    id: "w-001",
    title: "Gaji Februari",
    category: "gaji",
    amount: 5500000,
    type: "income",
    date: "2026-02-01",
    note: "Gaji bulanan dari kantor.",
  },
  {
    id: "w-002",
    title: "Belanja Bulanan",
    category: "belanja",
    amount: 850000,
    type: "expense",
    date: "2026-02-05",
    note: "Belanja kebutuhan dapur dan rumah tangga di supermarket.",
  },
  {
    id: "w-003",
    title: "Tagihan Listrik",
    category: "tagihan",
    amount: 275000,
    type: "expense",
    date: "2026-02-10",
    note: "Pembayaran tagihan PLN via m-banking.",
  },
  {
    id: "w-004",
    title: "Iuran RT",
    category: "transfer",
    amount: 100000,
    type: "expense",
    date: "2026-02-08",
    note: "Pembayaran iuran RT 03 bulan Februari.",
  },
  {
    id: "w-005",
    title: "Tabungan Darurat",
    category: "tabungan",
    amount: 500000,
    type: "expense",
    date: "2026-02-15",
    note: "Setoran rutin ke rekening tabungan darurat.",
  },
  {
    id: "w-006",
    title: "Pendapatan Sampingan",
    category: "lainnya",
    amount: 300000,
    type: "income",
    date: "2026-02-20",
    note: "Hasil jualan tanaman hias ke tetangga.",
  },
  {
    id: "w-007",
    title: "Tagihan Internet",
    category: "tagihan",
    amount: 190000,
    type: "expense",
    date: "2026-02-12",
    note: "Pembayaran internet IndiHome bulanan.",
  },
  {
    id: "w-008",
    title: "Belanja Online",
    category: "belanja",
    amount: 215000,
    type: "expense",
    date: "2026-02-18",
    note: "Pembelian kebutuhan rumah via marketplace.",
  },
];

const CATEGORY_COLORS: Record<CategoryType, string> = {
  gaji: "bg-emerald-100 text-emerald-700",
  belanja: "bg-orange-100 text-orange-700",
  tagihan: "bg-red-100 text-red-600",
  tabungan: "bg-blue-100 text-blue-700",
  transfer: "bg-purple-100 text-purple-700",
  lainnya: "bg-slate-100 text-slate-600",
};

const CATEGORY_ICONS: Record<CategoryType, string> = {
  gaji: "💼",
  belanja: "🛒",
  tagihan: "📄",
  tabungan: "🏦",
  transfer: "↔️",
  lainnya: "📦",
};

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

export default function DompetPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, router]);

  const now = new Date();
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(toDateInputValue(now));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [refreshedAt, setRefreshedAt] = useState(now);

  const totals = useMemo(() => {
    const totalIncome = TRANSACTIONS.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
    const totalExpense = TRANSACTIONS.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);
    const balance = totalIncome - totalExpense;

    const thisMonthIndex = now.getMonth();
    const thisYear = now.getFullYear();

    const monthIncome = TRANSACTIONS.filter((tx) => {
      const d = new Date(tx.date);
      return tx.type === "income" && d.getMonth() === thisMonthIndex && d.getFullYear() === thisYear;
    }).reduce((s, tx) => s + tx.amount, 0);

    const monthExpense = TRANSACTIONS.filter((tx) => {
      const d = new Date(tx.date);
      return tx.type === "expense" && d.getMonth() === thisMonthIndex && d.getFullYear() === thisYear;
    }).reduce((s, tx) => s + tx.amount, 0);

    return { balance, totalIncome, totalExpense, monthIncome, monthExpense };
  }, [now]);

  const filteredTransactions = useMemo(() => {
    return TRANSACTIONS.filter((tx) => {
      if (typeFilter !== "all" && tx.type !== typeFilter) return false;
      if (startDate && tx.date < startDate) return false;
      if (endDate && tx.date > endDate) return false;
      return true;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [typeFilter, startDate, endDate]);

  if (!isAuthenticated) {
    return <PageLoader message="Memuat..." />;
  }

  const refreshData = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
      setRefreshedAt(new Date());
    }, 700);
  };

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    const target = event.currentTarget;
    if (target.scrollTop === 0) {
      setTouchStartY(event.touches[0]?.clientY ?? null);
    }
  };

  const onTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (touchStartY == null) return;
    const target = event.currentTarget;
    if (target.scrollTop > 0) {
      setTouchStartY(null);
      setPullDistance(0);
      return;
    }
    const currentY = event.touches[0]?.clientY ?? touchStartY;
    const distance = Math.max(0, currentY - touchStartY);
    setPullDistance(Math.min(88, distance * 0.45));
  };

  const onTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
    if (pullDistance >= 64 && !isRefreshing) {
      refreshData();
    } else {
      setPullDistance(0);
    }
    setTouchStartY(null);
  };

  const savingsRate = totals.monthIncome > 0
    ? Math.round(((totals.monthIncome - totals.monthExpense) / totals.monthIncome) * 100)
    : 0;

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
            ? "Menyegarkan data dompet..."
            : pullDistance > 48
            ? "Lepaskan untuk refresh"
            : "Tarik untuk refresh"}
        </div>

        {/* Balance Card */}
        <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-[0_20px_40px_-24px_rgba(79,70,229,0.65)]">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-indigo-100/90">
            Dompet Saya
          </p>
          <h1 className="mt-2 text-[1.85rem] font-bold leading-tight">
            {formatRupiah(totals.balance)}
          </h1>
          <p className="mt-1 text-sm text-indigo-100/90">
            Saldo tersedia · {now.toLocaleString("id-ID", { month: "long", year: "numeric" })}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
              <p className="text-xs font-medium text-indigo-100/80">Pemasukan</p>
              <p className="mt-1 text-base font-bold text-emerald-300">
                +{formatRupiah(totals.monthIncome)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2.5 backdrop-blur">
              <p className="text-xs font-medium text-indigo-100/80">Pengeluaran</p>
              <p className="mt-1 text-base font-bold text-red-300">
                -{formatRupiah(totals.monthExpense)}
              </p>
            </div>
          </div>

          {totals.monthIncome > 0 && (
            <div className="mt-3 rounded-2xl bg-white/95 px-4 py-3 text-indigo-950 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-app-body-muted">
                  Tingkat tabungan bulan ini
                </p>
                <p className={`text-sm font-bold ${savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 0 ? "text-amber-600" : "text-red-600"}`}>
                  {savingsRate}%
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${savingsRate >= 20 ? "bg-emerald-500" : savingsRate >= 0 ? "bg-amber-400" : "bg-red-500"}`}
                  style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-app-body-muted">
                Sisa setelah pengeluaran: {formatRupiah(totals.monthIncome - totals.monthExpense)}
              </p>
            </div>
          )}
        </section>

        {/* Filter */}
        <section className="mt-4 rounded-3xl border border-indigo-200/60 bg-indigo-50/70 p-4 shadow-[0_16px_34px_-26px_rgba(79,70,229,0.25)]">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className="flex flex-1 items-center justify-between rounded-2xl border border-transparent bg-white/70 px-3 py-2 text-left shadow-sm"
              aria-expanded={isFilterOpen}
              aria-controls="wallet-filter-panel"
            >
              <span className="text-base font-bold text-app-title">Filter Transaksi</span>
              <span className="text-sm font-semibold text-indigo-600">
                {isFilterOpen ? "Tutup" : "Buka"}
              </span>
            </button>
          </div>

          {isFilterOpen && (
            <div id="wallet-filter-panel" className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-indigo-100/80 bg-white/90 p-3">
              <label className="text-sm font-medium text-app-body">
                Jenis transaksi
                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "all" | TransactionType)}
                  className="mt-1 w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm text-app-body focus:border-indigo-400 focus:outline-none"
                >
                  <option value="all">Semua transaksi</option>
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-app-body">
                  Tanggal mulai
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm text-app-body focus:border-indigo-400 focus:outline-none"
                  />
                </label>
                <label className="text-sm font-medium text-app-body">
                  Tanggal akhir
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2 text-sm text-app-body focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-app-body-muted">
            Terakhir diperbarui:{" "}
            {refreshedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </section>

        {/* Transaction List */}
        <section className="mt-4 space-y-3" aria-label="Daftar transaksi pribadi">
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
                  className="rounded-2xl border border-indigo-100/60 bg-app-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${CATEGORY_COLORS[tx.category]}`}>
                        {CATEGORY_ICONS[tx.category]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold text-app-title">{tx.title}</h3>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[tx.category]}`}>
                          {CATEGORY_LABELS[tx.category]}
                        </span>
                      </div>
                    </div>
                    <p className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "-"}
                      {formatRupiah(tx.amount)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-body-muted">
                    <span>
                      {new Date(tx.date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {tx.note && (
                      <>
                        <span className="inline-block h-1 w-1 rounded-full bg-indigo-200" aria-hidden />
                        <span className="truncate">{tx.note}</span>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
