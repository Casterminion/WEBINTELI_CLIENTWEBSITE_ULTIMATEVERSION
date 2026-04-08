#!/usr/bin/env bash
# Repeatable checks from the PDF worker E2E plan (Quick Tunnel or any public base URL).
# Usage:
#   export PDF_WORKER_VERIFY_URL='https://your-tunnel.trycloudflare.com'
#   export PDF_WORKER_VERIFY_SECRET='your-worker-secret'
#   ./scripts/verify-pdf-worker-tunnel.sh

set -euo pipefail

BASE="${PDF_WORKER_VERIFY_URL:-}"
SECRET="${PDF_WORKER_VERIFY_SECRET:-}"

if [[ -z "$BASE" || -z "$SECRET" ]]; then
  echo "Set PDF_WORKER_VERIFY_URL and PDF_WORKER_VERIFY_SECRET" >&2
  exit 1
fi

BASE="${BASE%/}"

echo "== GET $BASE/health =="
curl -sS -f "$BASE/health"
echo ""
echo ""

OUT="$(mktemp "${TMPDIR:-/tmp}/worker-pdf.XXXXXX")"
trap 'rm -f "$OUT"' EXIT

echo "== POST $BASE/render-pdf =="
curl -sS -f -D - -o "$OUT" \
  -X POST "$BASE/render-pdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET" \
  --data '{
    "invoice_number": "E2E-1",
    "issue_date": "2026-04-01",
    "due_date": "2026-04-30",
    "document_title": "End-to-end test",
    "invoice_type": "SF",
    "seller_name": "Seller UAB",
    "seller_code": "123456789",
    "seller_address": "Test g. 1, Vilnius",
    "seller_contact_line": "seller@example.com",
    "seller_bank_account": "LT00 0000 0000 0000 0000",
    "buyer_name": "Buyer UAB",
    "line_items": [
      { "description": "Paslauga", "quantity": 1, "unit_price": 100 }
    ]
  }' | head -20

echo ""
head -c 4 "$OUT" | xxd
echo ""
echo "OK: health + PDF bytes"
