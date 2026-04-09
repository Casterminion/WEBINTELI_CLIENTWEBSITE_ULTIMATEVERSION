import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { persistInvoiceStatus } from "./invoicePersist";

describe("persistInvoiceStatus", () => {
  it("updates only status and updated_at (does not touch pdf_storage_path)", async () => {
    let paymentSum = 0;
    let updatePayload: Record<string, unknown> | null = null;

    const supabase = {
      from(table: string) {
        if (table === "admin_invoice_payments") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: paymentSum === 0 ? [] : [{ amount: paymentSum }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "admin_invoices") {
          return {
            update: (patch: Record<string, unknown>) => {
              updatePayload = patch;
              return {
                eq: () => ({
                  eq: () => Promise.resolve({ error: null }),
                }),
              };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as SupabaseClient;

    paymentSum = 0;
    await persistInvoiceStatus(supabase, "user-1", "inv-1", {
      cancelled_at: null,
      issued_at: "2026-01-01T00:00:00.000Z",
      due_date: "2026-02-01",
      total: 100,
    });

    expect(updatePayload).not.toBeNull();
    expect(Object.keys(updatePayload!)).toEqual(["status", "updated_at"]);
    expect(updatePayload).not.toHaveProperty("pdf_storage_path");
    expect(updatePayload).not.toHaveProperty("line_items");
  });
});
