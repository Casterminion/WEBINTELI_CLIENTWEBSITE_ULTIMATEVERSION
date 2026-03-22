"use client";

import type { ReactNode } from "react";

export function AdminKpiCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent,
  large,
  compact,
}: {
  label: string;
  value: ReactNode;
  sublabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
  large?: boolean;
  /** Tighter padding and typography for dense dashboards */
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border",
        compact ? "rounded-xl px-2.5 py-2 md:px-3 md:py-2.5" : "px-4 py-4 md:px-5 md:py-5",
        large ? "md:min-h-[140px]" : "",
      ].join(" ")}
      style={{
        borderColor: "var(--admin-border)",
        background: "var(--admin-bg-elevated)",
        boxShadow: "var(--admin-shadow, 0 1px 3px rgba(0,0,0,0.08))",
      }}
    >
      {accent && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
          style={{ background: accent }}
          aria-hidden
        />
      )}
      <div className={["flex items-start justify-between", compact ? "gap-2 pl-0.5" : "gap-3 pl-1"].join(" ")}>
        <div className="min-w-0 flex-1">
          <p
            className={[
              "font-semibold uppercase tracking-[0.12em]",
              compact ? "text-[9px] leading-tight line-clamp-2" : "text-[10px]",
            ].join(" ")}
            style={{ color: "var(--admin-text-muted)" }}
          >
            {label}
          </p>
          <div
            className={[
              "tabular-nums font-bold tracking-tight",
              large && !compact
                ? "mt-1.5 text-3xl sm:text-4xl"
                : compact
                  ? "mt-0.5 text-lg sm:text-xl"
                  : "mt-1.5 text-2xl sm:text-3xl",
            ].join(" ")}
            style={{ color: "var(--admin-text)" }}
          >
            {value}
          </div>
          {sublabel && (
            <p
              className={compact ? "text-[10px] mt-0.5" : "text-[11px] mt-1.5"}
              style={{ color: "var(--admin-text-muted)" }}
            >
              {sublabel}
            </p>
          )}
        </div>
        <div
          className={[
            "flex shrink-0 items-center justify-center rounded-xl",
            compact ? "h-8 w-8 rounded-lg" : "h-11 w-11",
          ].join(" ")}
          style={{
            background: "var(--admin-accent-dim)",
            color: "var(--admin-accent)",
          }}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-5 w-5"} />
        </div>
      </div>
    </div>
  );
}
