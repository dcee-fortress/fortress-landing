/**
 * Plan-without-drawing take-offs: palisade fencing & burglar bars (Zim shop formulas).
 * Same chat phases as gateSession: explain → materials → totals → prices → BOQ.
 */

import { storage } from './storage.js'
import {
  DEFAULT_BOQ_PERCENTS,
  computeBoq,
  isNextCommand,
} from './drawingSession.js'

export { isNextCommand, DEFAULT_BOQ_PERCENTS, computeBoq }

export const PLAN_PHASES = Object.freeze([
  'explain',
  'materials_summary',
  'edit_materials',
  'totals_summary',
  'edit_totals',
  'unit_prices',
  'cost_summary',
  'boq',
])

const PLAN_FORMULA_MEMORY_KEY = 'fortress-fab-plan-formulas-v1'

const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const round = (n, places = 3) => {
  const f = 10 ** places
  return Math.round((Number(n) || 0) * f) / f
}

/** Zimbabwe shop defaults */
export const PALISADE_DEFAULTS = Object.freeze({
  spacing: 0.11,
  postSpacing: 2.75,
  waste: 1.1,
  embed: 0.6,
})

export const BURGLAR_DEFAULTS = Object.freeze({
  spacing: 0.12,
  waste: 1.05,
})

/** Three main Zim burglar-bar types (stand in for gate types). */
export const BURGLAR_TYPES = Object.freeze([
  {
    id: 'square-tube',
    name: 'Square tube',
    copy: '25×25 frame · 16×16 internals — most common security set',
    frameMaterial: '25×25 mm square tube (frame)',
    barMaterial: '16×16 mm square tube (bars)',
    framePriceKey: 'tube25PerM',
    barPriceKey: 'tube16PerM',
  },
  {
    id: 'flat-bar',
    name: 'Flat bar',
    copy: '30×30 angle frame · 20×5 flat internals — common & economical',
    frameMaterial: '30×30 mm angle iron (frame)',
    barMaterial: '20×5 mm flat bar (bars)',
    framePriceKey: 'angle30PerM',
    barPriceKey: 'flatBarPerM',
  },
  {
    id: 'heavy-duty',
    name: 'Heavy duty',
    copy: '40×40 / 25×25 frame · 16×16 bars · tighter 100 mm gaps',
    frameMaterial: '25×25 mm square tube (heavy frame)',
    barMaterial: '16×16 mm square tube (bars)',
    framePriceKey: 'tube25PerM',
    barPriceKey: 'tube16PerM',
    spacingOverride: 0.1,
  },
])

export const emptyPalisadeDraft = () => ({
  length: '',
  height: '',
  spacing: String(PALISADE_DEFAULTS.spacing),
  postSpacing: String(PALISADE_DEFAULTS.postSpacing),
})

export const emptyBurglarDraft = () => ({
  width: '',
  height: '',
  spacing: String(BURGLAR_DEFAULTS.spacing),
  barType: '',
})

export const burglarTypeLabel = (id) =>
  BURGLAR_TYPES.find((item) => item.id === id)?.name || id || 'Burglar bars'

export const burglarTypeMeta = (id) => BURGLAR_TYPES.find((item) => item.id === id) || BURGLAR_TYPES[0]

export const createEmptyPlanSession = (pricing = {}) => ({
  phase: 'explain',
  messages: [],
  explanation: '',
  lines: [],
  quantityOverrides: {},
  totalOverrides: {},
  formulaOverrides: {},
  unitPrices: {},
  labourPercent: pricing.labourPercent || DEFAULT_BOQ_PERCENTS.labourPercent,
  consumablesPercent: pricing.consumablesPercent || DEFAULT_BOQ_PERCENTS.consumablesPercent,
  transportPercent: pricing.transportPercent || DEFAULT_BOQ_PERCENTS.transportPercent,
  busy: false,
})

export const getNextPlanPhase = (phase) => {
  const idx = PLAN_PHASES.indexOf(phase)
  if (idx < 0) return 'explain'
  return PLAN_PHASES[idx + 1] || phase
}

