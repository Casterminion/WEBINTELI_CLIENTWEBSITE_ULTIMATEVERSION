"use client";

import { useId } from "react";

type DayBucket = { day: number; income: number; expense: number };

function smoothLinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Cumulative net (income − expense) — smooth area + line. Minimal / pro dashboard look.
 */
export function AdminFinanceMonthChart({
  days,
  ariaLabel,
  isEmpty,
  emptyLabel,
}: {
  days: DayBucket[];
  ariaLabel?: string;
  /** No income/expense this month — show calm empty state */
  isEmpty?: boolean;
  emptyLabel?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const areaGrad = `adminNetArea-${uid}`;
  const strokeGrad = `adminNetStroke-${uid}`;
  const strokeGrad1 = `adminNetStroke1-${uid}`;

  const W = 640;
  const H = 132;
  const padL = 10;
  const padR = 10;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (isEmpty || days.length === 0) {
    return (
      <div
        className="flex h-[132px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.15)",
          color: "var(--admin-text-muted)",
        }}
      >
        <svg width={120} height={36} viewBox="0 0 120 36" aria-hidden className="opacity-40">
          <path
            d="M4 28 L28 18 L52 22 L76 10 L100 14 L116 8"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <p className="text-center text-[11px] font-medium tracking-wide" style={{ opacity: 0.75 }}>
          {emptyLabel ?? "No activity"}
        </p>
      </div>
    );
  }

  let cum = 0;
  const nets = days.map((d) => {
    cum += d.income - d.expense;
    return cum;
  });

  const minN = Math.min(0, ...nets);
  const maxN = Math.max(0, ...nets);
  const span = Math.max(maxN - minN, 1);
  const padY = span * 0.08;
  const yMin = minN - padY;
  const yMax = maxN + padY;
  const ySpan = yMax - yMin;

  const yAt = (v: number) => padT + ((yMax - v) / ySpan) * innerH;
  const yZero = yAt(0);

  const n = days.length;
  const xAt = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);

  const pts = days.map((d, i) => ({
    x: xAt(i),
    y: yAt(nets[i]!),
  }));

  const gridYs = [0.25, 0.5, 0.75].map((t) => padT + t * innerH);

  if (n === 1) {
    const cx = xAt(0);
    const cy = yAt(nets[0]!);
    return (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-[132px] w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel || "Cumulative net this month"}
      >
        <defs>
          <linearGradient id={strokeGrad1} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" />
          </linearGradient>
        </defs>
        {gridYs.map((gy) => (
          <line
            key={gy}
            x1={padL}
            y1={gy}
            x2={W - padR}
            y2={gy}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <line
          x1={padL}
          y1={yZero}
          x2={W - padR}
          y2={yZero}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
          strokeDasharray="4 6"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={cx} cy={cy} r={5} fill={`url(#${strokeGrad1})`} opacity={0.95} />
      </svg>
    );
  }

  const linePath = smoothLinePath(pts);
  const x0 = pts[0]!.x;
  const xLast = pts[pts.length - 1]!.x;
  const areaPath = `${linePath} L ${xLast} ${yZero} L ${x0} ${yZero} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[132px] w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel || "Cumulative net this month"}
    >
      <defs>
        <linearGradient id={areaGrad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(56, 189, 248)" stopOpacity={0.22} />
          <stop offset="100%" stopColor="rgb(56, 189, 248)" stopOpacity={0} />
        </linearGradient>
        <linearGradient id={strokeGrad} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(34, 211, 238)" />
          <stop offset="100%" stopColor="rgb(59, 130, 246)" />
        </linearGradient>
      </defs>

      {gridYs.map((gy) => (
        <line
          key={gy}
          x1={padL}
          y1={gy}
          x2={W - padR}
          y2={gy}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <line
        x1={padL}
        y1={yZero}
        x2={W - padR}
        y2={yZero}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        strokeDasharray="4 6"
        vectorEffect="non-scaling-stroke"
      />

      <path d={areaPath} fill={`url(#${areaGrad})`} stroke="none" />

      <path
        d={linePath}
        fill="none"
        stroke={`url(#${strokeGrad})`}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

    </svg>
  );
}
