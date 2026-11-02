# Referrals & Discount Codes

A referral programme for the newsletter, and a reusable discount-code system for the merch shop. It is built on what already existed (Supabase, double opt-in, SendGrid/Resend, Stripe Checkout + Printify). **No new services and no new API keys.**

---

## 1. Launch checklist (the manual bits)

- [ ] **Run `supabase/migrations/023_referrals_and_discounts.sql`** in the Supabase SQL editor (already verified on a real Postgres: see §7). It adds subscriber referral codes (and backfills every existing subscriber), the `referrals`, `discount_campaigns` and `discount_codes` tables, and the discount columns on `shop_orders`. Safe to re-run.
- [ ] Deploy. There is nothing to configure: referral rewards use the SendGrid/Resend keys you already have, and discounts use your existing `STRIPE_SECRET_KEY`.
- [ ] Optional: set `DISCOUNT_MAX_PERCENT` (see §5) — leave blank to keep the default of 30.
- [ ] **Send yourself a real test** once deployed (see §7). Email delivery and the Stripe coupon call could not be exercised against real services while building this.
- [ ] Referral share links, the confirmed-page share box and the referral block in the welcome emails only appear while `NEXT_PUBLIC_SHOP_ENABLED=true` (the reward is a shop discount). Open the shop first, then announce referrals. Reward codes expire 60 days after they are issued, so don't promote the programme long before the shop can take orders.
- Nothing to do for existing subscribers: they already have codes (the migration backfills them) and, once the shop is open, **every weekly issue and welcome email carries each subscriber's own link** (added at send time via SendGrid substitutions / per-recipient replacement for Resend, so the archive page and RSS are untouched). No separate announcement blast is needed.
- [ ] Privacy policy: a "Referrals" bullet and a "Discount codes" shop bullet were added. Have it reviewed with the rest of the policy.
- [ ] Creating a Black Friday campaign: **Admin → Shop → Discounts → Campaigns → BF26-** → *Create public code* (e.g. `BLACKFRIDAY`), then switch the campaign **On**. It is seeded **off**.

---

## 2. How referrals work

1. Every subscriber has a short code (6 characters, e.g. `K7M2QX`, no look-alike letters) assigned by the database, and a link `/subscribe?ref=K7M2QX`. They see the link on the "you're subscribed" page and in their welcome email.
2. The sign-up form has an optional **"Referred by someone? Enter their code"** field. It fills itself in from `?ref=` (on any page with a form, not just `/subscribe`), tidies what's typed, and says "Code recognised" when it matches. A wrong code never blocks signing up; it is just ignored.
3. At sign-up (`POST /api/newsletter`) a *pending* referral is recorded **only if a brand-new subscriber row was just created**. An email already in the database (active, pending or unsubscribed) is never "referred", and the response is identical either way so the form can't be used to probe the list.
4. When that subscriber clicks their double opt-in link (`GET /api/newsletter/confirm`) the referral becomes **confirmed** and counts. Clicking twice, or two scanners hitting the link, counts once.
5. Blocked: a code that doesn't exist; a referrer who isn't an active subscriber; referring yourself (same address, `+tag` alias, Gmail dots/googlemail); a new subscriber who signed up from the same (hashed) IP as the referrer; and any second referrer (a subscriber can credit one referrer only: `UNIQUE(referred_id)` in the database).
6. Counts are per subscriber: **Admin → Shop → Referrals** lists referrers with confirmed/pending counts and their reward codes.
7. **Privacy:** only the referrer's *code* is in the link. Nobody ever enters someone else's email address, and the reward email never says who joined.

## 3. Rewards

| Confirmed referrals | Reward |
|---|---|
| 1 | one unique single-use **20%** off merch code |
| 3 | a second unique single-use **30%** off merch code |

Defined in `REFERRAL_TIERS` (`lib/discounts/config.ts`). When a tier is reached the referrer is emailed the code with a short thank-you, the expiry date and the next tier to aim for. Codes are `REF-XXXXXXXX`, expire **60 days** after being issued (`REFERRAL_CODE_VALID_DAYS`), and each tier can only ever be issued once per subscriber (a unique index, not just application logic). A failed email is retried the next time rewards run, or use **Resend email** on the code in the admin. `npx tsx scripts/referrals/issue-missing-rewards.ts` is an idempotent catch-up for everyone (e.g. after changing the tier table or switching the REF- campaign back on).

