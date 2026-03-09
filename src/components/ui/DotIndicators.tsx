"use client";

import { motion } from "framer-motion";

interface DotIndicatorsProps {
  total: number;
  current: number;
}

/**
 * Animated step/dot indicators. Active dot: wider, scaled, full opacity; inactive: narrow, muted.
 * Uses --color-indicator-active / --color-indicator-inactive.
 */
export function DotIndicators({ total, current }: DotIndicatorsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <motion.span
          key={i}
          className="block h-[6px] rounded-full bg-app-indicator-inactive"
          initial={false}
          animate={{
            width: i === current ? 24 : 8,
            scale: i === current ? 1.1 : 1,
            backgroundColor:
              i === current
                ? "var(--color-indicator-active)"
                : "var(--color-indicator-inactive)",
            opacity: i === current ? 1 : 0.6,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 35,
          }}
        />
      ))}
    </div>
  );
}
