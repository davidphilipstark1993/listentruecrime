'use client'
import type { createClient } from './client'

type BrowserClient = ReturnType<typeof createClient>

let clientPromise: Promise<BrowserClient> | null = null

/**
 * The browser Supabase client, loaded on first use instead of at page load.
 * supabase-js is ~85 kB of JavaScript; widgets that only need it after
 * hydration (auth state, saving a rating) call this so it stays out of the
 * first-load bundle. One shared instance per page.
 */
export function getSupabase(): Promise<BrowserClient> {
  clientPromise ??= import('./client').then(m => m.createClient())
  return clientPromise
}
