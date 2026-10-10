import { getGroveItem } from "@/lib/groveClientStore"
import { canAutoOpenSavedLogin, resetSavedLoginAutoOpens } from "@/lib/savedLoginLimit"

/** Used until a new pair is saved from Settings → Login details. */
export const CEO_DASHBOARD_USERNAME = "MBIZVO"
export const CEO_DASHBOARD_PASSWORD = "Mbizvo123"
export const CEO_DASHBOARD_REMEMBER_KEY = "grove-ceo-dashboard-remember"
export const CEO_CREDENTIALS_STORAGE_KEY = "grove-ceo-dashboard-credentials"

function canUseStorage() {
  return typeof window !== "undefined"
}

export function isCeoDashboardRemembered() {
  if (!canUseStorage()) return false
  try {
    return canAutoOpenSavedLogin(CEO_DASHBOARD_REMEMBER_KEY)
  } catch {
    return false
  }
}

/**
 * @param {{ remember?: boolean }} [options]
 */
export function unlockCeoDashboard(options = {}) {
  if (!canUseStorage()) return
  const remember = Boolean(options.remember)
  resetSavedLoginAutoOpens(CEO_DASHBOARD_REMEMBER_KEY)
  try {
    if (remember) {
      window.localStorage.setItem(CEO_DASHBOARD_REMEMBER_KEY, "1")
    } else {
      window.localStorage.removeItem(CEO_DASHBOARD_REMEMBER_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

function builtInCeoCredentials() {
  return {
    username: CEO_DASHBOARD_USERNAME,
    password: CEO_DASHBOARD_PASSWORD,
  }
}

/** Current CEO EXCLUSIVE username and password. A saved pair replaces the built-in one. */
export function getCeoDashboardCredentials() {
  if (!canUseStorage()) return builtInCeoCredentials()
  try {
    const raw = getGroveItem(CEO_CREDENTIALS_STORAGE_KEY)
    if (!raw) return builtInCeoCredentials()
    const parsed = JSON.parse(raw)
    const username = String(parsed?.username || "").trim()
    const password = String(parsed?.password ?? "")
    if (!username || !password) return builtInCeoCredentials()
    return { username, password }
  } catch {
    return builtInCeoCredentials()
  }
}

export function validateCeoDashboardCredentials(username, password) {
  const current = getCeoDashboardCredentials()
  return (
    String(username || "").trim().toLowerCase() === current.username.toLowerCase() &&
    String(password || "") === current.password
  )
}

/** Saves the pair to the live shared store so every device uses the new login. */
export function saveCeoDashboardCredentials(username, password) {
  const nextUsername = String(username || "").trim()
  const nextPassword = String(password ?? "")
  if (!nextUsername || !nextPassword) {
    return Promise.reject(new Error("Enter a username and a password."))
  }

  return import("@/lib/saveToPostgres").then(({ writeGroveJson }) =>
    writeGroveJson(CEO_CREDENTIALS_STORAGE_KEY, {
      username: nextUsername,
      password: nextPassword,
    })
  )
}
