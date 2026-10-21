import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE } from '@/lib/seo/config'
import { supportEmail } from '@/lib/shop/config'
import { DELIVERY_ESTIMATE, PRICES_INCLUDE_VAT } from '@/lib/shop/copy'
import { PolicyShell } from '@/components/shop/policy-shell'

// DRAFT — for owner / legal review before launch. [CONFIRM: …] markers stand in
// for facts only the owner or the supplier can provide. Delivery timings are
// deliberately NOT promised until they are backed by Printify's handling times
// and the carrier's transit times (see lib/shop/copy.ts → DELIVERY_ESTIMATE).

export const metadata: Metadata = {
  title: 'Shipping Policy | Listen True Crime Shop',
  description: 'How and where Listen True Crime merchandise is made, dispatched and delivered, and what delivery costs.',
  alternates: { canonical: `${BASE}/shop/shipping-policy` },
}

export default function ShippingPolicyPage() {
  return (
    <PolicyShell title="Shipping Policy" updated="[CONFIRM: date this policy goes live]">
      <section>
        <h2>Where we deliver</h2>
        <p>We currently deliver to addresses in the United Kingdom. Some remote destinations (for example the Channel Islands or the Isle of Man) may not be available from our supplier; if your address cannot be served we will say so before you pay. We plan to add international delivery later.</p>
      </section>
      <section>
        <h2>Made to order</h2>
        <p>Everything in the shop is printed to order by our fulfilment partner, Printify, and its network of print providers. Nothing is held in stock, so every order has two stages: production, then delivery.</p>
        {DELIVERY_ESTIMATE
          ? <p className="mt-3"><strong>{DELIVERY_ESTIMATE}</strong></p>
          : <p className="mt-3"><strong>Estimated time:</strong> [CONFIRM: production time plus delivery time, taken from the print provider&apos;s published handling time and carrier service. We will not publish a timing we cannot support.]</p>}
        <p className="mt-3">Estimates are not guarantees. Unless we agree otherwise, we will deliver your order within 30 days of the day you place it, as the law requires.</p>
      </section>
      <section>
        <h2>What delivery costs</h2>
        <p>Delivery is charged at the actual rate our supplier quotes for the items in your basket, and you will see the exact amount before you pay. It can vary with the products you choose and the number of items. We do not add a handling charge.</p>
      </section>
      <section>
        <h2>Several parcels</h2>
        <p>Items in one order can be made in different places, so they may be dispatched and arrive separately. You will receive a dispatch email with tracking for each parcel.</p>
      </section>
      <section>
        <h2>Tracking and missing parcels</h2>
        <p>We email tracking details as soon as the carrier confirms dispatch. If your parcel has not arrived when expected, or tracking shows it as delivered and you do not have it, contact <a href={`mailto:${supportEmail()}`}>{supportEmail()}</a> with your order number and we will investigate with the carrier.</p>
      </section>
      <section>
        <h2>Customs and taxes</h2>
        <p>Delivery within the UK has no customs charges. {PRICES_INCLUDE_VAT ? 'Prices include VAT.' : ''}</p>
      </section>
      <section>
        <h2>Incorrect addresses</h2>
        <p>Please check your delivery address carefully at checkout. Once an order has gone into production we may not be able to change it. If a parcel is returned to the supplier because of an incorrect or incomplete address, we will contact you to arrange redelivery, which may involve an extra delivery charge.</p>
      </section>
      <p>See also our <Link href="/shop/returns-and-refunds">Returns and Refunds Policy</Link>.</p>
    </PolicyShell>
  )
}
