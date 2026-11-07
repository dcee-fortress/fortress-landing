/** Local persistence: SQLite via Electron IPC, or browser localStorage on the web. */

const electronStorage = () =>
  typeof window !== 'undefined' && window.electronAPI?.storage ? window.electronAPI.storage : null

let migrated = false

const migrateFromLocalStorage = (api) => {
  if (migrated || typeof window === 'undefined' || !window.localStorage) return
  migrated = true
  try {
    const existing = api.keys?.() || []
    if (existing.length) return
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith('fortress-')) continue
      const value = window.localStorage.getItem(key)
      if (value != null) api.setItem(key, value)
    }
  } catch {
    /* ignore migration errors */
  }
}

const backend = () => {
  const api = electronStorage()
  if (api) {
    migrateFromLocalStorage(api)
    return api
  }
  return typeof window !== 'undefined' ? window.localStorage : null
}

export const isElectronApp = () => Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron)

export const storage = {
  getItem(key) {
    try {
      return backend()?.getItem(String(key)) ?? null
    } catch {
      return null
    }
  },
  setItem(key, value) {
    try {
      backend()?.setItem(String(key), value == null ? '' : String(value))
    } catch {
      /* ignore quota / ipc errors */
    }
  },
  removeItem(key) {
    try {
      backend()?.removeItem(String(key))
    } catch {
      /* ignore */
    }
  },
  clear() {
    try {
      backend()?.clear?.()
    } catch {
      /* ignore */
    }
  },
}

export default storage
