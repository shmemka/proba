type CacheEntry<T> = {
  value?: T
  expiresAt: number
  promise?: Promise<T>
}

const cache = new Map<string, CacheEntry<unknown>>()

const DEFAULT_TTL = 30_000 // 30 секунд

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear()
    return
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL,
  force?: boolean,
): Promise<T> {
  const now = Date.now()
  const existing = cache.get(key) as CacheEntry<T> | undefined

  if (!force && existing) {
    if (existing.value !== undefined && existing.expiresAt > now) {
      return existing.value
    }
    if (existing.promise) {
      return existing.promise
    }
  }

  const promise = fetcher()
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    })
    .catch((error) => {
      cache.delete(key)
      throw error
    })

  cache.set(key, {
    value: existing?.value,
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}

