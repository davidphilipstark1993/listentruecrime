# Merchandise Shop — System Notes, Audit and Launch Checklist

The shop is a print-on-demand store at `/shop`: **Stripe Checkout** takes payment, **Printify** makes and ships the products, **Supabase** stores catalogue/orders, **Vercel** hosts it. It is built into the existing Next.js site and is **completely off by default** — nothing is public, no payment can be taken, and no supplier order can be placed until you switch it on.

---

## 1. Audit of the existing site (Phase 1)

| Area | What exists | How the shop uses it |
|---|---|---|
| Framework | Next.js 14.2.5 App Router, TypeScript, React 18 | New routes under `app/shop`, `app/api/shop`, `app/admin/shop` |
| Styling | Tailwind, "ink" black/charcoal palette, crimson accent, Playfair + Inter, shared `.card` / `.btn-*` classes | Shop uses the same tokens, so it looks native — no new design system |
| Database | Supabase Postgres, numbered SQL migrations run by hand (`supabase/migrations`), RLS on every table, service-role client in `lib/supabase/admin.ts` | `019_shop.sql` then `020_shop_match_printify.sql` (017 is newsletter double opt-in and 018 is podcast SEO/data integrity, so the shop takes 019-020; both already applied to prod on 26 Oct 2026) |
| Auth | Supabase Auth; `middleware.ts` gates `/admin/*` on `profiles.is_admin`; API routes re-check with `requireAdmin()` | `/admin/shop/*` is covered by middleware; every `/api/admin/shop/*` route calls `requireAdmin()` |
| Email | `lib/email/adminNotify.ts` (SendGrid, else Resend) for admin alerts; SendGrid for subscriber mail | Admin alerts reuse `notifyAdmin()`. Customer order/dispatch mail uses the same SendGrid→Resend selection (`lib/shop/email.ts`) but without an unsubscribe group (service mail, not marketing) |
| Newsletter | `POST /api/newsletter` → `newsletter_subscribers` | Shop uses the existing `NewsletterForm` with `source="shop-*"`. No second subscriber list. Added an optional `buttonLabel` prop ("Subscribe Free") — default behaviour unchanged |
| Scheduled jobs | GitHub Actions | `.github/workflows/shop-retry-fulfilment.yml` (every 15 min; does nothing until secrets exist) |
| Tests | Vitest | 57 new tests (see §5) |

**New dependency:** `stripe` (official SDK) only. Printify is called with `fetch`. Basket state is a ~60-line store with no library.

### Complications found (please read)

1. **Printify auto-approves API orders by default.** Their docs say new stores have automatic approval (24 h): an order created through the API is sent to production by itself unless the store's *Order approval* is set to **Manual**. This is the biggest safety issue for "don't spend money during testing". See §4.
2. **Printify currency (verified on the live API, 20 Oct 2026):** costs and shipping are returned in **USD**, whatever card you pay with, so the shop converts to GBP with a rate in **Admin → Shop → Settings** (seeded at 0.78 = mid-market ~0.75 plus a buffer for card FX fees). Delivery is rounded up to the penny. If a non-GBP rate is missing, delivery can't be priced and checkout refuses.
3. **Change-of-mind returns.** Printify does not take these at its production sites. Under UK law you still owe the 14-day right to cancel for non-personalised goods, so you need your **own returns address** and a decision on who pays return postage. The policy drafts contain `[CONFIRM]` markers for this.
4. **Printify's API can only cancel *unpaid* orders.** A refund in Stripe does not stop a paid Printify order; the admin gets an alert to check Printify.
5. `npm ci` already fails on this repo (lockfile out of sync with a platform-specific optional dependency; the existing workflows use `npm install` for this reason). Adding `stripe` rewrote `package-lock.json` — expect that diff.
6. `next@14.2.5` triggers npm's "security vulnerability" deprecation notice. Pre-existing, but worth upgrading now the site will take payments.
7. `adminNotify.ts`'s own comment says SendGrid "silently no-ops in this project's production/CI env". The shop's alerts and customer emails depend on a working provider — verify one (see checklist).
8. **Shipping quote — verified.** `POST /shops/{id}/orders/shipping.json` works with only `{country: "GB"}` and returns `{standard: <USD cents>}` (tested read-only against your shop).
9. **Your existing Printify product uses a US provider.** "Listen True Crime Podcast T-Shirt" (Comfort Colors, blueprint 706) is made by *Printify Choice* in **Miami**: UK delivery from there is about $10.39 for one tee, slower, and may attract import charges. The same blueprint is offered by the UK provider **Shirt Monkey** (Winsford) with about $3.59 UK shipping (+$1.99 per extra item); other UK providers: Print Clever (Swindon, Gildan tees/hoodie), T Shirt and Sons (Westbury, tees/hoodie), Harrier (Newton Abbot, black 11oz mug). Printify lists a **10-day handling time** for all of them, so the delivery wording now says production can take up to 10 days. Switching provider in Printify changes the variant ids — do it before linking the product here. The admin sync now warns when a product's provider is outside the UK.
10. **Printify webhooks are not registered yet** (none exist on the shop) and the shop currently has no orders. Order approval can't be read via the API — set it to Manual in Printify settings.

