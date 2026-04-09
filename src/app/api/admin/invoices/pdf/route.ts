import { NextRequest, NextResponse } from "next/server";
import { parseInvoicePayload } from "@/lib/invoices/parsePayload";
import { renderInvoicePdf } from "@/lib/invoices/renderInvoicePdf";
import { getSupabaseUserFromRequest } from "@/lib/invoices/supabaseUserFromRequest";

export const runtime = "nodejs";

/**
 * PDF peržiūra be DB įrašų (juodraščio peržiūra / atsisiuntimas prieš išrašant).
 */
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

  const parsed = parseInvoicePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const pdfBytes = await renderInvoicePdf(parsed.data);
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="preview.pdf"',
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") console.error(e);
    return NextResponse.json({ error: "pdf_render_error" }, { status: 500 });
  }
}
