# Webinteli invoice PDF worker

Small **Node + Express** service that renders invoice PDFs with **`@react-pdf/renderer`**.  
Designed to run on your **office PC** via **Coolify** (Docker), so Netlify does not do the heavy PDF render.

**Important:** The PDF layout is duplicated from [`../src/lib/invoices/`](../src/lib/invoices/). If you change labels or layout, update **both** places (or extract a shared package later).

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Health check (Coolify) |
| POST | `/render-pdf` | Body: same JSON as Next invoice API (`InvoicePayload`). Response: `application/pdf` bytes. |

**Auth:** header `Authorization: Bearer <WORKER_SECRET>`.  
If `WORKER_SECRET` is missing, every `/render-pdf` returns `401`.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WORKER_SECRET` | Yes | Long random string. Must match **`PDF_WORKER_SECRET`** in Netlify. |
| `PORT` | No | Default **3001**. |

## Run locally

```bash
cd backend
npm install
export WORKER_SECRET='dev-secret-change-me'
npm run dev
# or: npm run build && npm start
```

Test:

```bash
curl -sS http://127.0.0.1:3001/health
# Should print: ok
```

## Docker

Build context must be the **`backend/`** folder (not the monorepo root):

```bash
docker build -f backend/Dockerfile ./backend
docker run --rm -e WORKER_SECRET=test -p 3001:3001 invoice-pdf-worker
```

Netlify does not use this Dockerfile.

## Coolify (step-by-step)

1. Push this repo to GitHub (include **`backend/`** with `package-lock.json`).
2. **Base directory:** `backend` (or `/backend` if the UI adds a slash).
3. **Dockerfile location:** `Dockerfile` (file inside `backend/`; UI may show `/Dockerfile`).
4. This is equivalent to `docker build -f backend/Dockerfile ./backend`.
5. **Ports:** map container **3001** → what Coolify expects (often 3001).
6. **Environment variables:**
   - `WORKER_SECRET` = a long random string (save it in a password manager).
7. Deploy and wait until healthy (`/health`).
8. **Public URL for Netlify:** Netlify cannot reach a Tailscale-only IP. You need a URL that the **public internet** can call, for example:
   - **Cloudflare Tunnel** → your worker port, or  
   - Coolify **public domain** with HTTPS (if you expose this service).
9. Copy the **HTTPS base URL** (no trailing slash), e.g. `https://pdf-worker.example.com`.

## Netlify

In **Site settings → Environment variables**:

| Name | Value |
|------|--------|
| `PDF_WORKER_URL` | Same base URL as step 9 (e.g. `https://pdf-worker.example.com`) |
| `PDF_WORKER_SECRET` | **Exactly the same** string as `WORKER_SECRET` on the worker |

Redeploy the site after saving.

**Behaviour:**

- If **`PDF_WORKER_URL` and `PDF_WORKER_SECRET` are set**, Next.js [`/api/admin/invoices/pdf`](../../src/app/api/admin/invoices/pdf/route.ts) calls your worker for the PDF bytes, then uploads to Supabase as before.
- If they are **unset**, PDF is rendered **inside** the Next.js API route (local dev / fallback).

## Verify Netlify + tunnel (E2E)

1. **Tunnel → worker:** From the repo root, with your public base URL and the same secret as `WORKER_SECRET` on the worker:
   ```bash
   export PDF_WORKER_VERIFY_URL='https://your-tunnel.trycloudflare.com'
   export PDF_WORKER_VERIFY_SECRET='your-secret'
   npm run verify:pdf-worker-tunnel
   ```
   Expect `ok` from `/health` and `%PDF` magic bytes from `/render-pdf`.

2. **Netlify env:** Set `PDF_WORKER_URL` (no trailing slash) and `PDF_WORKER_SECRET` (must match Coolify `WORKER_SECRET`), then redeploy.

3. **Prove the worker path is used:** Temporarily set `PDF_WORKER_URL` to an invalid host, redeploy, trigger PDF from the admin UI → expect **502** and JSON `error: "worker_error"`. Restore the real URL and redeploy.

4. **Admin UI:** **Buhalterija → Saskaitos →** new invoice ([`/admin/buhalterija/saskaitos/nauja`](../../src/app/admin/buhalterija/saskaitos/nauja/page.tsx)) or edit existing ([`/admin/buhalterija/saskaitos/[id]/redaguoti`](../../src/app/admin/buhalterija/saskaitos/[id]/redaguoti/page.tsx)) → use the PDF generate action. Success: **200** on `POST /api/admin/invoices/pdf`, PDF download, optional `pdf_storage_path` on the row and download from the list page.

## Phase 2 (optional)

- Move ZIP export to this service to reduce Netlify work further.
- Replace shared secret with **Supabase JWT verification** on the worker and call the worker from the browser (CORS + no Netlify function) — more moving parts.
