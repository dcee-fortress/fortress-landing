/** Login for Goods received / Petty cash entry pages only. */
export const FINANCE_ENTRY_USERNAME = "Rodcroft"
export const FINANCE_ENTRY_PASSWORD = "Rodcroftfinance@2026"
export const FINANCE_ENTRY_REMEMBER_KEY = "grove-finance-entry-remember"

function canUseStorage() {
  return typeof window !== "undefined"
}

export function isFinanceEntryRemembered() {
  if (!canUseStorage()) return false
  try {
    return window.localStorage.getItem(FINANCE_ENTRY_REMEMBER_KEY) === "1"
  } catch {
    return false
  }
}

/**
 * @param {{ remember?: boolean }} [options]
 */
export function unlockFinanceEntry(options = {}) {
  if (!canUseStorage()) return
  const remember = Boolean(options.remember)
  try {
    if (remember) {
      window.localStorage.setItem(FINANCE_ENTRY_REMEMBER_KEY, "1")
    } else {
      window.localStorage.removeItem(FINANCE_ENTRY_REMEMBER_KEY)
    }
  } catch {
    // Ignore storage failures.
  }
}

export function clearFinanceEntryRemember() {
  if (!canUseStorage()) return
  try {
    window.localStorage.removeItem(FINANCE_ENTRY_REMEMBER_KEY)
  } catch {
    // Ignore storage failures.
  }
}

export function validateFinanceEntryCredentials(username, password) {
  return (
    String(username || "").trim() === FINANCE_ENTRY_USERNAME &&
    String(password || "") === FINANCE_ENTRY_PASSWORD
  )
}
