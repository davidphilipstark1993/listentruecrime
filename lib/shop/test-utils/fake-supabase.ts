// A tiny in-memory stand-in for the parts of supabase-js the shop uses, so the
// order lifecycle (idempotency, compare-and-swap claims) can be tested without a
// database. Supports: insert / upsert / update / delete / select with
// eq, neq, is, in, not, lt, lte, order, limit, single, maybeSingle, or-less.

type Row = Record<string, any>
type Filter = (r: Row) => boolean

const UNIQUE: Record<string, string[][]> = {
  shop_orders: [['stripe_checkout_session_id'], ['printify_order_id'], ['order_number']],
  shop_webhook_events: [['provider', 'event_id']],
  shop_shipments: [['order_id', 'tracking_number']],
}

export function createFakeDb() {
  const tables: Record<string, Row[]> = {}
  let idCounter = 0
  let orderSeq = 10000
  const table = (n: string) => (tables[n] ??= [])

  function violatesUnique(name: string, rows: Row[], candidate: Row, ignore?: Row) {
    return (UNIQUE[name] ?? []).some(cols =>
      cols.every(c => candidate[c] != null) &&
      rows.some(r => r !== ignore && cols.every(c => r[c] === candidate[c])))
  }

  function builder(name: string) {
    const filters: Filter[] = []
    let op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
    let payload: any = null
    let onConflict: string | undefined
    let wantRows = false
    let limitN: number | undefined
    let orderBy: { col: string; asc: boolean } | undefined

    const run = (): { data: any; error: any } => {
      const rows = table(name)
      if (op === 'insert' || op === 'upsert') {
        const list: Row[] = Array.isArray(payload) ? payload : [payload]
        const out: Row[] = []
        for (const item of list) {
          const row: Row = { id: `id_${++idCounter}`, created_at: new Date().toISOString(), ...item }
          if (name === 'shop_orders') {
            row.order_number ??= `LTC-${++orderSeq}`
            row.payment_status ??= 'pending'; row.fulfilment_status ??= 'awaiting_payment'
            row.fulfilment_attempts ??= 0; row.refunded_pence ??= 0; row.currency ??= 'gbp'
            row.printify_order_id ??= null; row.confirmation_email_sent_at ??= null
            row.stripe_checkout_session_id ??= null; row.printify_sent_to_production_at ??= null
          }
          if (name === 'shop_shipments') { row.email_sent_at ??= null }
          if (violatesUnique(name, rows, row)) {
            if (op === 'upsert' && onConflict) {
              const cols = onConflict.split(',')
              const existing = rows.find(r => cols.every(c => r[c] === row[c]))
              if (existing) { Object.assign(existing, item); out.push(existing); continue }
            }
            return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
          }
          rows.push(row); out.push(row)
        }
        return { data: out, error: null }
      }
      let matched = rows.filter(r => filters.every(f => f(r)))
      if (op === 'update') {
        // Single-threaded JS makes this atomic, like Postgres' row-level UPDATE ... WHERE.
        for (const r of matched) {
          const next = { ...r, ...payload }
          if (violatesUnique(name, rows, next, r)) return { data: null, error: { code: '23505', message: 'duplicate key' } }
          Object.assign(r, payload)
        }
        return { data: matched, error: null }
      }
      if (op === 'delete') {
        tables[name] = rows.filter(r => !matched.includes(r))
        return { data: matched, error: null }
      }
      if (orderBy) matched = [...matched].sort((a, b) => (a[orderBy!.col] > b[orderBy!.col] ? 1 : -1) * (orderBy!.asc ? 1 : -1))
      if (limitN != null) matched = matched.slice(0, limitN)
      return { data: matched, error: null }
    }

    const q: any = {
      select() { wantRows = true; return q },
      insert(p: any) { op = 'insert'; payload = p; return q },
      upsert(p: any, o?: { onConflict?: string }) { op = 'upsert'; payload = p; onConflict = o?.onConflict; return q },
      update(p: any) { op = 'update'; payload = p; return q },
      delete() { op = 'delete'; return q },
      eq(c: string, v: any) { filters.push(r => r[c] === v); return q },
      neq(c: string, v: any) { filters.push(r => r[c] !== v); return q },
      is(c: string, v: any) { filters.push(r => (r[c] ?? null) === v); return q },
      in(c: string, v: any[]) { filters.push(r => v.includes(r[c])); return q },
      not(c: string, o: string, v: any) { filters.push(r => (o === 'is' ? (r[c] ?? null) !== v : !String(v).replace(/[()]/g, '').split(',').includes(r[c]))); return q },
      lt(c: string, v: any) { filters.push(r => r[c] != null && r[c] < v); return q },
      lte(c: string, v: any) { filters.push(r => r[c] != null && r[c] <= v); return q },
      order(col: string, o?: { ascending?: boolean }) { orderBy = { col, asc: o?.ascending ?? true }; return q },
      limit(n: number) { limitN = n; return q },
      single() { const r = run(); return Promise.resolve({ data: r.data?.[0] ? { ...r.data[0] } : null, error: r.error ?? (r.data?.[0] ? null : { message: 'not found' }) }) },
      maybeSingle() { const r = run(); return Promise.resolve({ data: r.data?.[0] ? { ...r.data[0] } : null, error: r.error }) },
      then(resolve: any, reject: any) {
        const r = run()
        // supabase-js returns rows for insert/update only when .select() was chained
        // Rows are copied so callers never hold live references into the "database".
        const copy = (d: any) => (Array.isArray(d) ? d.map(x => ({ ...x })) : d)
        const shaped = (op === 'select' || wantRows) ? { data: copy(r.data), error: r.error } : { data: null, error: r.error }
        return Promise.resolve(shaped).then(resolve, reject)
      },
    }
    return q
  }

  return { tables, client: { from: (n: string) => builder(n) } }
}
