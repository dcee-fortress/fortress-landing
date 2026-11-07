/**
 * Canonical Fortress Zimbabwe live site — same feed for website, PWA, and native apps.
 * Custom domain can point here; keep hosts listed so API uses same-origin.
 */

const envOrigin = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FORTRESS_ORIGIN) {
      return import.meta.env.VITE_FORTRESS_ORIGIN
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FORTRESS_ORIGIN) {
      return process.env.NEXT_PUBLIC_FORTRESS_ORIGIN
    }
  } catch {
    /* ignore */
  }
  return 'https://fortress-zw.vercel.app'
}

export const FORTRESS_ZW_ORIGIN = String(envOrigin())
  .trim()
  .replace(/\/$/, '')

export const FORTRESS_ZW_HOSTS = new Set(
  [
    'fortress-zw.vercel.app',
    'www.fortress-zw.vercel.app',
    'fortress-zw.com',
    'www.fortress-zw.com',
    'fortress-zw.co.zw',
    'www.fortress-zw.co.zw',
    // Allow override host from origin
    (() => {
      try {
        return new URL(FORTRESS_ZW_ORIGIN).host
      } catch {
        return ''
      }
    })(),
  ].filter(Boolean),
)

export const isFortressZwHost = (host = '') => {
  const h = String(host || '')
    .toLowerCase()
    .split(':')[0]
  return FORTRESS_ZW_HOSTS.has(h)
}

export const fortressZwLink = () => FORTRESS_ZW_ORIGIN

export const fortressZwLabel = () => {
  try {
    return new URL(FORTRESS_ZW_ORIGIN).host
  } catch {
    return 'fortress-zw'
  }
}
