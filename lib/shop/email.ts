import { BASE } from '@/lib/seo/config'
import { sanitizeEnv } from '@/lib/utils'
import { formatGBP } from './money'
import { supportEmail } from './config'
import type { ShippingAddress, ShopOrderItemRow, ShopOrderRow, ShopShipmentRow } from './types'

// Transactional email for the shop. Same provider-selection pattern as
// lib/email/adminNotify.ts (SendGrid if configured, otherwise Resend), but with
// no unsubscribe group: these are service messages about an order the customer
// placed, not marketing.

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export async function sendShopEmail(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const sendgridKey = process.env.SENDGRID_API_KEY ? sanitizeEnv(process.env.SENDGRID_API_KEY) : undefined
  const resendKey = process.env.RESEND_API_KEY ? sanitizeEnv(process.env.RESEND_API_KEY) : undefined

  if (sendgridKey) {
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ? sanitizeEnv(process.env.SENDGRID_FROM_EMAIL) : 'info@listentruecrime.com'
    const fromName = process.env.SENDGRID_FROM_NAME ? sanitizeEnv(process.env.SENDGRID_FROM_NAME) : 'Listen True Crime'
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: fromEmail, name: fromName },
        reply_to: { email: supportEmail() },
        subject: opts.subject,
        content: [
          { type: 'text/plain', value: opts.text },
          { type: 'text/html', value: opts.html },
        ],
      }),
    })
    if (!res.ok) throw new Error(`SendGrid mail/send error ${res.status}: ${await res.text()}`)
    return
  }

  if (resendKey) {
    const fromEmail = process.env.RESEND_FROM_EMAIL ? sanitizeEnv(process.env.RESEND_FROM_EMAIL) : 'hello@listentruecrime.com'
    const fromName = process.env.RESEND_FROM_NAME ? sanitizeEnv(process.env.RESEND_FROM_NAME) : 'ListenTrueCrime'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${fromName} <${fromEmail}>`, to: [opts.to], reply_to: supportEmail(), subject: opts.subject, html: opts.html, text: opts.text }),
    })
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`)
    return
  }

  throw new Error('No email provider configured (SENDGRID_API_KEY or RESEND_API_KEY)')
}

