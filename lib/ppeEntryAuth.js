import { validateMasterKeyCredentials } from "@/lib/restrictedAreaAuth"

/** Safety & Health credentials (PPE entry + Safety file deletes). Master key also accepted. */
export const PPE_ENTRY_USERNAME = "Rodcroft"
export const PPE_ENTRY_PASSWORD = "RodcroftSHE@2026"
export const PPE_ENTRY_REMEMBER_KEY = "grove-ppe-entry-remember"
/** Alias used for Safety & Health delete / entry login. */
export const SAFETY_HEALTH_USERNAME = PPE_ENTRY_USERNAME
export const SAFETY_HEALTH_PASSWORD = PPE_ENTRY_PASSWORD

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

function matchesSafetyHealthOnly(username, password) {
  return (
    String(username || "").trim() === PPE_ENTRY_USERNAME &&
    String(password || "") === PPE_ENTRY_PASSWORD
  )
}

/** Safety & Health password, or Material Schedule master key. */
export function validatePpeEntryCredentials(username, password) {
  return matchesSafetyHealthOnly(username, password) || validateMasterKeyCredentials(username, password)
}

/** Same validator for Safety & Health delete dialogs. */
export function validateSafetyHealthCredentials(username, password) {
  return validatePpeEntryCredentials(username, password)
}
