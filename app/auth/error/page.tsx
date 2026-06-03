import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function AuthErrorPage() {
  return (
    <>
      <Header />
      <main className="max-w-md mx-auto px-4 pt-32 pb-16 text-center">
        <div className="w-16 h-16 rounded-full bg-crimson/10 border border-crimson/20 flex items-center justify-center mx-auto mb-6">
          <span className="text-2xl">✉️</span>
        </div>
        <h1 className="font-serif text-2xl text-stone mb-3">Link expired or already used</h1>
        <p className="text-stone-muted text-sm mb-6 leading-relaxed">
          Magic links expire after 1 hour and can only be used once. Please request a new one.
        </p>
        <Link href="/" className="btn-primary inline-flex">
          Back to home — sign in again
        </Link>
      </main>
      <Footer />
    </>
  )
}
