import { BASE } from '@/lib/seo/config'
import { shopEnabled } from '@/lib/shop/config'

/**
 * "The shop is open" block for the welcome emails (light card style). Empty when
 * the shop is switched off, so an email can never link to a closed shop.
 */
export function shopPromoRowHtml(): string {
  if (!shopEnabled()) return ''
  return `
      <!-- Shop news -->
      <tr>
        <td style="padding:0 32px 32px;">
          <div style="border:1px solid #f0d4da;background:#fdf4f6;border-radius:10px;padding:22px 24px;text-align:center;">
            <p style="color:#be123c;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin:0 0 8px;">New</p>
            <p style="color:#222;font-family:Georgia,serif;font-size:19px;font-weight:700;margin:0 0 8px;">The Listen True Crime shop is open</p>
            <p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Tees, hoodies, sweatshirts, mugs and tote bags for people who can't stop listening, printed to order in the UK.
            </p>
            <a href="${BASE}/shop"
               style="display:inline-block;background:#be123c;color:#ffffff;font-weight:600;font-size:14px;padding:11px 26px;border-radius:8px;text-decoration:none;">
              Visit the shop
            </a>
          </div>
        </td>
      </tr>
`
}
