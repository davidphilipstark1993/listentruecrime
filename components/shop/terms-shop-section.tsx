import Link from 'next/link'
import { BUSINESS_ADDRESS, BUSINESS_NAME, PRICES_INCLUDE_VAT } from '@/lib/shop/copy'

// DRAFT — for owner / legal review. Rendered on /terms only while the shop is enabled.
export function TermsShopSection() {
  return (
    <section id="shop-terms" className="scroll-mt-24">
      <h2 className="heading-section text-xl text-stone mb-3">Shop terms of sale</h2>
      <ul className="space-y-3 list-disc pl-5">
        <li><strong className="text-stone">Who you are buying from.</strong> {BUSINESS_NAME} is a trading name of <strong className="text-stone">[CONFIRM: your full legal name]</strong>, a sole trader, of {BUSINESS_ADDRESS}. Contact: see our <Link href="/contact" className="text-crimson hover:underline">Contact page</Link>. {PRICES_INCLUDE_VAT ? 'VAT number: [CONFIRM: VAT registration number].' : 'We are not VAT registered, so no VAT is charged.'}</li>
        <li><strong className="text-stone">Your order.</strong> Placing an order is an offer to buy. Our contract with you is made when we send your order confirmation email. We may decline an order, for example if an item is unavailable or a price is wrong, and will refund anything you have paid.</li>
        <li><strong className="text-stone">Prices and payment.</strong> Prices are in pounds sterling. Delivery is shown before you pay. Payment is taken by Stripe when you place the order.</li>
        <li><strong className="text-stone">Made to order.</strong> Products are printed after you order, by third-party print providers. Colours on screen can differ slightly from the printed item.</li>
        <li><strong className="text-stone">Delivery, cancellation and returns.</strong> See our <Link href="/shop/shipping-policy" className="text-crimson hover:underline">Shipping Policy</Link> and <Link href="/shop/returns-and-refunds" className="text-crimson hover:underline">Returns and Refunds Policy</Link>. Nothing in these terms limits your statutory rights.</li>
        <li><strong className="text-stone">Designs.</strong> All designs and the Listen True Crime name and logo belong to us or our licensors. Buying a product does not give you the right to reproduce the design.</li>
        <li><strong className="text-stone">Liability.</strong> We do not exclude liability that cannot lawfully be excluded, including for death or personal injury caused by negligence, fraud, or your statutory consumer rights.</li>
        <li><strong className="text-stone">Law.</strong> These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland you can also bring a claim in the courts there, and nothing here affects your statutory consumer rights.</li>
      </ul>
    </section>
  )
}
