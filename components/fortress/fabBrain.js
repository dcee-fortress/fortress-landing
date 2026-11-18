/** Client for Fortress fab-brain (Gemini explain + correction learning). */

import { apiUrl } from './native'
import { NETWORK_ACTIONS, offlineActionMessage, readOnline } from './offline'

const fabBrainUrl = () => apiUrl('/api/fab-brain')

export const askFabBrain = async ({ mode = 'explain', question = '', context = {} } = {}) => {
  if (!readOnline()) {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.chat))
  }
  let response
  try {
    response = await fetch(fabBrainUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, question, context }),
    })
  } catch {
    throw new Error('Could not reach Fortress chat AI. Check internet or your API host (VITE_API_BASE).')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error || 'Fab brain failed')
  return payload
}

export const looksLikeCalculationQuestion = (text = '') => {
  const t = String(text).toLowerCase()
  return (
    /\bwhy\b|\breason\b|\bexplain\b|\bhow\b|\bwhere\b.+\b(from|get|got|come|came)\b|\bwhere (did|does|it|you)\b|\bisn'?t it|\bshould(n'?t)? it\b|\b3\s*[x×]\s*|middle vertical|formula|calculation|calc\b/.test(
      t,
    )
  )
}

/** A question is answered as a question. It is not treated as a new instruction. */
export const looksLikeUserQuestion = (text = '') => {
  const t = String(text || '').trim()
  if (!t) return false
  if (/\b(y\s*\d+|[a-z0-9×x.\- ]{1,24})\s*(=|is|:)\s*[\d.]+\s*kg\s*\/\s*m\b/i.test(t) && !/\?/.test(t)) {
    return false
  }
  if (/\?\s*$/.test(t)) return true
  return /^(how|why|what|where|which|when|who|explain|show me|can you|could you)\b/i.test(t) || looksLikeCalculationQuestion(t)
}

export const looksLikeFormulaCorrection = (text = '') => {
  const t = String(text).toLowerCase()
  // Pure "why 3×6" → question only. "isn't it supposed to be 8.4×2+…" → correction.
  return (
    /should be|suppose[d]? to be|isn'?t it (suppose[d]?|meant)|instead of|correct (it|to|formula)|change (it )?to|use\s+[0-9]|drop (the )?middle|without middle|no middle vertical/.test(
      t,
    ) && (/[0-9]/.test(t) || /middle/.test(t))
  )
}
