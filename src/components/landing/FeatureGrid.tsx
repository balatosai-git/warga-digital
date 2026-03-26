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
  },
  {
    id: "kas-rt",
    label: "Kas RT",
    description: "Pemasukan, pengeluaran, saldo RT",
    href: "/kas-rt",
    icon: BanknotesIcon,
  },
  {
    id: "ipl",
    label: "IPL",
    description: "Iuran bulanan perawatan",
    href: "#ipl",
    icon: BuildingOffice2Icon,
  },
  {
    id: "jual-beli",
    label: "Jual Beli",
    description: "Marketplace warga",
    href: "#jual-beli",
    icon: ShoppingCartIcon,
  },
  {
    id: "jasa",
    label: "Jasa",
    description: "Layanan jasa warga",
    href: "#jasa",
    icon: BoltIcon,
  },
  {
    id: "event",
    label: "Event",
    description: "Acara warga",
    href: "#event",
    icon: CalendarDaysIcon,
  },
  {
    id: "organisasi",
    label: "Organisasi",
    description: "Struktur & kontak pengurus",
    href: "/organisasi",
    icon: UserGroupIcon,
  },
  {
    id: "informasi",
    label: "Informasi",
    description: "Pengumuman & info penting RT",
    href: "#informasi",
    icon: InformationCircleIcon,
  },
  {
    id: "emergency",
    label: "Emergency",
    description: "Kontak darurat & bantuan cepat",
    href: "#emergency",
    icon: ExclamationTriangleIcon,
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
              <Icon className="h-9 w-9 text-app-primary" aria-hidden />
              <span className="text-center text-sm font-semibold text-app-title">
                {feature.label}
              </span>
            </Wrapper>
          );
        })}
      </div>
    </section>
  );
}
