import { z } from 'zod'
import { MAX_BASKET_LINES, MAX_LINE_QUANTITY } from './config'

// The only things the browser may tell us about a basket: which variant and how many.
export const cartSchema = z.object({
  items: z
    .array(z.object({
      variantId: z.string().uuid(),
      quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
    }))
    .min(1)
    .max(MAX_BASKET_LINES),
})
export type CartPayload = z.infer<typeof cartSchema>
