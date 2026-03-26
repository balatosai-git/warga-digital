"use client";

import Link from "next/link";
import {
  BanknotesIcon,
  BoltIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShoppingCartIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export const LANDING_FEATURES = [
  {
    id: "administrasi",
    label: "Administrasi",
    description: "Surat Keterangan, Surat Izin, dll.",
    href: "#administrasi",
    icon: DocumentTextIcon,
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    id: "kas-rt",
    label: "Kas RT",
    description: "Pemasukan, pengeluaran, saldo RT",
    href: "/kas-rt",
    icon: BanknotesIcon,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "ipl",
    label: "IPL",
    description: "Iuran bulanan perawatan",
    href: "#ipl",
    icon: BuildingOffice2Icon,
    color: "text-indigo-600 dark:text-indigo-400",
  },
  {
    id: "jual-beli",
    label: "Jual Beli",
    description: "Marketplace warga",
    href: "#jual-beli",
    icon: ShoppingCartIcon,
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    id: "jasa",
    label: "Jasa",
    description: "Layanan jasa warga",
    href: "#jasa",
    icon: BoltIcon,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  {
    id: "event",
    label: "Event",
    description: "Acara warga",
    href: "#event",
    icon: CalendarDaysIcon,
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    id: "organisasi",
    label: "Organisasi",
    description: "Struktur & kontak pengurus",
    href: "/organisasi",
    icon: UserGroupIcon,
    color: "text-sky-600 dark:text-sky-400",
  },
  {
    id: "informasi",
    label: "Informasi",
    description: "Pengumuman & info penting RT",
    href: "#informasi",
    icon: InformationCircleIcon,
    color: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "emergency",
    label: "Emergency",
    description: "Kontak darurat & bantuan cepat",
    href: "#emergency",
    icon: ExclamationTriangleIcon,
    color: "text-red-600 dark:text-red-400",
  },
] as const;

interface FeatureGridProps {
  title?: string;
}

export function FeatureGrid({ title = "Fitur" }: FeatureGridProps) {
  return (
    <section className="px-4 py-4" aria-labelledby="feature-grid-title">
      <h2
        id="feature-grid-title"
        className="mb-3 text-lg font-bold text-app-title"
      >
        {title}
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {LANDING_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isRoute = feature.href.startsWith("/");
          const Wrapper = isRoute ? Link : "a";
          const wrapperProps = isRoute
            ? { href: feature.href as string }
            : { href: feature.href };
          return (
            <Wrapper
              key={feature.id}
              {...wrapperProps}
              className="flex flex-col items-center gap-2 rounded-2xl bg-app-surface p-4 shadow-sm transition-shadow hover:shadow-md active:opacity-90"
            >
              <Icon className={`h-9 w-9 ${feature.color}`} aria-hidden />
              <span className={`text-center text-sm font-semibold ${feature.color}`}>
                {feature.label}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
