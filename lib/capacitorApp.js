/**
 * Capacitor shell helpers for the Rodcroft offline app.
 * Safe no-ops on the regular website until Capacitor is present.
 */

export async function initCapacitorShell() {
  if (typeof window === "undefined") return null

  try {
    const core = await import("@capacitor/core")
    if (!core.Capacitor?.isNativePlatform?.()) return null

    const [{ App }, { StatusBar, Style }, { SplashScreen }, { Network }] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/status-bar"),
      import("@capacitor/splash-screen"),
      import("@capacitor/network"),
    ])

    try {
      await StatusBar.setStyle({ style: Style.Dark })
    } catch {
      /* web or unsupported */
    }

    try {
      await SplashScreen.hide()
    } catch {
      /* ignore */
    }

    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back()
        return
      }
      App.exitApp()
    })

    return {
      platform: core.Capacitor.getPlatform(),
      getNetworkStatus: () => Network.getStatus(),
    }
  } catch {
    return null
  }
}

export function isCapacitorNative() {
  if (typeof window === "undefined") return false
  try {
    return Boolean(window.Capacitor?.isNativePlatform?.())
  } catch {
    return false
  }
}