---

## 2. How it works

```
Basket (browser: variant ids + quantities only)
  → POST /api/shop/quote       re-prices from DB + asks Printify for delivery
  → POST /api/shop/checkout    creates a PENDING order, then a Stripe Checkout Session
  → Stripe-hosted page         card / Apple Pay / Google Pay; collects name, address, email, phone
  → POST /api/shop/webhooks/stripe   signature verified on the raw body
        ├ event id de-duplicated (shop_webhook_events)
        ├ order flipped pending → paid by a conditional UPDATE (only one caller wins)
        ├ paid amount must equal the quoted total, else → needs_review, NOT sent
        ├ confirmation email (claimed atomically → sent once)
        └ Printify order created (claimed by compare-and-swap → created once)
  → Printify webhooks (/api/shop/webhooks/printify, HMAC verified)
        └ re-fetches the order from Printify → status, real costs, tracking → one dispatch email per parcel
```

**Safety rules, all covered by tests:** unpaid orders never reach Printify · prices/totals/Printify ids always come from the DB, never the browser · replayed Stripe or Printify events do nothing · concurrent deliveries create one Printify order · ambiguous Printify answers (timeout/500/504) go to a human instead of a blind retry (a retry could double-charge you) · retryable errors back off 2 m → 10 m → 30 m → 2 h → 6 h then escalate · test-mode Stripe can never send to production.

