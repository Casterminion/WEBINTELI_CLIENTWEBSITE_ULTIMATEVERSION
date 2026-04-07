import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { getSupabaseUserFromRequest, safePdfFilename } from "@/lib/invoices/supabaseUserFromRequest";
import type { AdminInvoiceRow } from "@/lib/invoices/types";
import { computeInvoiceSubtotal } from "@/lib/invoices/types";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function POST(request: NextRequest) {
  const auth = await getSupabaseUserFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const dateFrom = typeof b.date_from === "string" ? b.date_from.trim() : "";
  const dateTo = typeof b.date_to === "string" ? b.date_to.trim() : "";
  if (!ISO_DATE.test(dateFrom) || !ISO_DATE.test(dateTo)) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }
  if (dateFrom > dateTo) {
    return NextResponse.json({ error: "date_range_invalid" }, { status: 400 });
  }

  const { user, supabase } = auth;

  const { data: rows, error: qErr } = await supabase
    .from("admin_invoices")
    .select("*")
    .eq("user_id", user.id)
    .gte("issue_date", dateFrom)
    .lte("issue_date", dateTo)
    .order("issue_date", { ascending: true });

  if (qErr) {
    if (process.env.NODE_ENV === "development") console.error(qErr);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const list = (rows ?? []) as AdminInvoiceRow[];

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve, reject) => {
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);
  });

  const csvLines = [
    ["invoice_number", "issue_date", "buyer_name", "total", "currency", "pdf_in_zip", "storage_path"].join(
      ","
    ),
  ];

  const usedNames = new Set<string>();

  for (const row of list) {
    const total = computeInvoiceSubtotal(row.line_items);
    let pdfInZip = "no";
    let fileBase = safePdfFilename(row.invoice_number).replace(/\.pdf$/i, "");
    let uniqueName = fileBase;
    let n = 1;
    while (usedNames.has(uniqueName + ".pdf")) {
      n += 1;
      uniqueName = `${fileBase}_${n}`;
    }
    usedNames.add(uniqueName + ".pdf");

    if (row.pdf_storage_path) {
      const { data: file, error: dlErr } = await supabase.storage
        .from("admin-invoices")
        .download(row.pdf_storage_path);
      if (!dlErr && file) {
        const buf = Buffer.from(await file.arrayBuffer());
        archive.append(buf, { name: `${uniqueName}.pdf` });
        pdfInZip = "yes";
      }
    }

    csvLines.push(
      [
        csvEscape(row.invoice_number),
        csvEscape(row.issue_date),
        csvEscape(row.buyer_name),
        csvEscape(String(total)),
        csvEscape(row.currency),
        csvEscape(pdfInZip),
        csvEscape(row.pdf_storage_path ?? ""),
      ].join(",")
    );
  }

  archive.append(csvLines.join("\n"), { name: "saskaitos-suvestine.csv" });
  void archive.finalize();
  const zipBuffer = await done;

  const zipName = `saskaitos-${dateFrom}_${dateTo}.zip`;
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zipName}"`,
    },
  });
}