export const safeEvalFormula = (expr = '') => {
  let cleaned = String(expr || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
  if (cleaned.includes('=')) cleaned = cleaned.split('=')[0]
  cleaned = cleaned.replace(/[^0-9+\-*/().\s]/g, '')
  if (!cleaned.trim()) return null
  try {
    // eslint-disable-next-line no-new-func
    const n = Function(`"use strict"; return (${cleaned})`)()
    return Number.isFinite(n) && n >= 0 ? Number(n) : null
  } catch {
    return null
  }
}

export const loadPlanFormulaMemory = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(storage.getItem(PLAN_FORMULA_MEMORY_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export const rememberPlanFormula = (materialId, entry = {}) => {
  if (!materialId) return loadPlanFormulaMemory()
  const memory = loadPlanFormulaMemory()
  memory[materialId] = {
    formula: String(entry.formula || ''),
    quantity: entry.quantity != null && entry.quantity !== '' ? Number(entry.quantity) : null,
    material: entry.material || '',
    measure: entry.measure || 'length',
    unitLabel: entry.unitLabel || 'm',
    at: Date.now(),
  }
  try {
    storage.setItem(PLAN_FORMULA_MEMORY_KEY, JSON.stringify(memory))
  } catch {
    /* ignore */
  }
  return memory
}

export const applyRememberedPlanFormulas = (lines = []) => {
  const memory = loadPlanFormulaMemory()
  return (lines || []).map((row) => {
    const remembered = memory[row.id]
    if (!remembered?.formula) return row
    const evaluated =
      remembered.quantity != null && Number.isFinite(Number(remembered.quantity))
        ? Number(remembered.quantity)
        : safeEvalFormula(remembered.formula)
    return {
      ...row,
      formula: remembered.formula,
      quantity: evaluated != null ? round(evaluated, 3) : row.quantity,
      fromMemory: true,
    }
  })
}

export const applyPlanLineOverrides = (lines = [], session = {}) => {
  const qty = session.quantityOverrides || {}
  const totals = session.totalOverrides || {}
  const formulas = session.formulaOverrides || {}
  return lines.map((row) => {
    let quantity = money(row.quantity)
    let formula = row.formula
    if (formulas[row.id] != null && formulas[row.id] !== '') {
      formula = String(formulas[row.id])
      const evaluated = safeEvalFormula(formula)
      if (evaluated != null) quantity = evaluated
    }
    if (qty[row.id] != null && qty[row.id] !== '') quantity = money(qty[row.id])
    if (totals[row.id] != null && totals[row.id] !== '') quantity = money(totals[row.id])
    return {
      ...row,
      quantity: round(quantity, 3),
      formula,
      quantityLabel: `${round(quantity, 2)} ${row.unitLabel}`,
    }
  })
}

/** Shop formula: palisade fencing. */
export const buildPalisadeMaterialLines = (draft = {}) => {
  const L = money(draft.length)
  const H = money(draft.height)
  const Ws = money(draft.spacing) || PALISADE_DEFAULTS.spacing
  const postSpacing = money(draft.postSpacing) || PALISADE_DEFAULTS.postSpacing
  const waste = PALISADE_DEFAULTS.waste
  const embed = PALISADE_DEFAULTS.embed
  if (!(L > 0 && H > 0)) return []

  const paleCount = Math.floor(L / Ws) + 1
  const paleMeters = round(paleCount * H * waste, 3)
  const railCount = H < 1.8 ? 2 : 3
  const railMeters = round(L * railCount * waste, 3)
  const postCount = Math.round(L / postSpacing) + 1
  const postH = H + embed
  const postMeters = round(postCount * postH * waste, 3)

  return [
    {
      id: 'pales',
      material: '25×25 mm pale (or 50×25 flat)',
      description: `${paleCount} pales @ ${round(H, 3)} m · c/c ${round(Ws, 3)} m`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: paleMeters,
      formula: `(⌊${round(L, 3)}/${round(Ws, 3)}⌋+1) × ${round(H, 3)} × ${waste} = ${paleCount}×${round(H, 3)}×${waste}`,
      priceKey: 'tube25PerM',
      priceUnit: '/m',
      methodMeta: { paleCount, H, Ws, waste },
    },
    {
      id: 'rails',
      material: '40×40×2 mm angle / 50×50 rail',
      description: `${railCount} horizontal rails along ${round(L, 3)} m`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: railMeters,
      formula: `${round(L, 3)} × ${railCount} rails × ${waste}`,
      priceKey: 'angle40PerM',
      priceUnit: '/m',
      methodMeta: { railCount, L, waste },
    },
    {
      id: 'posts',
      material: '76×76 mm post (or 100×100 at gates)',
      description: `${postCount} posts · height ${round(H, 3)}+${embed} m embed`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: postMeters,
      formula: `(round(${round(L, 3)}/${round(postSpacing, 3)})+1) × (${round(H, 3)}+${embed}) × ${waste}`,
      priceKey: 'tube76PerM',
      priceUnit: '/m',
      methodMeta: { postCount, postH, postSpacing, waste },
    },
  ]
}

/** Shop formula: one burglar / window set. */
export const buildBurglarMaterialLines = (draft = {}) => {
  const W = money(draft.width)
  const Ht = money(draft.height)
  const type = burglarTypeMeta(draft.barType)
  const spacing =
    money(draft.spacing) ||
    (type.spacingOverride != null ? type.spacingOverride : BURGLAR_DEFAULTS.spacing)
  const waste = BURGLAR_DEFAULTS.waste
  if (!(W > 0 && Ht > 0) || !draft.barType) return []

  const frameLen = round(2 * (W + Ht), 3)
  const verticalCount = Math.max(0, Math.floor(W / spacing) - 1)
  const verticalM = round(verticalCount * Ht, 3)
  let middleBars = 1
  if (Ht >= 1 && Ht <= 1.5) middleBars = 2
  else if (Ht > 1.5) middleBars = 3
  const horizontalM = round(middleBars * W, 3)
  const totalRaw = frameLen + verticalM + horizontalM
  const frameWithWaste = round(frameLen * waste, 3)
  const vertWithWaste = round(verticalM * waste, 3)
  const horizWithWaste = round(horizontalM * waste, 3)

  return [
    {
      id: 'bb-frame',
      material: type.frameMaterial,
      description: `Outer frame 2×(W+Ht)`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: frameWithWaste,
      formula: `2×(${round(W, 3)}+${round(Ht, 3)}) × ${waste} = ${frameLen}×${waste}`,
      priceKey: type.framePriceKey,
      priceUnit: '/m',
      methodMeta: { frameLen, waste },
    },
    {
      id: 'bb-vertical',
      material: type.barMaterial,
      description: `${verticalCount} verticals @ c/c ${round(spacing, 3)} m`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: vertWithWaste,
      formula: `(⌊${round(W, 3)}/${round(spacing, 3)}⌋−1) × ${round(Ht, 3)} × ${waste} = ${verticalCount}×${round(Ht, 3)}×${waste}`,
      priceKey: type.barPriceKey,
      priceUnit: '/m',
      methodMeta: { verticalCount, Ht, spacing, waste },
    },
    {
      id: 'bb-horizontal',
      material: type.barMaterial,
      description: `${middleBars} middle horizontal${middleBars === 1 ? '' : 's'}`,
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: horizWithWaste,
      formula: `${middleBars} × ${round(W, 3)} × ${waste}`,
      priceKey: type.barPriceKey,
      priceUnit: '/m',
      methodMeta: { middleBars, W, waste, totalRaw },
    },
  ]
}

export const buildPlanMaterialLines = (kind, draft = {}) => {
  if (kind === 'palisade') return buildPalisadeMaterialLines(draft)
  if (kind === 'burglar') return buildBurglarMaterialLines(draft)
  return []
}

export const buildPalisadeExplanation = (draft = {}, projectName = '', client = '') => {
  const L = money(draft.length)
  const H = money(draft.height)
  const Ws = money(draft.spacing) || PALISADE_DEFAULTS.spacing
  const postSpacing = money(draft.postSpacing) || PALISADE_DEFAULTS.postSpacing
  const paleCount = Math.floor(L / Ws) + 1
  const railCount = H < 1.8 ? 2 : 3
  const postCount = Math.round(L / postSpacing) + 1
  return [
    `I've set up a palisade fencing take-off${projectName ? ` for ${projectName}` : ''}${
      client ? ` (client: ${client})` : ''
    }.`,
    '',
    `Fence length L = ${L || '—'} m · pale height H = ${H || '—'} m.`,
    `Pale centres Ws = ${round(Ws, 3)} m (Zim security standard 0.11 m). Post centres = ${round(postSpacing, 3)} m.`,
    '',
    `Shop method:`,
    `• Pales = (L / Ws) + 1 → ${paleCount} pales · meters = pales × H × 1.1 waste`,
    `• Rails = ${railCount} (${H < 1.8 ? 'H < 1.8 → 2' : 'H ≥ 1.8 → 3'}) · meters = L × rails × 1.1`,
    `• Posts = round(L / spacing) + 1 → ${postCount} · each H+0.6 m in ground × 1.1`,
    '',
    'Type next for the material summary, or ask why a term is there / send a correction.',
  ].join('\n')
}

export const buildBurglarExplanation = (draft = {}, projectName = '', client = '') => {
  const W = money(draft.width)
  const Ht = money(draft.height)
  const type = burglarTypeMeta(draft.barType)
  const spacing =
    money(draft.spacing) ||
    (type.spacingOverride != null ? type.spacingOverride : BURGLAR_DEFAULTS.spacing)
  let middleBars = 1
  if (Ht >= 1 && Ht <= 1.5) middleBars = 2
  else if (Ht > 1.5) middleBars = 3
  const verticalCount = Math.max(0, Math.floor(W / spacing) - 1)
  return [
    `I've set up a burglar-bar take-off${projectName ? ` for ${projectName}` : ''}${
      client ? ` (client: ${client})` : ''
    }.`,
    '',
    `Type: ${type.name} — ${type.copy}`,
    `Window ${W || '—'} m wide × ${Ht || '—'} m high · bar centres ${round(spacing, 3)} m.`,
    '',
    `Shop method (one window):`,
    `• Frame = 2 × (W + Ht) in ${type.frameMaterial}`,
    `• Verticals = (W / spacing) − 1 → ${verticalCount} × Ht in ${type.barMaterial}`,
    `• Middle horizontals = ${middleBars} × W`,
    `• Then × 1.05 waste on each length`,
    '',
    'Type next for materials, or ask why / correct a formula.',
  ].join('\n')
}

export const buildPlanExplanation = (kind, draft, projectName, client) => {
  if (kind === 'palisade') return buildPalisadeExplanation(draft, projectName, client)
  if (kind === 'burglar') return buildBurglarExplanation(draft, projectName, client)
  return 'Choose a plan type to begin.'
}

export const explainPalisadeCalculation = (draft = {}) => {
  const L = money(draft.length)
  const H = money(draft.height)
  const Ws = money(draft.spacing) || PALISADE_DEFAULTS.spacing
  const postSpacing = money(draft.postSpacing) || PALISADE_DEFAULTS.postSpacing
  const paleCount = Math.floor(L / Ws) + 1
  const railCount = H < 1.8 ? 2 : 3
  const postCount = Math.round(L / postSpacing) + 1
  return [
    'Palisade fencing — Zimbabwe shop formula:',
    '',
    `• No. of pales = (L / Ws) + 1 = (${L} / ${Ws}) + 1 → ${paleCount}`,
    `  Pale meters = ${paleCount} × ${H} × 1.1 waste`,
    `• Rails: H ${H < 1.8 ? '< 1.8 → 2 rails' : '≥ 1.8 → 3 rails'} → ${railCount} × ${L} × 1.1`,
    `• Posts = round(L / ${postSpacing}) + 1 → ${postCount}, each ${H}+0.6 m × 1.1`,
    '',
    'Type next when you accept this, or send a correction.',
  ].join('\n')
}

export const explainBurglarCalculation = (draft = {}) => {
  const W = money(draft.width)
  const Ht = money(draft.height)
  const type = burglarTypeMeta(draft.barType)
  const spacing =
    money(draft.spacing) ||
    (type.spacingOverride != null ? type.spacingOverride : BURGLAR_DEFAULTS.spacing)
  let middleBars = 1
  if (Ht >= 1 && Ht <= 1.5) middleBars = 2
  else if (Ht > 1.5) middleBars = 3
  const verticalCount = Math.max(0, Math.floor(W / spacing) - 1)
  const frame = round(2 * (W + Ht), 3)
  return [
    `Burglar bars (${type.name}) — Zimbabwe shop formula:`,
    '',
    `• Frame = 2 × (W + Ht) = 2 × (${W} + ${Ht}) = ${frame} m`,
    `• Verticals = (W / spacing) − 1 = (${W} / ${spacing}) − 1 → ${verticalCount} × ${Ht} m`,
    `• Middle horizontals = ${middleBars} × ${W} m`,
    `• Waste factor 1.05 on each length`,
    '',
    'Type next when you accept this, or send a correction.',
  ].join('\n')
}

export const formatPlanMaterialsSummary = (lines = []) => {
  if (!lines.length) return 'No materials calculated yet — check sizes and type.'
  return lines
    .map(
      (row) =>
        `${row.material}: ${round(row.quantity, 2)} ${row.unitLabel} · ${row.description}${
          row.formula ? `\n  Formula: ${row.formula}` : ''
        }`,
    )
    .join('\n\n')
}

export const formatPlanTotalsSummary = (lines = []) => {
  if (!lines.length) return 'No totals yet.'
  return lines
    .map((row) => `${row.material} total length = ${round(row.quantity, 2)} ${row.unitLabel}`)
    .join('\n')
}

export const planPriceRows = (lines = [], unitPrices = {}, pricing = {}) =>
  lines.map((row) => {
    const fallback = money(pricing[row.priceKey])
    const hasOverride = Object.prototype.hasOwnProperty.call(unitPrices || {}, row.id)
    const raw = hasOverride ? unitPrices[row.id] : undefined
    const unitPriceInput = hasOverride
      ? raw == null
        ? ''
        : String(raw)
      : fallback
        ? String(fallback)
        : ''
    const unitPrice = unitPriceInput === '' ? 0 : money(unitPriceInput)
    const totalPrice = round(money(row.quantity) * unitPrice, 2)
    return {
      id: row.id,
      material: row.material,
      description: row.description || row.material,
      quantity: row.quantity,
      quantityLabel: row.quantityLabel || `${round(row.quantity, 2)} ${row.unitLabel}`,
      unit: row.unit,
      unitLabel: row.unitLabel,
      unitPrice,
      unitPriceInput,
      totalPrice,
      priceKey: row.priceKey,
      priceUnit: row.priceUnit,
      mode: 'length',
    }
  })

export const formatPlanCostSummary = (priceRows = []) => {
  if (!priceRows.length) return 'No costs yet.'
  const lines = priceRows.map(
    (row) =>
      `${row.material}: ${row.quantityLabel} × $${Number(row.unitPrice).toFixed(2)}${row.priceUnit || ''} = $${Number(
        row.totalPrice,
      ).toFixed(2)}`,
  )
  const total = priceRows.reduce((sum, row) => sum + money(row.totalPrice), 0)
  lines.push('')
  lines.push(`Material cost total = $${round(total, 2).toFixed(2)}`)
  return lines.join('\n')
}

export const derivePlanViews = (session, kind, draft, pricing = {}) => {
  const base = session.lines?.length ? session.lines : buildPlanMaterialLines(kind, draft)
  const lines = applyPlanLineOverrides(base, session)
  const priceRows = planPriceRows(lines, session.unitPrices || {}, pricing)
  const materialCost = round(
    priceRows.reduce((sum, row) => sum + money(row.totalPrice), 0),
    2,
  )
  const boq = computeBoq({
    materialCost,
    labourPercent: session.labourPercent,
    consumablesPercent: session.consumablesPercent,
    transportPercent: session.transportPercent,
  })
  return { lines, priceRows, materialCost, boq }
}

export const pricingPatchFromPlanPrices = (priceRows = []) => {
  const patch = {}
  priceRows.forEach((row) => {
    if (row.priceKey) patch[row.priceKey] = String(row.unitPrice)
  })
  return patch
}

export const applyPlanSuggestion = (kind, draft = {}, text = '') => {
  const t = String(text || '').toLowerCase()
  const next = { ...draft }
  const notes = []
  let changed = false

  const lenMatch = t.match(/(?:length|fence|l)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const wMatch = t.match(/(?:width|w)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const hMatch = t.match(/(?:height|h(?:t)?)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const spaceMatch = t.match(/(?:spacing|centres?|c\/c)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)
  const postMatch = t.match(/post\s*spacing\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i)

  if (kind === 'palisade') {
    if (lenMatch) {
      next.length = lenMatch[1]
      notes.push(`Length set to ${lenMatch[1]} m.`)
      changed = true
    }
    if (hMatch) {
      next.height = hMatch[1]
      notes.push(`Height set to ${hMatch[1]} m.`)
      changed = true
    }
    if (spaceMatch) {
      next.spacing = spaceMatch[1]
      notes.push(`Pale spacing set to ${spaceMatch[1]} m.`)
      changed = true
    }
    if (postMatch) {
      next.postSpacing = postMatch[1]
      notes.push(`Post spacing set to ${postMatch[1]} m.`)
      changed = true
    }
  }

  if (kind === 'burglar') {
    if (wMatch) {
      next.width = wMatch[1]
      notes.push(`Width set to ${wMatch[1]} m.`)
      changed = true
    }
    if (hMatch) {
      next.height = hMatch[1]
      notes.push(`Height set to ${hMatch[1]} m.`)
      changed = true
    }
    if (spaceMatch) {
      next.spacing = spaceMatch[1]
      notes.push(`Bar spacing set to ${spaceMatch[1]} m.`)
      changed = true
    }
    for (const type of BURGLAR_TYPES) {
      if (t.includes(type.id.replace('-', ' ')) || t.includes(type.name.toLowerCase())) {
        next.barType = type.id
        notes.push(`Type set to ${type.name}.`)
        changed = true
        break
      }
    }
  }

  return { draft: next, notes, changed }
}
