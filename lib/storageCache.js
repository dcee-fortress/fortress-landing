import { getGroveItem } from "@/lib/groveClientStore"
import { wasRecentlyWrittenLocally } from "@/lib/sharedStorageGuard"

export function createLocalStorageCache(storageKey, emptyValue = {}) {
  let cache = null
  let cacheRaw = null
  // Set only by write(), before the store has the new value. A remote snapshot
  // updates the store without setting this, so it must replace a stale cache.
  let pendingRaw = null

  function read() {
    if (typeof window === "undefined") {
      return emptyValue
    }

    try {
      const raw = getGroveItem(storageKey)
      if (cache !== null && raw === cacheRaw) {
        if (pendingRaw === raw) pendingRaw = null
        return cache
      }

      if (
        cache !== null &&
        pendingRaw != null &&
        raw !== pendingRaw &&
        wasRecentlyWrittenLocally(storageKey)
      ) {
        return cache
      }

      pendingRaw = null
      const parsed = raw ? JSON.parse(raw) : emptyValue
      cache = parsed
      cacheRaw = raw
      return parsed
    } catch {
      return emptyValue
    }
  }

  function write(nextStore, options = {}) {
    if (typeof window === "undefined") return Promise.resolve()

    const serialized = JSON.stringify(nextStore)
    const currentRaw = getGroveItem(storageKey)
    if (serialized === currentRaw) {
      cache = nextStore
      cacheRaw = serialized
      return Promise.resolve()
    }

    // Keep in-memory cache in sync immediately so UI reloads cannot wipe the write.
    cache = nextStore
    cacheRaw = serialized
    pendingRaw = serialized

    return import("@/lib/saveToPostgres")
      .then(({ saveGroveKey }) =>
        saveGroveKey(storageKey, serialized, {
          replace: options.replace !== false,
        })
      )
      .then((saved) => {
        cache = nextStore
        cacheRaw = typeof saved === "string" ? saved : serialized
      })
  }

  function invalidate() {
    cache = null
    cacheRaw = null
    pendingRaw = null
  }

  return { read, write, invalidate }
}