function addressLines(a: ShippingAddress | null): string[] {
  if (!a) return []
  return [a.name, a.line1, a.line2, a.city, a.state, a.postal_code, a.country].filter((x): x is string => Boolean(x))
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en-GB"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f7;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">
<tr><td style="background:#111118;padding:28px 32px;text-align:center;">
<a href="${BASE}/shop" style="color:#ffffff;font-family:Georgia,serif;font-size:22px;font-weight:700;text-decoration:none;">Listen True Crime</a>
<p style="color:#be123c;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:8px 0 0;">The Shop</p>
</td></tr>
<tr><td style="padding:28px 32px;color:#333;font-size:15px;line-height:1.6;">${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
<p style="color:#999;font-size:12px;margin:0 0 6px;">Questions about your order? Reply to this email or write to <a href="mailto:${esc(supportEmail())}" style="color:#be123c;">${esc(supportEmail())}</a>.</p>
<p style="color:#bbb;font-size:11px;margin:0;">© ${new Date().getFullYear()} ListenTrueCrime · <a href="${BASE}/shop/returns-and-refunds" style="color:#be123c;text-decoration:none;">Returns</a> · <a href="${BASE}/shop/shipping-policy" style="color:#be123c;text-decoration:none;">Shipping</a></p>
</td></tr></table></td></tr></table></body></html>`
}

function itemsTable(items: ShopOrderItemRow[]): string {
  const rows = items.map(i => `<tr>
<td style="padding:8px 0;border-bottom:1px solid #eee;">${esc(i.product_title)}<br /><span style="color:#777;font-size:13px;">${esc(i.colour)} / ${esc(i.size)} × ${i.quantity}</span></td>
<td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;white-space:nowrap;">${formatGBP(i.unit_price_pence * i.quantity)}</td></tr>`).join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>`
}

export function buildOrderConfirmationEmail(order: ShopOrderRow, items: ShopOrderItemRow[]) {
  const addr = addressLines(order.shipping_address)
  const subject = `Your Listen True Crime order ${order.order_number}`
  const html = shell(subject, `
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;color:#111118;">Thanks, ${esc(order.customer_name?.split(' ')[0] ?? 'detective')}. Order received.</h1>
<p style="margin:0 0 16px;">We have your payment and your order is being prepared. Everything is printed to order, so it is made after you buy rather than taken off a shelf. We will email you again with tracking as soon as it is dispatched.</p>
<p style="margin:0 0 4px;"><strong>Order number:</strong> ${esc(order.order_number)}</p>
<div style="margin:16px 0;">${itemsTable(items)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
<tr><td>Subtotal</td><td style="text-align:right;">${formatGBP(order.subtotal_pence)}</td></tr>
<tr><td>Delivery</td><td style="text-align:right;">${formatGBP(order.shipping_pence)}</td></tr>
<tr><td style="padding-top:6px;"><strong>Total paid</strong></td><td style="text-align:right;padding-top:6px;"><strong>${formatGBP(order.total_pence)}</strong></td></tr></table>
<p style="margin:0 0 4px;"><strong>Delivering to</strong></p>
<p style="margin:0 0 16px;color:#555;">${addr.map(esc).join('<br />')}</p>
<p style="margin:0;color:#555;font-size:13px;">You can read our <a href="${BASE}/shop/shipping-policy" style="color:#be123c;">shipping</a> and <a href="${BASE}/shop/returns-and-refunds" style="color:#be123c;">returns</a> policies at any time. Keep this email as your receipt.</p>`)
  const text = [
    `Thanks${order.customer_name ? `, ${order.customer_name.split(' ')[0]}` : ''}. We have your payment for order ${order.order_number}.`,
    '',
    ...items.map(i => `- ${i.product_title} (${i.colour} / ${i.size}) x${i.quantity}: ${formatGBP(i.unit_price_pence * i.quantity)}`),
    '',
    `Subtotal: ${formatGBP(order.subtotal_pence)}`,
    `Delivery: ${formatGBP(order.shipping_pence)}`,
    `Total paid: ${formatGBP(order.total_pence)}`,
    '',
    'Delivering to:',
    ...addr,
    '',
    `Everything is printed to order. We will email you tracking details when it is dispatched.`,
    `Questions? Contact ${supportEmail()}.`,
  ].join('\n')
  return { subject, html, text }
}

export function buildDispatchEmail(order: ShopOrderRow, shipment: ShopShipmentRow) {
  const subject = `Your order ${order.order_number} is on its way`
  const link = shipment.tracking_url
    ? `<p style="margin:16px 0;"><a href="${esc(shipment.tracking_url)}" style="display:inline-block;background:#be123c;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Track your parcel</a></p>`
    : ''
  const html = shell(subject, `
<h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 12px;color:#111118;">Your order has been dispatched</h1>
<p style="margin:0 0 12px;">Order <strong>${esc(order.order_number)}</strong> has left the print room.</p>
<p style="margin:0 0 4px;"><strong>Carrier:</strong> ${esc(shipment.carrier ?? 'See tracking link')}</p>
<p style="margin:0 0 4px;"><strong>Tracking number:</strong> ${esc(shipment.tracking_number)}</p>
${link}
<p style="margin:0;color:#555;font-size:13px;">Tracking can take a little while to update after dispatch. If your order is split across several parcels you will get a separate email for each one.</p>`)
  const text = [
    `Your order ${order.order_number} has been dispatched.`,
    `Carrier: ${shipment.carrier ?? 'see tracking link'}`,
    `Tracking number: ${shipment.tracking_number}`,
    shipment.tracking_url ? `Track it: ${shipment.tracking_url}` : '',
    '',
    'If your order is split across several parcels you will get a separate email for each one.',
    `Questions? Contact ${supportEmail()}.`,
  ].filter(Boolean).join('\n')
  return { subject, html, text }
}
