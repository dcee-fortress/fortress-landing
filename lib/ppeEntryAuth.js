/** Login for PPE received / PPE issued entry pages only. */
export const PPE_ENTRY_USERNAME = "Rodcroft"
export const PPE_ENTRY_PASSWORD = "RodcroftSHE@2026"
export const PPE_ENTRY_REMEMBER_KEY = "grove-ppe-entry-remember"

function canUseStorage() {
  return typeof window !== "undefined"
}

export function isPpeEntryRemembered() {
  if (!canUseStorage()) return false
  try {
    return window.localStorage.getItem(PPE_ENTRY_REMEMBER_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * @param {{ remember?: boolean }} [options]
 */
export function unlockPpeEntry(options = {}) {
  if (!canUseStorage()) return
  const remember = Boolean(options.remember)
  try {
    if (remember) {
      window.localStorage.setItem(PPE_ENTRY_REMEMBER_KEY, "1")
    } else {
      window.localStorage.removeItem(PPE_ENTRY_REMEMBER_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export function clearPpeEntryRemember() {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(PPE_ENTRY_REMEMBER_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function validatePpeEntryCredentials(username, password) {
  return (
    String(username || "").trim() === PPE_ENTRY_USERNAME &&
    String(password || "") === PPE_ENTRY_PASSWORD
  )
}
