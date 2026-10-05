import { validateMasterKeyCredentials } from "@/lib/restrictedAreaAuth"
import { canAutoOpenSavedLogin, resetSavedLoginAutoOpens } from "@/lib/savedLoginLimit"

/** Exclusive CEO Dashboards — master key credentials only. */
export const CEO_DASHBOARD_REMEMBER_KEY = "grove-ceo-dashboard-remember"

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

export function validateCeoDashboardCredentials(username, password) {
  return validateMasterKeyCredentials(username, password)
}
