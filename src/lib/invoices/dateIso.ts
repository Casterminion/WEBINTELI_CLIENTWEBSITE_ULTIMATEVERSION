/** Šiandienos data YYYY-MM-DD pagal Vilniaus laiko juostą (terminams / statusui). */
export function todayISOInVilnius(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Vilnius" });
}

/** Add calendar days to a YYYY-MM-DD string (local date). */
export function addDaysToISODate(isoYmd: string, days: number): string {
  const parts = isoYmd.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const [y, m, day] = parts;
  const dt = new Date(y, m - 1, day);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