## 4. The discount-code system

**Campaigns** (Admin → Shop → Discounts, or the `discount_campaigns` table) hold a prefix, a %, a type and an expiry. Creating one needs no code change.

| Prefix | Meant for | Type | Seeded |
|---|---|---|---|
| `REF-` | referral rewards | unique | **on** (used automatically) |
| `BF26-` | Black Friday 2026 | public (ends 1 Dec 2026) | off |
| `LOYAL-` | loyalty | unique | off |
| `WELCOME-` | new subscribers | unique | off |

- **Unique** campaigns issue personal single-use codes: `PREFIX-` + 8 random characters (≈ 8.5 × 10¹¹ combinations, cryptographically random). Generate N at a time from the admin.
- **Public** campaigns have one shared code you choose, e.g. `BF26-BLACKFRIDAY`, usable by anyone any number of times (optionally capped).
- **Every code has an expiry.** A campaign gets a fixed end date, a "valid for N days" lifetime per code, or both (the earlier wins). The database refuses a campaign with neither.
- **Switches:** a campaign or an individual code can be switched off at any time.

## 5. The rules, and where they are enforced

All in `lib/discounts/validate.ts` (one function used by the basket, checkout and redemption):

| Rule | Behaviour |
|---|---|
| Exists / active / started / not expired | otherwise a clear message: "We don't recognise that code", "This code has expired", etc. |
| Single-use not already used | "This code has already been used." |
| **One code per order, no stacking** | the API takes a single string; two codes in the box ("A B", "A, B") are refused; Stripe's own promotion codes stay disabled; the order stores exactly one code |
| **Maximum discount** | `MAX_DISCOUNT_PERCENT = 30` in `lib/discounts/config.ts` (or `DISCOUNT_MAX_PERCENT` env, which wins). Checked when a campaign is created, when a code is issued (clamped), **and every time a code is applied**, so lowering it also disables codes already issued above it |

The discount comes off the **merchandise subtotal only** — delivery is never discounted — rounded **down** to the penny so the cap can never be exceeded.

### Checkout (Stripe Checkout + our own basket)

The shop isn't on Shopify, so the validation lives in the shop's own server code rather than a platform API:

