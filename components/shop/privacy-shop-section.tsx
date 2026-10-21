import Link from 'next/link'
import { supportEmail } from '@/lib/shop/config'

// DRAFT — for owner / legal review. Rendered on /privacy only while the shop is
// enabled, so the privacy policy never describes a shop that is not live.
export function PrivacyShopSection() {
  return (
    <section id="shop">
      <h2 className="heading-section text-xl text-stone mb-3">Shop orders</h2>
      <p>If you buy from our shop, we (Listen True Crime, a trading name of a sole trader) collect and use:</p>
      <ul className="space-y-2 list-disc pl-5 mt-3">
        <li><strong className="text-stone">Order details</strong> — your name, email address, phone number (optional), delivery address, what you ordered, and the amount and status of your payment.</li>
        <li><strong className="text-stone">Payment</strong> — handled entirely by Stripe on its own secure page. We never see or store your card number. Stripe tells us whether payment succeeded.</li>
      </ul>
      <p className="mt-3"><strong className="text-stone">Why, and our lawful basis.</strong> To take payment, make and deliver your order and handle returns (contract, Art. 6(1)(b)); to keep accounting and tax records (legal obligation, Art. 6(1)(c)); and to prevent fraud and keep the shop secure (legitimate interests, Art. 6(1)(f)). Order and dispatch emails are service messages about your purchase. We only send marketing, including our newsletter, if you separately subscribe.</p>
      <p className="mt-3"><strong className="text-stone">Who receives it.</strong></p>
      <ul className="space-y-2 list-disc pl-5 mt-3">
        <li><strong className="text-stone">Stripe</strong> — payment processing and fraud prevention.</li>
        <li><strong className="text-stone">Printify</strong>, and the print provider and delivery carrier it uses for your order — they need your name, delivery address, email and phone number to make and deliver it. [CONFIRM: link Printify&apos;s privacy policy and confirm which of these are independent controllers.]</li>
        <li>Our existing providers (Supabase, SendGrid/Resend, Vercel) host the order records and send order emails.</li>
      </ul>
      <p className="mt-3">Printify and its print providers may be located outside the UK. [CONFIRM: the transfer safeguard relied on — for example the UK IDTA or the UK Extension to the EU–US Data Privacy Framework.]</p>
      <p className="mt-3"><strong className="text-stone">How long.</strong> We keep order records for [CONFIRM: 6 years, to meet UK tax and accounting requirements], then delete or anonymise them.</p>
      <p className="mt-3">Your rights are described below. For shop privacy requests, contact <a className="text-crimson hover:underline" href={`mailto:${supportEmail()}`}>{supportEmail()}</a> or see <Link href="/contact" className="text-crimson hover:underline">Contact</Link>.</p>
    </section>
  )
}
