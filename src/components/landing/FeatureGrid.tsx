"use client";

import Link from "next/link";

export const LANDING_FEATURES = [
  {
    id: "administrasi",
    label: "Administrasi",
    description: "Surat Keterangan, Surat Izin, dll.",
    href: "#administrasi",
    icon: "📄",
  },
  {
    id: "kas-rt",
    label: "Kas RT",
    description: "Pemasukan, pengeluaran, saldo RT",
    href: "/kas-rt",
    icon: "💰",
  },
  {
    id: "ipl",
    label: "IPL",
    description: "Iuran bulanan perawatan",
    href: "#ipl",
    icon: "🏠",
  },
  {
    id: "jual-beli",
    label: "Jual Beli",
    description: "Marketplace warga",
    href: "#jual-beli",
    icon: "🛒",
  },
  {
    id: "jasa",
    label: "Jasa",
    description: "Layanan jasa warga",
    href: "#jasa",
    icon: "🔧",
  },
  {
    id: "event",
    label: "Event",
    description: "Acara warga",
    href: "#event",
    icon: "📅",
  },
  {
    id: "organisasi",
    label: "Organisasi",
    description: "Struktur & kontak pengurus",
    href: "/organisasi",
    icon: "👥",
  },
  {
    id: "informasi",
    label: "Informasi",
    description: "Pengumuman & info penting RT",
    href: "#informasi",
    icon: "ℹ️",
  },
  {
    id: "emergency",
    label: "Emergency",
    description: "Kontak darurat & bantuan cepat",
    href: "#emergency",
    icon: "🚨",
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
              <span className="text-4xl" aria-hidden>
                {feature.icon}
              </span>
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
