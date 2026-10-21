import { getShopSettings } from '@/lib/shop/settings'
import { ShopSettingsForm } from '@/components/admin/shop-settings-form'

export const dynamic = 'force-dynamic'

export default async function ShopSettingsPage() {
  return (
    <div className="p-8">
      <h1 className="heading-display mb-1 text-2xl">Shop settings</h1>
      <p className="mb-6 text-sm text-stone-subtle">Money rules used for delivery pricing and profit tracking. API keys are never shown or stored here — they live in Vercel environment variables.</p>
      <ShopSettingsForm settings={await getShopSettings()} />
    </div>
  )
}
