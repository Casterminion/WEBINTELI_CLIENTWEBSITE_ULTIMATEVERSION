export function formatSellerContactLine(email: string, phone: string): string {
  const e = email.trim();
  const p = phone.trim();
  if (e && p) return `${e} · ${p}`;
  return e || p;
}

export function splitCombinedSellerContactLine(line: string): { email: string; phone: string } {
  const t = line.trim();
  if (!t) return { email: "", phone: "" };
  const parts = t
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const emailIdx = parts.findIndex((p) => p.includes("@"));
    if (emailIdx >= 0) {
      const email = parts[emailIdx]!;
      const phone = parts.filter((_, i) => i !== emailIdx).join(" · ");
      return { email, phone };
    }
    return { email: parts[0]!, phone: parts.slice(1).join(" · ") };
  }
  const one = parts[0] ?? "";
  if (one.includes("@")) return { email: one, phone: "" };
  return { email: "", phone: one };
}
