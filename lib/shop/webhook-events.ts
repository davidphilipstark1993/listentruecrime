import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Webhook de-duplication keyed on the provider's own event id.
 *   new       first time we have seen it → process it
 *   retry     seen before but never finished (we crashed/errored) → process again
 *   duplicate already fully processed → acknowledge and do nothing
 */
export async function claimWebhookEvent(provider: 'stripe' | 'printify', eventId: string, type: string, livemode?: boolean): Promise<'new' | 'retry' | 'duplicate'> {
  const admin = createAdminClient()
  let { error } = await admin.from('shop_webhook_events').insert({ provider, event_id: eventId, type, ...(livemode === undefined ? {} : { livemode }) })
  // The `livemode` column arrives with migration 021. If the code is deployed a
  // moment before the migration is run, never fail a payment webhook over it.
  if (error && livemode !== undefined && (error.code === '42703' || error.code === 'PGRST204' || /livemode/.test(error.message ?? ''))) {
    ;({ error } = await admin.from('shop_webhook_events').insert({ provider, event_id: eventId, type }))
  }
  if (!error) return 'new'
  if (error.code !== '23505') throw new Error(`webhook event insert failed: ${error.message}`)
  const { data } = await admin.from('shop_webhook_events').select('processed_at').eq('provider', provider).eq('event_id', eventId).maybeSingle()
  return data?.processed_at ? 'duplicate' : 'retry'
}

export async function finishWebhookEvent(provider: 'stripe' | 'printify', eventId: string, error?: string) {
  const admin = createAdminClient()
  await admin
    .from('shop_webhook_events')
    .update(error ? { error } : { processed_at: new Date().toISOString(), error: null })
    .eq('provider', provider)
    .eq('event_id', eventId)
}
