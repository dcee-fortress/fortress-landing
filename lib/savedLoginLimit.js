/**
 * A saved ("remembered") login opens its area automatically only this many
 * times per device. After that the login form is shown again, and entering the
 * details renews another batch of automatic openings.
 */
export const SAVED_LOGIN_AUTO_OPEN_LIMIT = 20

function canUseStorage() {
  return typeof window !== "undefined"
}

function countKey(rememberKey) {
  return `${rememberKey}-auto-opens`
}

export function getSavedLoginStatus(rememberKey) {
  const empty = { saved: false, used: 0, left: 0, renewalDue: false }
  if (!canUseStorage() || !rememberKey) return empty
  try {
    const saved = window.localStorage.getItem(rememberKey) === "1"
    const used = Math.max(0, Number.parseInt(window.localStorage.getItem(countKey(rememberKey)) || "0", 10) || 0)
    const left = Math.max(0, SAVED_LOGIN_AUTO_OPEN_LIMIT - used)
    return { saved, used, left, renewalDue: saved && left === 0 }
  } catch {
    return empty
  }
}

/** True while a saved login still has automatic openings left. */
export function canAutoOpenSavedLogin(rememberKey) {
  const status = getSavedLoginStatus(rememberKey)
  return status.saved && status.left > 0
}

/** Uses one automatic opening. Returns how many are left afterwards. */
export function recordSavedLoginAutoOpen(rememberKey) {
  const status = getSavedLoginStatus(rememberKey)
  if (!status.saved || status.left === 0) return 0
  try {
    window.localStorage.setItem(countKey(rememberKey), String(status.used + 1))
  } catch {
    // Ignore storage failures.
  }
  return status.left - 1
}

export function resetSavedLoginAutoOpens(rememberKey) {
  if (!canUseStorage() || !rememberKey) return
  try {
    window.localStorage.removeItem(countKey(rememberKey))
  } catch {
    // Ignore storage failures.
  }
}
