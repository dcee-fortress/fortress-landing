export const SYNC_STATUS_EVENT = "grove-sync-status"

export function emitSyncStatus(detail = {}) {
  if (typeof window === "undefined") return

  const next = {
    state: "idle",
    source: "Postgres",
    message: "",
    lastSync: null,
    postgresAt: 0,
    cacheAt: 0,
    silent: false,
    ...window.__groveSyncStatus,
    ...detail,
    silent: detail.silent === true,
  }
  window.__groveSyncStatus = next
  window.dispatchEvent(new CustomEvent(SYNC_STATUS_EVENT, { detail: next }))
}
