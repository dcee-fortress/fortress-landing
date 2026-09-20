import { getGroveItem } from "@/lib/groveClientStore"

export function createLocalStorageCache(storageKey, emptyValue = {}) {
  let cache = null
  let cacheRaw = null

  function read() {
    if (typeof window === "undefined") {
      return emptyValue
    }

    try {
      const raw = getGroveItem(storageKey)
      if (cache !== null && raw === cacheRaw) {
        return cache
      }

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
  }

  return { read, write, invalidate }
}
