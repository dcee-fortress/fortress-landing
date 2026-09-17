export const RESTRICTED_AREA_USERNAME = "Rodcroft"
export const RESTRICTED_AREA_PASSWORD = "Rodcroft@2026"
export const RESTRICTED_AREA_SESSION_KEY = "grove-restricted-area-auth"

export function isRestrictedAreaUnlocked() {
  if (typeof window === "undefined") return false
  try {
    return window.sessionStorage.getItem(RESTRICTED_AREA_SESSION_KEY) === "1"
  } catch {
    return false
  }
}

export function unlockRestrictedArea() {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(RESTRICTED_AREA_SESSION_KEY, "1")
  } catch {
    // Ignore storage failures; the in-memory unlock still works for this visit.
  }
}

export function validateRestrictedAreaCredentials(username, password) {
  return (
    String(username || "").trim() === RESTRICTED_AREA_USERNAME &&
    String(password || "") === RESTRICTED_AREA_PASSWORD
  )
}
