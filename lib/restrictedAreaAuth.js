/**
 * Material Schedule credentials — master key for every login form on the site.
 * Domain logins (Safety & Health, Finance) also accept these credentials.
 */
export const RESTRICTED_AREA_USERNAME = "Rodcroft"
export const RESTRICTED_AREA_PASSWORD = "Rodcroft@2026"
/** @deprecated alias for master username */
export const MASTER_KEY_USERNAME = RESTRICTED_AREA_USERNAME
/** @deprecated alias for master password */
export const MASTER_KEY_PASSWORD = RESTRICTED_AREA_PASSWORD
/** Legacy session unlock — no longer used for auto-open. */
export const RESTRICTED_AREA_SESSION_KEY = "grove-restricted-area-auth"
/** Only set when the user chooses "Save username and password". */
export const RESTRICTED_AREA_REMEMBER_KEY = "grove-restricted-area-remember"

function canUseStorage() {
  return typeof window !== "undefined"
}

export function isRestrictedAreaRemembered() {
  if (!canUseStorage()) return false
  try {
    // Drop old one-visit session unlock so secure pages always ask unless remembered.
    window.sessionStorage.removeItem(RESTRICTED_AREA_SESSION_KEY)
    return window.localStorage.getItem(RESTRICTED_AREA_REMEMBER_KEY) === "1"
  } catch {
    return false
  }
}

/** @deprecated use isRestrictedAreaRemembered */
export function isRestrictedAreaUnlocked() {
  return isRestrictedAreaRemembered()
}

/**
 * @param {{ remember?: boolean }} [options]
 * Remembered unlock persists across visits. Otherwise nothing is stored.
 */
export function unlockRestrictedArea(options = {}) {
  if (!canUseStorage()) return
  const remember = Boolean(options.remember)
  try {
    window.sessionStorage.removeItem(RESTRICTED_AREA_SESSION_KEY)
    if (remember) {
      window.localStorage.setItem(RESTRICTED_AREA_REMEMBER_KEY, "1")
    } else {
      window.localStorage.removeItem(RESTRICTED_AREA_REMEMBER_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export function clearRestrictedAreaRemember() {
  if (!canUseStorage()) return
  try {
    window.sessionStorage.removeItem(RESTRICTED_AREA_SESSION_KEY)
    window.localStorage.removeItem(RESTRICTED_AREA_REMEMBER_KEY)
  } catch {
    // Ignore storage failures.
  }
}

/** Material Schedule / master-key credentials. */
export function validateRestrictedAreaCredentials(username, password) {
  return (
    String(username || "").trim() === RESTRICTED_AREA_USERNAME &&
    String(password || "") === RESTRICTED_AREA_PASSWORD
  )
}

/** Same as Material Schedule credentials — opens any login form. */
export function validateMasterKeyCredentials(username, password) {
  return validateRestrictedAreaCredentials(username, password)
}
