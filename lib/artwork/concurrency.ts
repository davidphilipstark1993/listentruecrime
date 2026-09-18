/**
 * Runs `worker` over `items` with at most `limit` in flight at once — a
 * minimal stand-in for a library like p-limit, written in-house to avoid
 * adding a dependency for something this small. One item throwing does not
 * stop the others; failures are returned alongside successes so the caller
 * decides how to report them.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<Array<{ item: T; result: R } | { item: T; error: unknown }>> {
  const results: Array<{ item: T; result: R } | { item: T; error: unknown }> = new Array(items.length)
  let cursor = 0

  async function run() {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      try {
        results[index] = { item, result: await worker(item, index) }
      } catch (error) {
        results[index] = { item, error }
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run)
  await Promise.all(workers)
  return results
}
