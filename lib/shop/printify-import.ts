import type { PrintifyProduct } from './printify'

export interface ImportedVariant {
  printify_variant_id: number
  sku: string | null
  colour: string
  colour_hex: string | null
  size: string
  cost_minor: number | null
  is_enabled: boolean
}

/**
 * Maps a Printify product's option ids onto our colour/size columns using only
 * what Printify returned. Selling prices are deliberately NOT imported: they are
 * set by you in the admin (Printify's own `price` is in the store currency and
 * is not necessarily what you want to charge in GBP).
 */
export function importVariants(p: PrintifyProduct): ImportedVariant[] {
  const valueById = new Map<number, { option: string; type: string; title: string; hex: string | null }>()
  for (const o of p.options ?? []) for (const v of o.values ?? []) valueById.set(v.id, { option: o.name, type: o.type, title: v.title, hex: v.colors?.[0] ?? null })

  return (p.variants ?? []).map(v => {
    const vals = (v.options ?? []).map(id => valueById.get(id)).filter((x): x is NonNullable<typeof x> => Boolean(x))
    const colour = vals.find(x => x.type === 'color')
    const rest = vals.filter(x => x.type !== 'color')
    return {
      printify_variant_id: v.id,
      sku: v.sku ?? null,
      colour: colour?.title ?? 'Default',
      colour_hex: colour?.hex ?? null,
      size: rest.length ? rest.map(r => r.title).join(' / ') : 'One size',
      cost_minor: typeof v.cost === 'number' ? v.cost : null,
      is_enabled: v.is_enabled && v.is_available !== false,
    }
  })
}
