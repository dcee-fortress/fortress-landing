const LOCAL_WRITE_GRACE_MS = 30000
const recentLocalWrites = new Map()

export function markSharedStorageLocalWrite(key) {
  if (!key) return
  recentLocalWrites.set(key, Date.now())
}

export function wasRecentlyWrittenLocally(key) {
  const writtenAt = recentLocalWrites.get(key)
  if (!writtenAt) return false
  return Date.now() - writtenAt < LOCAL_WRITE_GRACE_MS
}
