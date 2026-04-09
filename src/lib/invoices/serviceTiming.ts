import type { InvoicePayload } from "./types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type ServiceTimingFields = Pick<
  InvoicePayload,
  "service_date" | "service_period_from" | "service_period_to"
>;

export type ParsedServiceTiming =
  | { ok: true; service_date: string; service_period_from: string; service_period_to: string }
  | { ok: false; error: string };

/** Which radio/toggle to show in the editor (no extra persisted field). */
export function inferServiceTimingUiMode(value: ServiceTimingFields): "single" | "period" {
  if (value.service_period_from.trim() || value.service_period_to.trim()) return "period";
  return "single";
}

function optIso(raw: string, field: string): { ok: true; v: string } | { ok: false; error: string } {
  if (!raw) return { ok: true, v: "" };
  if (!ISO_DATE.test(raw)) return { ok: false, error: `${field}_invalid` };
  return { ok: true, v: raw };
}

/** Validate mutual exclusion, completeness, and from ≤ to. */
export function parseServiceTimingFromBody(body: Record<string, unknown>): ParsedServiceTiming {
  const sdRaw = typeof body.service_date === "string" ? body.service_date.trim() : "";
  const pfRaw = typeof body.service_period_from === "string" ? body.service_period_from.trim() : "";
  const ptRaw = typeof body.service_period_to === "string" ? body.service_period_to.trim() : "";

  const sd = optIso(sdRaw, "service_date");
  if (!sd.ok) return sd;
  const pf = optIso(pfRaw, "service_period_from");
  if (!pf.ok) return pf;
  const pt = optIso(ptRaw, "service_period_to");
  if (!pt.ok) return pt;

  const hasSd = Boolean(sd.v);
  const hasPf = Boolean(pf.v);
  const hasPt = Boolean(pt.v);

  if (hasSd && (hasPf || hasPt)) {
    return { ok: false, error: "service_timing_conflict" };
  }
  if (hasPf !== hasPt) {
    return { ok: false, error: "service_period_incomplete" };
  }
  if (!hasSd && !hasPf) {
    return { ok: false, error: "service_timing_required" };
  }
  if (hasPf && hasPt && pf.v > pt.v) {
    return { ok: false, error: "service_period_order_invalid" };
  }
  if (hasPf && hasPt) {
    return { ok: true, service_date: "", service_period_from: pf.v, service_period_to: pt.v };
  }
  return { ok: true, service_date: sd.v, service_period_from: "", service_period_to: "" };
}

/** Client + server: same rules as `parseServiceTimingFromBody`. Returns error code or null. */
export function validateServiceTimingFields(fields: ServiceTimingFields): string | null {
  const r = parseServiceTimingFromBody({
    service_date: fields.service_date,
    service_period_from: fields.service_period_from,
    service_period_to: fields.service_period_to,
  } as Record<string, unknown>);
  return r.ok ? null : r.error;
}

/** PDF meta row: Lithuanian labels per spec. */
export function serviceTimingPdfMeta(
  data: ServiceTimingFields
): { label: string; value: string } {
  const from = data.service_period_from.trim();
  const to = data.service_period_to.trim();
  const sd = data.service_date.trim();
  if (from && to) {
    return { label: "PASLAUGOS LAIKOTARPIS", value: `${from} – ${to}` };
  }
  if (sd) {
    return { label: "PASLAUGOS DATA", value: sd };
  }
  return { label: "PASLAUGOS DATA", value: "—" };
}
