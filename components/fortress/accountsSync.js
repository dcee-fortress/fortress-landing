import { apiUrl } from './native'
import { cleanSlug, loadAllCeoMetadata, saveAllCeoMetadata } from './fortressMetadata'

export const fetchServerAccountsState = async () => {
  try {
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    if (!payload?.ok) return null
    if (payload.tenants && typeof payload.tenants === 'object') {
      const localTenants = loadAllCeoMetadata()
      saveAllCeoMetadata({ ...localTenants, ...payload.tenants }, { skipRemoteSync: true })
    }
    return payload
  } catch {
    return null
  }
}

export const syncAccountsAndTenantsToServer = async (accounts = [], tenants = null) => {
  try {
    const tenantPayload = tenants || loadAllCeoMetadata()
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts: Array.isArray(accounts) ? accounts : [],
        tenants: tenantPayload,
      }),
    })
    if (!response.ok) return null
    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

export const syncSingleTenantToServer = async (slug, metadata) => {
  const normalized = cleanSlug(slug || metadata?.slug || metadata?.companyName || '')
  if (!normalized || !metadata) return null
  try {
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: normalized,
        tenant: metadata,
      }),
    })
    if (!response.ok) return null
    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

export const loginViaServer = async (email, password) => {
  try {
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        email,
        password,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload?.ok) return null
    if (payload.tenants && typeof payload.tenants === 'object') {
      const localTenants = loadAllCeoMetadata()
      saveAllCeoMetadata({ ...localTenants, ...payload.tenants }, { skipRemoteSync: true })
    }
    return payload
  } catch {
    return null
  }
}

export const searchAccountsViaServer = async (query = '') => {
  try {
    const response = await fetch(
      `${apiUrl('/api/accounts')}?q=${encodeURIComponent(String(query || ''))}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
    )
    if (!response.ok) return null
    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

export const deleteAccountOnServer = async (accountId) => {
  if (!accountId) return null
  try {
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-account', accountId }),
    })
    return await response.json().catch(() => null)
  } catch {
    return null
  }
}

export const deleteSiteOnServer = async (slug) => {
  if (!slug) return null
  try {
    const response = await fetch(apiUrl('/api/accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-site', slug: cleanSlug(slug) }),
    })
    return await response.json().catch(() => null)
  } catch {
    return null
  }
}
