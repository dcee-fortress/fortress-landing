const DB_NAME = "grove-progress-photos"
const STORE_NAME = "photos"
const DB_VERSION = 1

function openPhotoDb() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Photo storage is not available in this browser"))
      return
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error("Could not open photo storage"))
  })
}

function withStore(mode, executor) {
  return openPhotoDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode)
        const store = transaction.objectStore(STORE_NAME)

        transaction.oncomplete = () => {
          db.close()
        }
        transaction.onerror = () => {
          db.close()
          reject(transaction.error || new Error("Photo storage failed"))
        }

        try {
          executor(store, resolve, reject)
        } catch (error) {
          db.close()
          reject(error)
        }
      })
  )
}

export function putProgressPhotoRecord(record) {
  if (!record?.id) return Promise.resolve()

  return withStore("readwrite", (store, resolve, reject) => {
    const request = store.put(record)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function getProgressPhotoRecord(id) {
  if (!id) return Promise.resolve(null)

  return withStore("readonly", (store, resolve, reject) => {
    const request = store.get(id)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

export function deleteProgressPhotoRecord(id) {
  if (!id) return Promise.resolve()

  return withStore("readwrite", (store, resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export function clearProgressPhotoStore() {
  if (typeof window === "undefined" || !window.indexedDB) return Promise.resolve()

  return withStore("readwrite", (store, resolve, reject) => {
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
