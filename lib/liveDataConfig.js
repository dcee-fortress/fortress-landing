export const LIVE_SHARED_STORAGE_URL =
  process.env.GROVE_LIVE_DATA_URL ||
  "https://rodcroft-fortress.vercel.app/api/shared-storage"

export function shouldSyncLiveData() {
  const flag = process.env.GROVE_SYNC_LIVE_DATA
  if (flag === "0" || flag === "false") return false
  if (flag === "1" || flag === "true") return true
  // Local Cursor talks to the published live store. The live site uses its own database.
  return !process.env.VERCEL
}

export function isLocalCodeChannel() {
  return process.env.NEXT_PUBLIC_GROVE_CODE_CHANNEL !== "live"
}
