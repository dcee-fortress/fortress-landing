export function createLocalStorageCache(storageKey, emptyValue = {}) {
  let cache = null
  let cacheRaw = null

  function read() {
    if (typeof window === "undefined") {
      return emptyValue
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
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

  function write(store) {
    if (typeof window === "undefined") return

    const serialized = JSON.stringify(store)
    window.localStorage.setItem(storageKey, serialized)
    cache = store
    cacheRaw = serialized
  }

  function invalidate() {
    cache = null
    cacheRaw = null
  }

  return { read, write, invalidate }
}
