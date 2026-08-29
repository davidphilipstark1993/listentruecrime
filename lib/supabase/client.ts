'use client'
import { createBrowserClient } from '@supabase/ssr'
import { sanitizeEnv } from '@/lib/utils'

export function createClient() {
  return createBrowserClient(
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  )
}
