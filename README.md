# Taqvion — Masjid Funding, Donation & Financial Management

**Made with Taqvion.** A multi-masjid platform: every masjid gets a unique Masjid Code and QR, tracks funding
projects (required / received / remaining / progress, calculated automatically), records donations, issues
numbered digital receipts, and keeps a tamper-evident audit log. UI in English, ગુજરાતી, हिन्दी and اردو (true RTL).

Stack: Node 20+/Express 5, PostgreSQL (Supabase-compatible), vanilla-JS SPA (no build step), Server-Sent
Events fed by Postgres `LISTEN/NOTIFY` for realtime.

## Quick start

```bash
npm install
cp .env.example .env            # set DATABASE_URL, APP_SECRET, BASE_URL
npm start                       # applies db/migrations automatically, then serves on :3000
SUPER_ADMIN_EMAIL=you@example.org SUPER_ADMIN_PASSWORD='Long-pass-123' npm run create-super-admin
npm test                        # needs a scratch DB: see .env.test (it DROPS the public schema there)
```

Supabase: create a project, paste its Postgres connection string into `DATABASE_URL`, set `DATABASE_SSL=true`.
The migration enables RLS on every table and revokes `anon`/`authenticated`; the app connects with the
server-side database role only, so the Supabase public API cannot read any data.

## How "no fake confirmations" is enforced

A donation is **pending** until real evidence exists. Only `verifyDonation()` (src/services/donations.js) can
verify one, and PostgreSQL itself rejects a `verified` row without matching evidence (`donations_verified_evidence`):

| Method | Verified only by |
|---|---|
| Online (Razorpay) | HMAC-signed Checkout callback **and** a server-to-server fetch showing `captured` for the same order & exact amount; or a signed webhook; or treasurer "re-check with gateway" |
| UPI / bank / cheque | A treasurer/admin confirming the credit, or **bank-statement match** (exact UTR + amount) |
| Cash | The authorised masjid member who received it (optionally needs treasurer approval) |

A donor typing a UTR never counts anything. Duplicate UTR / gateway payment ids are blocked by unique indexes.
Amounts, methods and receipt numbers are immutable (trigger); donations can only be voided with a reason, never deleted.

## Roles
`admin` (everything) · `treasurer` (verify, expenses, reports) · `collector` (enter donations, sees only own) ·
`viewer` (read-only, donor contacts masked). Platform **super admin** sees per-location/masjid aggregates only,
never donor-level data. Every request is scoped to the caller's masjid membership server-side.

## Razorpay setup (per masjid, Settings → Payments)
1. Enter Key ID + Key Secret (validated against Razorpay, stored AES-256-GCM encrypted, never returned).
2. In Razorpay Dashboard → Webhooks add `BASE_URL/api/webhooks/razorpay/<MASJID_CODE>` with the same secret,
   events `payment.captured` and `order.paid`.
UPI works without Razorpay: donors pay the masjid's own VPA via QR/deep-link, then the treasurer verifies.

## Notes
- Money is stored as integer paise. Receipt numbers: `TQ-XXXXXX/<year>/<6-digit seq>`, gap-free per masjid per year.
- Audit log is append-only (DB triggers) and hash-chained; "Verify log integrity" re-walks the chain.
- CSV exports are UTF-8 with BOM (Gujarati/Hindi/Urdu open correctly in Excel) and neutralise formula injection.
- Behind a proxy set `TRUST_PROXY=1`. Serve over HTTPS in production (cookies are `Secure`).
- WhatsApp sharing uses `wa.me` click-to-chat links (no WhatsApp Business API needed).
- Fonts load from Google Fonts; self-host them if you need fully offline use.

## Single-file HTML build
`npm run build:html` writes `dist/taqvion.html` — the entire interface (CSS, JS, English/Gujarati/Hindi/Urdu) in one
file. If it exists, the server serves it as the app shell automatically (its inline script is allowed by CSP via
SHA-256 hash only). It calls the same-origin `/api`, so the backend and PostgreSQL remain the source of truth.
Re-run the build after changing anything under `public/`.


## Using `taqvion.html` standalone (preview pane, file://, other hosts)

`dist/taqvion.html` works in two modes:

* **Served by the Taqvion server** (`http://your-server/`): clean URLs, cookie sessions.
* **Opened anywhere else** (double-click, a preview pane, a static host): it shows a *Connect to your server* screen. Enter your server URL; the page then talks to it with bearer tokens and hash URLs (`#/app/...`).
  The server must allow the page: set `CORS_ORIGINS=*` (or a comma-separated list of origins) in `.env`.

Rebuild with `npm run build:html`.
