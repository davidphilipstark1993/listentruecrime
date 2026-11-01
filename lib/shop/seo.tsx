export { productUrl, productJsonLd, itemListJsonLd, shippingDetailsJsonLd, returnPolicyJsonLd } from './product-schema'

export function JsonLd({ data }: { data: unknown }) {
  // JSON.stringify output is safe in a script tag except for "</script"; escape "<".
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}