**Three switches (all default OFF):**

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SHOP_ENABLED=true` | `/shop*`, nav link, footer links, homepage promo, sitemap entries, privacy/terms shop sections appear. Off → every `/shop` URL is a 404 |
| `SHOP_CHECKOUT_ENABLED=true` | `/api/shop/checkout` will create Stripe sessions |
| `SHOP_PRINTIFY_SEND_TO_PRODUCTION=true` | Paid orders are sent to production automatically. **Only honoured with a live Stripe key.** Off → the Printify order is created and held; you can send it from the order page |

Set the first one on Vercel **Preview** only to review the shop without publishing.

**Admin (`/admin/shop`)**: overview (orders, revenue, estimated vs confirmed profit, failed orders, launch-readiness checklist, recent errors) · orders (search, filters, detail, log, retry, refresh from Printify, send to production, refund, link an existing Printify order, resend confirmation, notes) · products (add/edit/hide/feature, variants, prices, link to Printify and pull real variants/mock-ups) · settings (Printify currency & rate, Stripe fee estimate, VAT).

**Profit:** *Estimated* uses your recorded variant costs + the fee setting. It becomes *confirmed* only when Printify has reported its real charges **and** Stripe its real fee. Orders with an unknown cost are excluded rather than counted as free.

---

## 3. Decisions (answered 20 Oct) and what's still open

| Topic | Decision | Where it's applied |
|---|---|---|
| Prices | I suggested: **T-shirts £24.99, hoodies £44.99, mug £13.99** (no VAT; delivery is extra at Printify's real rate) | Seeded in `019_shop.sql`, replaced by the real Printify products in `020_shop_match_printify.sql`; shown as "coming soon" until a Printify variant is linked; edit per variant in the admin |
| Printify currency | You said GBP, but the API reports **USD**; converted at 0.78 (editable) | `shop_settings` seeded in migration |
| Returns | A blanket "no returns" is not lawful for these goods in the UK (14-day cancellation right; faulty-goods rights can't be excluded). Instead: **customer pays return postage for change-of-mind returns**; we pay for faulty/damaged/misprinted items. Customers contact us first and we email the returns address | `app/shop/returns-and-refunds`, `lib/shop/copy.ts` |
| Trading status | UK law, **sole trader** trading as Listen True Crime, Station Road, Hessle, HU13 0BG. Governing law: England and Wales (Scotland/NI customers keep local court rights) | `components/shop/terms-shop-section.tsx`, `lib/shop/copy.ts` |
| VAT | **Not VAT registered**: no VAT is charged or mentioned; VAT % is 0 | `PRICES_INCLUDE_VAT = false` in `lib/shop/copy.ts`, `vat_percent` = 0 |
| Delivery wording | "**3–5 working days** from dispatch" plus up to 10 days production (Printify's listed handling time) | `DELIVERY_ESTIMATE` in `lib/shop/copy.ts` |
| Mug | **Black, with the company logo.** I renamed it "Listen True Crime Mug" (slug `listen-true-crime-mug`) because the logo, not the Armchair Detective lettering, is the artwork — tell me if you want the old name back | migration seed |
| Logo | Found `public/logo.png` (1254×1254, opaque black background). I made a **transparent print version**: `assets/shop-artwork/listen-true-crime-logo-transparent.png` | repo |

**Still open / please check**
- **Your full legal name** (sole traders trading under a business name must show it) — placeholder in the terms.
- **Printify account, print provider and blueprint** per product — filter the catalogue for UK production and compare price/production time. Likely candidates: Gildan 5000 or Softstyle tee (black), Gildan 18500 hoodie (black), 11oz black ceramic mug. Check the suggested prices against the real GBP costs.
- **Logo:** it was AI-generated (ChatGPT) at 1254 px. Before putting it on products: check it contains nothing resembling someone else's trademark, keep a record of how it was made, and ideally have it re-generated larger or vectorised for big chest prints. Printify will ask you to confirm you have the rights to the artwork.
- **3–5 working days:** check against each provider's handling time in Printify.
- **Returns:** the supplier won't take change-of-mind returns, so those come to the address we email the customer; the item is then yours (usually of little resale value).
- Artwork for the T-shirt and hoodie designs (in progress), privacy-policy placeholders (Printify controller status, transfer safeguard, retention period), policy "last updated" dates, and a solicitor's read of the four policy texts.

Not built, by design: creating Printify products (the admin only *reads* a Printify product you've made), international shipping (one constant in `lib/shop/config.ts`, `SHIPPING_COUNTRIES`, plus a shipping check), subscriber discount codes / referral rewards (the newsletter `source` tag and order table are the hooks).

---

## 4. Launch checklist

### A. Database
- [ ] Run `supabase/migrations/019_shop.sql` then `020_shop_match_printify.sql` in the Supabase SQL editor (creates tables + RLS + the 7 placeholder products with suggested prices, all unbuyable until linked to Printify).

### B. Printify
- [ ] Create a Printify account/shop (a **Manual order approval** store — *Settings → Order approval → Manual*). Use a separate empty shop for testing if you can.
- [ ] Billing: add a payment method (Printify charges it per order). Note the billing currency.
- [ ] Create each product from your artwork (UK print providers where possible). Don't publish them to another sales channel.
- [ ] Create a **Personal Access Token** (tick the scopes for reading shops and products, reading and writing orders, and reading and writing webhooks — names as shown on Printify's token screen) → `PRINTIFY_API_TOKEN`. Shop id → `PRINTIFY_SHOP_ID`.
- [ ] Choose a random 16+ char string → `PRINTIFY_WEBHOOK_SECRET`.

### C. Stripe
- [ ] Use **test mode** first. Secret key → `STRIPE_SECRET_KEY` (`sk_test_…`).
- [ ] Add endpoint `https://www.listentruecrime.com/api/shop/webhooks/stripe` with events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created` → signing secret → `STRIPE_WEBHOOK_SECRET`.
- [ ] Enable Apple Pay / Google Pay in *Settings → Payment methods* and register the domain (Apple Pay). Confirm GBP and UK card payments are enabled.
- [ ] Branding (logo/colours) in Checkout settings.

