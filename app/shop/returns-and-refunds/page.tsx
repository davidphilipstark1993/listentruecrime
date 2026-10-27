import { POLICIES_UPDATED } from '@/lib/shop/copy'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BASE } from '@/lib/seo/config'
import { supportEmail } from '@/lib/shop/config'
import { PolicyShell } from '@/components/shop/policy-shell'

// DRAFT — for owner / legal review before launch.
//
// Drafting notes (not shown to customers):
//  • Reg 28(1)(b) of the Consumer Contracts (Information, Cancellation and
//    Additional Charges) Regulations 2013 exempts goods "made to the consumer's
//    specifications or clearly personalised". A standard catalogue design that
//    is simply printed after the order is NOT personalised, so the normal 14-day
//    cancellation right applies. If personalised products (customer-chosen
//    names/text) are ever added, those items — and only those — fall under the
//    exemption and the page must say so.
//  • A blanket "no returns" policy is NOT lawful for non-personalised goods sold
//    online in the UK: the 14-day right to cancel and the Consumer Rights Act
//    faulty-goods rights cannot be excluded. The lawful way to limit cost is to
//    make the customer pay return postage for change-of-mind returns (allowed
//    if stated before purchase — it is on product pages, the basket and here)
//    and to refund only once the goods are received back.
//  • Printify does not take change-of-mind returns, so the returns address is
//    issued per request (it may be the owner's) rather than published here.
//  • Faulty goods are governed by the Consumer Rights Act 2015 regardless of this page.

export const metadata: Metadata = {
  title: 'Returns and Refunds Policy | Listen True Crime Shop',
  description: 'Your right to cancel, how to return merchandise, and what we do about faulty or misprinted items.',
  alternates: { canonical: `${BASE}/shop/returns-and-refunds` },
}

export default function ReturnsPage() {
  const email = supportEmail()
  return (
    <PolicyShell title="Returns and Refunds Policy" updated={POLICIES_UPDATED}>
      <section>
        <h2>Your right to change your mind</h2>
        <p>Our products are printed to order from our standard designs. They are not personalised to you, so under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013 you can cancel your order for any reason within <strong>14 days of the day you receive your goods</strong>.</p>
        <p className="mt-3">To cancel, tell us clearly — email <a href={`mailto:${email}`}>{email}</a> with your order number. You can also use the model cancellation form, but you do not have to. You then have 14 days to send the goods back.</p>
        <ul className="mt-3">
          <li><strong>Returns address:</strong> contact us first and we will email you the returns address for your order. Items are made and shipped by our UK print supplier, so the address may be theirs rather than ours — please do not post anything back before you have it.</li>
          <li><strong>Return postage:</strong> if you change your mind, you pay the cost of posting the goods back. We recommend a tracked service, as you are responsible for the goods until they reach us. If the item is faulty, damaged or misprinted, we pay for the return (see below).</li>
          <li>Please return items unworn and unwashed, with any tags, and take reasonable care of them until we receive them. We may reduce a refund if you have handled the goods more than was needed to check them.</li>
        </ul>
      </section>
      <section>
        <h2>When you will be refunded</h2>
        <p>We refund the price of the goods, and the standard delivery charge you paid, within 14 days of receiving the goods back or of receiving proof that you have sent them (whichever is earlier). If you chose a more expensive delivery option than our standard one, we are not required to refund the extra. Refunds go back to the card or payment method you used, at no charge.</p>
      </section>
      <section>
        <h2>Faulty, damaged or misprinted items</h2>
        <p>By law, goods must be of satisfactory quality, fit for purpose and as described. If your item arrives damaged, faulty or with a printing error, email <a href={`mailto:${email}`}>{email}</a> within 30 days with your order number and a photo. We will offer a replacement or a refund, and we will pay for any return needed. Your statutory rights under the Consumer Rights Act 2015 are not affected by anything on this page.</p>
      </section>
      <section>
        <h2>Wrong size</h2>
        <p>Please use the size guide on each product page. If the size does not suit, you can use your right to cancel above and place a new order for the size you want.</p>
      </section>
      <section>
        <h2>Personalised items</h2>
        <p>We do not currently offer personalised products. If we do in future, items made to your own specification are not eligible for the 14-day change-of-mind right, and we will say so clearly on those product pages before you buy. They remain covered for faults.</p>
      </section>
      <section>
        <h2>Cancelling before dispatch</h2>
        <p>If you want to cancel straight after ordering, contact us as soon as you can. Production starts quickly, so we cannot always stop an order, but in that case your right to cancel after delivery still applies.</p>
      </section>
      <p>See also our <Link href="/shop/shipping-policy">Shipping Policy</Link>.</p>
    </PolicyShell>
  )
}
