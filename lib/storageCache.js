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
    if (typeof window === "undefined") return Promise.resolve()

    const serialized = JSON.stringify(store)
    const currentRaw = window.localStorage.getItem(storageKey)
    if (serialized === currentRaw) {
      cache = store
      cacheRaw = serialized
      return Promise.resolve()
    }

    return import("@/lib/saveToPostgres")
      .then(({ saveGroveKey }) => saveGroveKey(storageKey, serialized, { replace: true }))
      .then((saved) => {
        cache = store
        cacheRaw = saved
      })
  }

  function invalidate() {
    cache = null
    cacheRaw = null
  }

  return { read, write, invalidate }
}