1. Basket → `POST /api/shop/quote` with `{items, code}` re-prices from the database and returns the discount or an error. An invalid code shows its message and **blocks payment** until it's fixed or removed, so nobody is charged a price they didn't expect. `/shop/basket?code=REF-…` (the link in the reward email) pre-applies a code.
2. `POST /api/shop/checkout` validates again, creates the order (recording `discount_code`, `discount_campaign_prefix`, `discount_percent`, `discount_pence`; `total = subtotal − discount + delivery`) and **reserves** a single-use code with a compare-and-swap, so two checkouts can't both take it.
3. The discount is passed to Stripe as a one-off fixed-amount coupon so the Stripe page and receipt show it and `amount_total` equals our order total (the existing paid-amount check still guards fulfilment).
4. If the Stripe session expires, a delayed payment fails, or Stripe can't start, the reservation is **released** (once). If a customer backs out of Stripe and tries again within the hour, the abandoned session is expired and the code is handed over; if it can't be expired (it's being paid right now) the second attempt is refused.

### Revenue per campaign

Every order snapshots its code and campaign. **Admin → Shop → Discounts → Revenue per campaign** shows paid orders, net revenue, discount given and average order per prefix, with orders that used no code as the baseline. The code also shows on the order page and orders list. Equivalent SQL:

```sql
select coalesce(discount_campaign_prefix, '(no code)') as campaign,
       count(*) as orders,
       sum(total_pence - refunded_pence) / 100.0 as revenue_gbp,
       sum(discount_pence) / 100.0 as discount_gbp
from shop_orders
where payment_status in ('paid', 'partially_refunded', 'refunded')
group by 1 order by 3 desc;
```

---

## 6. Assumptions I made (change any you disagree with)

1. **Shop is Stripe + Printify, not Shopify**, so checkout logic is in-house and Stripe is only told the final discount (a coupon created per checkout). No Shopify API was involved.
2. **"Off merch" = off products, not delivery.** Delivery is Printify's real cost and must still be covered.
3. **Referrer must be active.** A referrer who has since unsubscribed has their referral counted but gets no reward email (they asked us to stop emailing). Their code also stops working as a referral link.
4. **A referral still counts if the friend later unsubscribes.** Deleting the friend's subscriber record (e.g. a privacy erasure request) removes it.
5. **Same-IP referrals are blocked** as the cheap defence against referring yourself with a second address (`REFERRAL_BLOCK_SAME_IP`, switch it off if housemates should be able to refer each other). Self-referral is also caught by address (including `+tag` and Gmail dots). It does **not** catch someone using a genuinely different mailbox and IP. Double opt-in and 60-day single-use codes limit the damage.
6. **Codes are bearer tokens.** Whoever has a code can use it once; it isn't locked to the referrer's email (the email is only collected at Stripe, after the code is entered). Forwarding a reward to a friend is allowed.
7. **Tier codes are separate.** At 3 referrals the referrer holds a 20% *and* a 30% code (they can only use one per order).
8. **Percentages above the cap are clamped when issued** (e.g. with a cap of 25, the "30%" tier code is issued at 25%) and refused when applied.
9. **Reward email is service mail** sent through the shop's mailer (SendGrid, else Resend), without an unsubscribe group, like order emails. It is a one-off message about a reward they earned; it isn't a marketing campaign.
10. **Referral promo is hidden while the shop is switched off** (welcome emails, confirmed page), because the reward is only useful once the shop is open. The sign-up field and the tracking work regardless.
11. **WELCOME- and LOYAL- are not issued automatically.** They exist as switched-off campaigns. Generate codes in the admin when you want them, or call `issueUniqueCodes()` from a script.
12. **No Stripe-side promotion codes** — `allow_promotion_codes` stays false so nothing can stack on top of ours.
13. **Public codes aren't counted on a row** (no contention on busy campaigns); their usage is counted from orders (revenue table). If you give a public code a cap, it is counted and reserved like a single-use code.
14. **The BF26 end date** is seeded as 1 Dec 2026 00:00 UTC (just after Cyber Monday). Edit the row if you want different dates.

## 7. Testing

Automated (`npm test`, 332 tests in total, **148 new**): code generation, prefix naming, input parsing (case, dashes, two codes), expiry maths, validation (every failure + the max-discount cap incl. lowering it), campaign creation, unique/public issuing and idempotence, concurrent single-use reservation, release-once, abandon-and-retry takeover, the full quote→checkout→paid/expired lifecycle with real routes, referral registration (new-only, self, same-IP, one referrer, inactive referrer), confirmation-only counting and idempotence, tier rewards (1→20%, 3→30%, no duplicates, catch-up, cap clamp, email retry), the sign-up→confirm→reward journey through the real routes, and the email contents/gating. **The migration** was run against a real Postgres (PGlite) holding 500 existing subscribers by `node scripts/referrals/verify-migration.mjs` (see the header for the one-line setup): backfill gives 500 distinct valid codes, re-running is safe, and self-referral, second referrer, duplicate tier, missing expiry, bad prefix, out-of-range %, negative use counts and the compare-and-swap all behave. The three emails (reward, welcome, weekly issue) were rendered and checked visually. Type-check is clean for new code (one pre-existing error in `components/admin/podcast-form.tsx`), and the sign-up field and basket UI were checked in a real browser (desktop and phone width).

**Not tested against real services — please do this once:**

1. Deploy, sign up with a second address using your own link (use a different network/phone data, because same-IP referrals are blocked), confirm it, and check the reward email arrives and that **Admin → Referrals** shows 1.
2. With Stripe **test keys**: put the reward code in the basket, pay with `4242 4242 4242 4242`, and check Stripe shows the discount, the order page shows the code, and the code now reads "used" in **Admin → Discounts**.
3. Open checkout with a code, cancel on Stripe, return to the basket and check the same code still applies.
4. Create a `BF26-` public code and confirm two different orders can use it.

## 8. Known limitations

- No rate limiting on code entry (same as the rest of the shop API). Random codes can't be guessed in practice, but a public code can be shared freely, which is the point. Consider a Vercel Firewall rule on `/api/shop/quote`.
- The application's Supabase queries were tested against an in-memory fake; the migration itself was tested on real Postgres (§7). The one thing neither covers is PostgREST's own request handling, which only a deployment exercises.
- Per-campaign revenue counts orders by the code snapshot, so deleting a campaign leaves its prefix on past orders (intentional) but unlinks its id.
