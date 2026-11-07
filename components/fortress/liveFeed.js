/**
 * Live public uploads across Fortress installs.
 * Requires internet to publish / pull. Cached copy stays readable offline.
 */

import { storage } from './storage.js'
import { apiUrl } from './native.js'
import { NETWORK_ACTIONS, offlineActionMessage, readOnline } from './offline.js'

export const LIVE_FEED_CACHE_KEY = 'fortress-live-feed-cache-v1'

export const loadLiveFeedCache = () => {
  if (typeof window === 'undefined') return []
  try {
    const raw = JSON.parse(storage.getItem(LIVE_FEED_CACHE_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export const saveLiveFeedCache = (items = []) => {
  try {
    storage.setItem(LIVE_FEED_CACHE_KEY, JSON.stringify((items || []).slice(0, 80)))
  } catch {
    /* ignore full storage */
  }
}

export const fetchLiveFeed = async ({ since = 0 } = {}) => {
  if (!readOnline()) {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.live))
  }
  const url = `${apiUrl('/api/live/feed')}${since ? `?since=${encodeURIComponent(since)}` : ''}`
  let response
  try {
    response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
  } catch {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.live))
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error || 'Could not load live feed')
  const items = Array.isArray(payload.items) ? payload.items : []
  if (!since) saveLiveFeedCache(items)
  else if (items.length) {
    const merged = [...items, ...loadLiveFeedCache()]
    const seen = new Set()
    saveLiveFeedCache(
      merged.filter((row) => {
        if (!row?.id || seen.has(row.id)) return false
        seen.add(row.id)
        return true
      }),
    )
  }
  return { items, at: payload.at || Date.now(), live: true }
}

export const publishLiveUpload = async (slide = {}, author = {}) => {
  if (!readOnline()) {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.live))
  }
  const body = {
    id: slide.id || undefined,
    authorId: author.id || '',
    authorName: author.name || author.email || 'Fortress user',
    caption: slide.testimonial || slide.caption || '',
    shelf: slide.shelf || 'General',
    kind: slide.video ? 'video' : 'photo',
    photo: slide.photo || '',
    video: slide.video || '',
  }
  let response
  try {
    response = await fetch(apiUrl('/api/live/publish'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.live))
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error || 'Live publish failed')
  if (payload.item) {
    saveLiveFeedCache([payload.item, ...loadLiveFeedCache().filter((row) => row.id !== payload.item.id)])
  }
  return payload.item
}

/** Merge remote live items into a home-style card list (dedupe by id). */
export const mergeLiveIntoCards = (localCards = [], liveItems = []) => {
  const seen = new Set()
  const fromLive = (liveItems || [])
    .filter((row) => row?.photo || row?.video || row?.caption)
    .map((row) => ({
      id: `live-${row.id}`,
      live: true,
      photo: row.photo || '',
      video: row.video || '',
      testimonial: row.caption || '',
      shelf: row.shelf || 'Live',
      authorName: row.authorName || 'Fortress user',
      at: row.at,
    }))
  const merged = [...fromLive, ...(localCards || [])]
  return merged.filter((card) => {
    const key = card.id || `${card.photo || ''}:${card.testimonial || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
