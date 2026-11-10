/** Online / offline helpers for Fortress (web, Electron, Capacitor). */

export const readOnline = () => {
  // Node and some SSR runtimes define `navigator` without `onLine`.
  // Treat that as online so the first paint matches a connected browser.
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') return true
  return navigator.onLine
}

export const offlineActionMessage = (action = 'do that') =>
  `Connect to the internet to ${action}. Already saved projects, drawings, photos, and quotes on this device still open offline.`

export const NETWORK_ACTIONS = {
  post: 'upload a new post or testimonial',
  drawing: 'upload a new drawing',
  photo: 'upload a new photo',
  chat: 'send a message to Fortress chat AI',
  buy: 'buy a system or pay with EcoCash',
  shop: 'add or sync a shop item',
  pay: 'complete EcoCash payment',
  vision: 'run Gemini / AI on a drawing',
  whatsapp: 'send a WhatsApp order',
  updates: 'download app updates',
  live: 'see or share live uploads from other Fortress users',
}

/** Returns true when offline (caller should block the online-only action). */
export const blockIfOffline = (action) => {
  if (readOnline()) return false
  return offlineActionMessage(action)
}

/**
 * Apply a waiting service-worker update only while online.
 * Offline installs keep the last cached app — no silent update until data is on.
 */
export const applyPendingUpdateWhenOnline = (updateSW) => {
  if (typeof updateSW !== 'function') return
  if (!readOnline()) return
  try {
    updateSW(true)
  } catch {
    /* ignore */
  }
}
