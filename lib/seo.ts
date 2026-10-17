import { BASE } from '@/lib/seo/config'

// Single canonical base URL lives in lib/seo/config; the site-wide
// Organization and WebSite JSON-LD live in app/layout.tsx.
export { BASE }

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
