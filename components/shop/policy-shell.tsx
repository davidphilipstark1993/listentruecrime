import Link from 'next/link'
import type { ReactNode } from 'react'

export function PolicyShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-xs text-stone-subtle">
        <Link href="/" className="hover:text-stone">Home</Link><span>/</span>
        <Link href="/shop" className="hover:text-stone">Shop</Link><span>/</span>
        <span className="text-stone-muted">{title}</span>
      </nav>
      <h1 className="heading-display mb-3 text-3xl sm:text-4xl">{title}</h1>
      <p className="mb-10 text-sm text-stone-subtle">Last updated: {updated}</p>
      <div className="space-y-10 text-sm leading-relaxed text-stone-muted [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-stone [&_strong]:text-stone [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_a]:text-crimson [&_a:hover]:underline">
        {children}
      </div>
    </section>
  )
}
