'use client'
import { useSyncExternalStore } from 'react'
import { MAX_BASKET_LINES, MAX_LINE_QUANTITY } from '@/lib/shop/config'

// Browser basket. Holds ONLY variant ids and quantities — never prices, titles
// or supplier ids. Those are looked up on the server every time the basket is
// shown or checked out, so a tampered localStorage cannot change what is charged.
// Persisted in localStorage so the basket survives refreshes and return visits;
// guest checkout needs no account.

export interface BasketItem { variantId: string; quantity: number }

const KEY = 'ltc_shop_basket_v1'
const EVENT = 'ltc-basket-change'
const EMPTY: BasketItem[] = []

let cache: BasketItem[] | null = null

function read(): BasketItem[] {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    cache = Array.isArray(parsed)
      ? parsed
          .filter(i => i && typeof i.variantId === 'string' && Number.isInteger(i.quantity) && i.quantity > 0)
          .slice(0, MAX_BASKET_LINES)
          .map(i => ({ variantId: i.variantId, quantity: Math.min(i.quantity, MAX_LINE_QUANTITY) }))
      : []
  } catch {
    cache = []
  }
  return cache as BasketItem[]
}

function write(items: BasketItem[]) {
  cache = items
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* private mode: basket lasts for this page view */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; cb() } }
  window.addEventListener(EVENT, cb)
  window.addEventListener('storage', onStorage) // other tabs
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', onStorage) }
}

export function useBasket() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY)
  return { items, count: items.reduce((n, i) => n + i.quantity, 0) }
}

export const basket = {
  add(variantId: string, quantity = 1) {
    const items = [...read()]
    const existing = items.find(i => i.variantId === variantId)
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, MAX_LINE_QUANTITY)
    else if (items.length < MAX_BASKET_LINES) items.push({ variantId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) })
    write(items.map(i => ({ ...i })))
  },
  setQuantity(variantId: string, quantity: number) {
    if (quantity < 1) return basket.remove(variantId)
    write(read().map(i => (i.variantId === variantId ? { ...i, quantity: Math.min(quantity, MAX_LINE_QUANTITY) } : i)))
  },
  remove(variantId: string) {
    write(read().filter(i => i.variantId !== variantId))
  },
  clear() {
    write([])
  },
}