### D. Vercel environment variables (see `.env.example`)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRINTIFY_API_TOKEN`, `PRINTIFY_SHOP_ID`, `PRINTIFY_WEBHOOK_SECRET`, `SHOP_CRON_SECRET` (random 32+ chars), `SHOP_SUPPORT_EMAIL`, plus the three switches above. Confirm `NEXT_PUBLIC_SITE_URL` is `https://www.listentruecrime.com` and `SENDGRID_API_KEY` or `RESEND_API_KEY` works (send yourself a test). Add `SHOP_CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` as **GitHub Actions secrets** for the retry job.

### E. Webhooks & shipping config
- [ ] After deploying: `PRINTIFY_API_TOKEN=… PRINTIFY_SHOP_ID=… PRINTIFY_WEBHOOK_SECRET=… NEXT_PUBLIC_SITE_URL=… npx tsx scripts/shop/register-printify-webhooks.ts` (once; `--list` shows existing).
- [ ] Admin → Shop → Settings: confirm currency GBP, Stripe fee, VAT % (20 only if VAT registered).

### F. Products
- [ ] Admin → Shop → Products → open a product → paste its **Printify product id** → *Pull variants from Printify*. Then set each variant's **price**, check images/alt text, size guide (from the supplier chart), tick *not a placeholder*, set visible/featured.

### G. Testing (nothing here should spend real money)
- [ ] Preview deployment with `NEXT_PUBLIC_SHOP_ENABLED=true`, `SHOP_CHECKOUT_ENABLED=true`, Stripe **test** keys, `SHOP_PRINTIFY_SEND_TO_PRODUCTION=false`.
- [ ] Basket → quote: confirm a real delivery price appears (this validates item 8 above).
- [ ] Pay with `4242 4242 4242 4242`. Check: order is `paid`, confirmation email arrives once, a Printify order exists **unsent** with the right address/items.
- [ ] Resend the webhook from the Stripe dashboard → confirm nothing duplicates.
- [ ] Break something on purpose (wrong `PRINTIFY_SHOP_ID`) → order goes `failed`/`needs_review`, you get an alert, *Retry fulfilment* works after fixing it.
- [ ] In Printify, cancel/delete the unsent test orders (or use the dedicated test shop).
- [ ] Review the shop on a phone; review policy pages with a solicitor.
- [ ] **Go live (only when you approve):** live Stripe keys + new live webhook secret → one real low-value order end-to-end (your own address) → then set `SHOP_PRINTIFY_SEND_TO_PRODUCTION=true`.

---

## 5. Testing status (honest)

**Automated, passing (`npm test`, 144 tests repo-wide, 57 of them new):** cart validation & server-side pricing · tampered client prices ignored · delivery rounding/refusal without a rate · profit (estimated vs confirmed, VAT, refunds, unknown costs) · Stripe signature rejection (missing/wrong secret) · Printify HMAC · duplicate & concurrent webhooks → one Printify order, one email · amount-mismatch and unpaid-order refusal · transient / rejected / ambiguous Printify failures, backoff, retry job, stale-submission handling, admin retry · tracking, per-parcel dispatch emails, no backwards status moves · refunds (partial/full/over-refund/dashboard-originated) · shop switched-off = 404.
`tsc` clean for new code (one pre-existing error in `components/admin/podcast-form.tsx`), ESLint clean on new files, `next build` passes, and the storefront was rendered at desktop and mobile sizes against a stub database (basket persists across refresh).

**Not yet done — needs your credentials:** a real Stripe test payment, a real Printify draft order, the real shipping-quote call, real email delivery, Apple Pay, and the admin screens against a real database (they type-check and build, but I could not log in as an admin here). The Supabase queries were tested against an in-memory fake, not Postgres — run the migration and the §G steps before trusting it.

## 6. Known limitations
- No rate limiting on `/api/shop/quote` / `checkout` beyond input caps and a 2-minute in-memory shipping cache — consider a Vercel Firewall rule.
- One delivery method (Printify "standard"). Express/economy is a small addition once you want it.
- Customers have no order-lookup page; they use the emailed confirmation/tracking and the support address.
- Product images are admin-entered URLs (Printify mock-ups are imported automatically); allowed hosts are in `next.config.js`.
