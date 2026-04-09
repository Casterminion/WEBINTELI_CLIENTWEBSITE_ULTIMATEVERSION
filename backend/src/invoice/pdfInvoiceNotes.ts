function normLine(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function pdfNotesWithoutTaxSummaryDuplicates(notes: string, vatSummaryLine: string): string {
  const n = notes.replace(/\r\n/g, "\n");
  const v = vatSummaryLine.replace(/\r\n/g, "\n").trim();
  if (!n.trim()) return "";
  if (!v) return n.trim();

  const taxKeys = new Set(
    v
      .split(/\n+/)
      .map((line) => normLine(line))
      .filter(Boolean)
  );

  const kept = n.split("\n").filter((line) => {
    const key = normLine(line);
    if (!key) return true;
    return !taxKeys.has(key);
  });

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
