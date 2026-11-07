/**
 * Service worker registration — updates apply only when the device is online.
 * Offline users keep the last installed Fortress build until data is switched on.
 */

import { applyPendingUpdateWhenOnline, readOnline } from './offline'
import { isNativeShell } from './native'

export const registerFortressUpdates = async () => {
  // Electron / Capacitor ship a fixed build; store updates come from installers / APK shares.
  if (isNativeShell()) return

  try {
    const { registerSW } = await import('virtual:pwa-register')
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (!readOnline()) return
        // New bundle available — only activate while online.
        applyPendingUpdateWhenOnline(updateSW)
      },
      onOfflineReady() {
        /* cached for offline viewing */
      },
    })

    const tryUpdate = () => {
      if (!readOnline()) return
      applyPendingUpdateWhenOnline(updateSW)
    }

    window.addEventListener('online', tryUpdate)
  } catch {
    /* PWA plugin absent in some builds */
  }
}
