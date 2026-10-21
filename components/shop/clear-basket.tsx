'use client'
import { useEffect } from 'react'
import { basket } from './basket-store'

/** Empties the basket once the customer lands on the post-payment page. */
export function ClearBasket() {
  useEffect(() => { basket.clear() }, [])
  return null
}
