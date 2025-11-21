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

  const keysToDelete: string[] = []
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key)
    }
  })
  
  keysToDelete.forEach(key => cache.delete(key))
}

// Таймаут для запросов (10 секунд)
const REQUEST_TIMEOUT_MS = 10_000

// Обертка с таймаутом
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    }),
  ])
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
      // Если есть незавершенный запрос, используем его, но с таймаутом
      return withTimeout(existing.promise, REQUEST_TIMEOUT_MS).catch((error) => {
        // Если запрос завис, удаляем его из кеша
        cache.delete(key)
        throw error
      })
    }
  }

  // Добавляем таймаут к новому запросу
  const promise = withTimeout(fetcher(), REQUEST_TIMEOUT_MS)
    .then((value) => {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    })
    .catch((error) => {
      cache.delete(key)
      // Не логируем таймауты как критические ошибки
      if (error.message?.includes('timeout')) {
        console.warn(`Request timeout for key: ${key}`)
      }
      throw error
    })

  cache.set(key, {
    value: existing?.value,
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}

