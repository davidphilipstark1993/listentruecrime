import { AdForm } from '@/components/admin/ad-form'

export default function NewAdPage() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <h1 className="heading-display text-2xl mb-6">New advert</h1>
      <AdForm />
    </div>
  )
}
