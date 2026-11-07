/**
 * Chat-driven gate take-off (no drawing): explain → materials → totals → prices → BOQ.
 */

import { storage } from './storage.js'
import { DEFAULT_BOQ_PERCENTS, computeBoq, isNextCommand } from './drawingSession.js'

export { isNextCommand, DEFAULT_BOQ_PERCENTS, computeBoq }

/** Remembered gate material formulas (system memory). */
export const GATE_FORMULA_MEMORY_KEY = 'fortress-fab-gate-formulas-v1'
/** Learned calculation method (e.g. how many middle verticals in 50×50 frame). */
export const GATE_METHOD_MEMORY_KEY = 'fortress-fab-gate-method-v1'

export const loadGateMethodMemory = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(storage.getItem(GATE_METHOD_MEMORY_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export const saveGateMethodMemory = (memory) => {
  try {
    storage.setItem(GATE_METHOD_MEMORY_KEY, JSON.stringify(memory || {}))
  } catch {
    /* ignore */
  }
}

export const rememberGateMethodPatch = (patch = {}) => {
  const memory = { ...loadGateMethodMemory() }
  if (patch.tube50 && typeof patch.tube50 === 'object') {
    memory.tube50 = { ...(memory.tube50 || {}), ...patch.tube50, at: Date.now() }
  }
  saveGateMethodMemory(memory)
  return memory
}

export const tube50MiddleVerticals = () => {
  const n = Number(loadGateMethodMemory()?.tube50?.middleVerticals)
  // Default Fortress method uses 3 intermediate verticals in the 50×50 frame.
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3
}

export const GATE_PHASES = Object.freeze([
  'explain',
  'materials_summary',
  'edit_materials',
  'totals_summary',
  'edit_totals',
  'unit_prices',
  'cost_summary',
  'boq',
])

const OVERLAP = 0.4
const DEFAULT_SPACING = 0.12
const BAR_CLEARANCE = 0.1
const TUBE_WASTAGE = 1.1
const MIDDLE_VERTICALS = 3
const HALF_SHEET_H = 1.0

const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const round = (n, places = 3) => {
  const f = 10 ** places
  return Math.round((Number(n) || 0) * f) / f
}

export const createEmptyGateSession = (pricing = {}) => ({
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

export const getNextGatePhase = (phase) => {
  const idx = GATE_PHASES.indexOf(phase)
  if (idx < 0) return 'explain'
  return GATE_PHASES[idx + 1] || phase
}

export const gateTypeLabel = (gateType) => {
  if (gateType === 'sliding') return 'Sliding gate'
  if (gateType === 'swing-double') return 'Swing gate (double leaf)'
  if (gateType === 'swing-single') return 'Swing gate (single leaf)'
  return gateType || 'Gate'
}

export const gateDesignLabel = (design) => {
  if (design === 'palisade') return 'Palisade (25×25 tubes with gaps)'
  if (design === 'solid') return 'Solid private (full IBR sheet cladding)'
  if (design === 'half') return 'Half & half (sheet bottom, tubes on top)'
  return design || 'Design'
}

/** Build measured material lines with length (m) or area (m²) and Excel-style formulas. */
export const buildGateMaterialLines = (gate = {}) => {
  const W = money(gate.width)
  const H = money(gate.height)
  if (!(W > 0 && H > 0) || !gate.gateType || !gate.design) return []

  const gateType = gate.gateType
  const design = gate.design
  const spacing = money(gate.spacing) || DEFAULT_SPACING
  const openingL = gateType === 'sliding' ? W + OVERLAP : W
  const leaves = gateType === 'swing-double' ? 2 : 1
  const leafL = gateType === 'swing-double' ? openingL / 2 : openingL
  const midVerts = tube50MiddleVerticals()
  const frame50One = leafL * 2 + H * 2 + midVerts * H + leafL
  const total50 = round(frame50One * leaves, 3)
  const midTerm = midVerts > 0 ? ` + ${midVerts}×${round(H, 3)}` : ''
  const formula50 = leaves > 1
    ? `(${round(leafL, 3)}×2 + ${round(H, 3)}×2${midTerm} + ${round(leafL, 3)}) × ${leaves} leaves`
    : `${round(leafL, 3)}×2 + ${round(H, 3)}×2${midTerm} + ${round(leafL, 3)}`

  const lines = [
    {
      id: 'tube50',
      material: '50×50×2 mm tube',
      description:
        midVerts > 0
          ? `Frame (rails, end posts, ${midVerts} middle verticals)`
          : 'Frame (rails and end posts — no middle verticals)',
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: total50,
      formula: formula50,
      priceKey: 'tube50PerM',
      priceUnit: '/m',
      methodMeta: { middleVerticals: midVerts, leafL, H, openingL, leaves },
    },
  ]

  const barCountOne = Math.floor(leafL / spacing + 1e-9)
  const barClearH = Math.max(0, H - BAR_CLEARANCE)
  const sheetH = Math.min(HALF_SHEET_H, H)
  const topH = Math.max(0, H - sheetH)

  if (design === 'palisade') {
    const tube25 = round(barCountOne * barClearH * TUBE_WASTAGE * leaves, 3)
    lines.push({
      id: 'tube25',
      material: '25×25 mm tube',
      description: 'Palisade infill bars',
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: tube25,
      formula: `${barCountOne} bars × ${round(barClearH, 3)} m × ${TUBE_WASTAGE} wastage${
        leaves > 1 ? ` × ${leaves} leaves` : ''
      }`,
      priceKey: 'tube25PerM',
      priceUnit: '/m',
    })
  } else if (design === 'solid') {
    const sheetArea = round(leafL * H * leaves, 3)
    lines.push({
      id: 'sheet',
      material: 'IBR sheet',
      description: 'Full-height solid cladding',
      measure: 'area',
      unit: 'm2',
      unitLabel: 'm²',
      quantity: sheetArea,
      formula: `${round(leafL, 3)} m × ${round(H, 3)} m${leaves > 1 ? ` × ${leaves} leaves` : ''} (area)`,
      priceKey: 'sheetPerM2',
      priceUnit: '/m²',
    })
  } else if (design === 'half') {
    const sheetArea = round(leafL * sheetH * leaves, 3)
    const tube25 = round(barCountOne * topH * TUBE_WASTAGE * leaves, 3)
    lines.push({
      id: 'sheet',
      material: 'IBR sheet',
      description: 'Lower cladding (half height)',
      measure: 'area',
      unit: 'm2',
      unitLabel: 'm²',
      quantity: sheetArea,
      formula: `${round(leafL, 3)} m × ${round(sheetH, 3)} m sheet height${
        leaves > 1 ? ` × ${leaves} leaves` : ''
      } (area)`,
      priceKey: 'sheetPerM2',
      priceUnit: '/m²',
    })
    if (tube25 > 0) {
      lines.push({
        id: 'tube25',
        material: '25×25 mm tube',
        description: 'Upper palisade bars',
        measure: 'length',
        unit: 'm',
        unitLabel: 'm',
        quantity: tube25,
        formula: `${barCountOne} bars × ${round(topH, 3)} m × ${TUBE_WASTAGE} wastage${
          leaves > 1 ? ` × ${leaves} leaves` : ''
        }`,
        priceKey: 'tube25PerM',
        priceUnit: '/m',
      })
    }
  }

  if (gateType === 'sliding' && openingL > 0) {
    lines.push({
      id: 'uchannel',
      material: 'U-channel 80×40',
      description: 'Sliding track',
      measure: 'length',
      unit: 'm',
      unitLabel: 'm',
      quantity: round(openingL, 3),
      formula: `Opening length ${round(W, 3)} + ${OVERLAP} m overlap = ${round(openingL, 3)} m`,
      priceKey: 'uChannelPerM',
      priceUnit: '/m',
    })
  }

  return lines
}

/** Local (offline-capable) explanation of the 50×50 frame method — why 3×H appears. */
export const explainGateTube50Calculation = (gate = {}, lines = []) => {
  const W = money(gate.width)
  const H = money(gate.height)
  const gateType = gate.gateType || 'swing-single'
  const openingL = gateType === 'sliding' ? W + OVERLAP : W
  const leaves = gateType === 'swing-double' ? 2 : 1
  const leafL = gateType === 'swing-double' ? openingL / 2 : openingL
  const midVerts = tube50MiddleVerticals()
  const tube50 = (lines || []).find((row) => row.id === 'tube50')
  const total = tube50?.quantity ?? round(leafL * 2 + H * 2 + midVerts * H + leafL, 3) * leaves

  const bits = [
    `Here's why the 50×50×2 mm tube formula is built this way (Fortress / fabricator method):`,
    '',
    `Your opening is ${W} m wide × ${H} m high (${gateTypeLabel(gateType)}).`,
  ]
  if (gateType === 'sliding') {
    bits.push(
      `Sliding adds ${OVERLAP} m overlap, so fabrication leaf length L = ${W} + ${OVERLAP} = ${round(openingL, 3)} m.`,
    )
  } else if (leaves > 1) {
    bits.push(`Double swing splits the opening: each leaf ≈ ${round(leafL, 3)} m.`)
  } else {
    bits.push(`Leaf length L = ${round(leafL, 3)} m (same as clear opening for this type).`)
  }

  bits.push('')
  bits.push('Per leaf, 50×50 frame parts:')
  bits.push(`• ${round(leafL, 3)} × 2 — top and bottom horizontal rails`)
  bits.push(`• ${round(H, 3)} × 2 — left and right end posts (full height)`)
  if (midVerts > 0) {
    bits.push(
      `• ${midVerts} × ${round(H, 3)} — ${midVerts} intermediate / middle verticals. These are extra uprights between the end posts so a wide leaf stays stiff and takes hinges/lock better. That is why you see “${midVerts}×${round(H, 3)}” (for height ${H} m that is ${midVerts}×${H}).`,
    )
  } else {
    bits.push(
      `• No middle verticals — system memory learned your preferred frame without the intermediate uprights.`,
    )
  }
  bits.push(`• + ${round(leafL, 3)} — one extra horizontal (mid / lock rail)`)
  bits.push('')
  bits.push(
    `So one leaf = ${round(leafL, 3)}×2 + ${round(H, 3)}×2${
      midVerts > 0 ? ` + ${midVerts}×${round(H, 3)}` : ''
    } + ${round(leafL, 3)}.`,
  )
  if (leaves > 1) bits.push(`Times ${leaves} leaves → total ≈ ${round(total, 3)} m.`)
  else bits.push(`Total 50×50 ≈ ${round(total, 3)} m.`)
  bits.push('')
  bits.push(
    `If you prefer a simpler frame like ${round(leafL, 3)}×2 + ${round(H, 3)}×2 + ${round(leafL, 3)} (no middle verticals), say so — I will assess that correction and, if approved, remember it for next gates.`,
  )
  bits.push('Type next when you accept this method, or send your preferred formula.')
  return bits.join('\n')
}

export const buildGateExplanation = (gate = {}, projectName = '', client = '') => {
  const W = money(gate.width)
  const H = money(gate.height)
  const type = gateTypeLabel(gate.gateType)
  const design = gateDesignLabel(gate.design)
  const spacing = money(gate.spacing) || DEFAULT_SPACING
  const openingL = gate.gateType === 'sliding' ? W + OVERLAP : W
  const leaves = gate.gateType === 'swing-double' ? 2 : 1

  const lines = [
    `I've reviewed your gate selection${projectName ? ` for ${projectName}` : ''}${
      client ? ` (client: ${client})` : ''
    }.`,
    '',
    `This is a ${type.toLowerCase()} with a ${design.toLowerCase()} finish.`,
    `Opening: ${W || '—'} m wide × ${H || '—'} m high.`,
  ]

  if (gate.gateType === 'sliding') {
    lines.push(
      `Because it slides, the leaf runs ${OVERLAP} m past the clear opening, so fabrication length is about ${round(openingL, 2)} m. Expect track, rollers, and a stopper on the installation side.`,
    )
  } else if (gate.gateType === 'swing-double') {
    lines.push(
      `Two leaves share the opening — each leaf is about ${round(openingL / 2, 2)} m wide. Hardware is typically 4 hinges, drop bolts, and a lock.`,
    )
  } else {
    lines.push(
      `A single leaf swings on hinges. Hardware is typically 2 hinges, a drop bolt, and a lock.`,
    )
  }

  if (gate.design === 'palisade') {
    lines.push(
      `Palisade looks open: 25×25 vertical tubes at ${spacing} m centres fill the leaf with a clear see-through gap. Frame is 50×50 tube.`,
    )
  } else if (gate.design === 'solid') {
    lines.push(
      `Solid / private cladding covers the full leaf with IBR sheet so you cannot see through. Frame remains 50×50 tube; sheet is measured by area (m²).`,
    )
  } else if (gate.design === 'half') {
    lines.push(
      `Half & half: IBR sheet on the bottom ~${Math.min(HALF_SHEET_H, H)} m, and 25×25 tubes above for the open top. Sheet uses area; tubes use length.`,
    )
  }

  if (leaves > 1) lines.push(`Quantities below are for both leaves combined.`)
  lines.push('')
  lines.push(
    'Type next when this description matches what you want, or tell me what to change (for example: “make it solid”, “spacing 0.10”, “sliding instead”).',
  )
  return lines.join('\n')
}

/** Apply free-text suggestions to gate draft + regenerate explanation. */
export const applyGateSuggestion = (gate = {}, text = '') => {
  const t = String(text).toLowerCase()
  const next = { ...gate }
  const notes = []

  if (/sliding/.test(t)) {
    next.gateType = 'sliding'
    notes.push('Switched to sliding.')
  } else if (/double|two leaf|2 leaf/.test(t)) {
    next.gateType = 'swing-double'
    notes.push('Switched to double swing.')
  } else if (/single|one leaf|1 leaf/.test(t)) {
    next.gateType = 'swing-single'
    notes.push('Switched to single swing.')
  }

  if (/solid|private|no see|ibr full|fully clad/.test(t)) {
    next.design = 'solid'
    notes.push('Design set to solid private.')
  } else if (/half/.test(t)) {
    next.design = 'half'
    notes.push('Design set to half & half.')
  } else if (/palisade|spears|open tubes|see.?through/.test(t)) {
    next.design = 'palisade'
    notes.push('Design set to palisade.')
  }

  const spacingMatch = t.match(/spacing\s*(?:of|=|:)?\s*([\d.]+)/i) || t.match(/([\d.]+)\s*m\s*spac/)
  if (spacingMatch) {
    next.spacing = spacingMatch[1]
    notes.push(`Spacing set to ${spacingMatch[1]} m.`)
  } else if (/high security|tight/.test(t)) {
    next.spacing = '0.10'
    notes.push('Spacing set to 0.10 m (high security).')
  }

  const widthMatch = t.match(/width\s*(?:of|=|:)?\s*([\d.]+)/i) || t.match(/([\d.]+)\s*m\s*wide/)
  if (widthMatch) {
    next.width = widthMatch[1]
    notes.push(`Width set to ${widthMatch[1]} m.`)
  }
  const heightMatch = t.match(/height\s*(?:of|=|:)?\s*([\d.]+)/i) || t.match(/([\d.]+)\s*m\s*high/)
  if (heightMatch) {
    next.height = heightMatch[1]
    notes.push(`Height set to ${heightMatch[1]} m.`)
  }

  return { gate: next, notes, changed: notes.length > 0 }
}

export const formatGateMaterialsSummary = (lines = []) => {
  if (!lines.length) return 'No materials calculated yet — check width, height, type, and design.'
  const midVerts = tube50MiddleVerticals()
  const body = lines
    .map(
      (row) =>
        `${row.material}: ${round(row.quantity, 2)} ${row.unitLabel} · ${row.description}${
          row.formula ? `\n  Formula: ${row.formula}` : ''
        }`,
    )
    .join('\n\n')
  const why50 =
    midVerts > 0
      ? `\n\nWhy 50×50 includes ${midVerts}×height: those are intermediate verticals between the end posts (stiffness / hinge & lock support). Ask “why 3×…” for a full breakdown, or send a correction if you prefer another method.`
      : `\n\n50×50 uses your remembered method (no middle verticals). Ask “why …” anytime, or send a new correction.`
  return `${body}${why50}`
}

export const formatGateTotalsSummary = (lines = []) => {
  if (!lines.length) return 'No totals yet.'
  return lines
    .map((row) => {
      const kind = row.measure === 'area' ? 'total area' : 'total length'
      return `${row.material} ${kind} = ${round(row.quantity, 2)} ${row.unitLabel}`
    })
    .join('\n')
}

export const safeEvalFormula = (expr = '') => {
  // Allow × ÷ and drop labels so "4.4×2 + 2×2" still evaluates.
  let cleaned = String(expr || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
  // Prefer text before "=" if present (left side is the working formula).
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

export const loadGateFormulaMemory = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(storage.getItem(GATE_FORMULA_MEMORY_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export const saveGateFormulaMemory = (memory) => {
  try {
    storage.setItem(GATE_FORMULA_MEMORY_KEY, JSON.stringify(memory || {}))
  } catch {
    /* ignore */
  }
}

/** Persist an edited formula + result for the next gate take-off. */
export const rememberGateFormula = (materialId, entry = {}) => {
  if (!materialId) return loadGateFormulaMemory()
  const memory = loadGateFormulaMemory()
  memory[materialId] = {
    formula: String(entry.formula || ''),
    quantity: entry.quantity != null && entry.quantity !== '' ? Number(entry.quantity) : null,
    material: entry.material || '',
    measure: entry.measure || 'length',
    unitLabel: entry.unitLabel || 'm',
    at: Date.now(),
  }
  saveGateFormulaMemory(memory)
  return memory
}

/** Drop a remembered formula so method-based rebuild can take over. */
export const forgetGateFormula = (materialId) => {
  if (!materialId) return loadGateFormulaMemory()
  const memory = loadGateFormulaMemory()
  delete memory[materialId]
  saveGateFormulaMemory(memory)
  return memory
}

/**
 * Offline assessment of a user correction for 50×50 frame.
 * Returns { adopt, reason, methodPatch } similar to fab-brain.
 */
export const assessLocalTube50Correction = (text = '', gate = {}) => {
  const W = money(gate.width)
  const H = money(gate.height)
  const gateType = gate.gateType || 'swing-single'
  const openingL = gateType === 'sliding' ? W + OVERLAP : W
  const leaves = gateType === 'swing-double' ? 2 : 1
  const leafL = gateType === 'swing-double' ? openingL / 2 : openingL
  const t = String(text || '')
  const evaluated = safeEvalFormula(t)
  const withMids = round(leafL * 2 + H * 2 + 3 * H + leafL, 3) * leaves
  const noMids = round(leafL * 2 + H * 2 + leafL, 3) * leaves
  const wantsNoMids =
    /no middle|without middle|drop (the )?middle|shouldn'?t.*(3\s*[x×]|middle)|not\s*3\s*[x×]|remove.*(3|middle)/i.test(
      t,
    ) ||
    (evaluated != null && Math.abs(evaluated - noMids) < 0.15 && Math.abs(evaluated - withMids) > 0.15)

  // Pattern like L×2 + H×2 + L (third term is a bare length, not N×H).
  const simpleFrame =
    /([0-9.]+)\s*[x×*]\s*2\s*\+\s*([0-9.]+)\s*[x×*]\s*2\s*\+\s*([0-9.]+)(?!\s*[x×*])/i.test(t) &&
    !/\+\s*[123]\s*[x×*]\s*[0-9.]+/i.test(t)

  if (wantsNoMids || simpleFrame) {
    return {
      adopt: true,
      reason:
        'Your formula matches a common fabricator take-off: top+bottom rails, two end posts, and one mid/lock rail — no intermediate verticals. That is a valid alternate to the Fortress default (3 middle uprights for stiffness).',
      methodPatch: {
        tube50: {
          middleVerticals: 0,
          formulaHint: 'leafL×2 + H×2 + leafL',
          notes: 'User correction: frame without 3 middle verticals',
        },
      },
    }
  }

  const midMatch = t.match(/(?:use|only|with)\s*([0-3])\s*(?:middle|mid|intermediate)/i)
  if (midMatch) {
    const n = Number(midMatch[1])
    return {
      adopt: true,
      reason: `Updating intermediate vertical count to ${n}.`,
      methodPatch: {
        tube50: {
          middleVerticals: n,
          formulaHint: n > 0 ? `leafL×2 + H×2 + ${n}×H + leafL` : 'leafL×2 + H×2 + leafL',
          notes: `User set middleVerticals=${n}`,
        },
      },
    }
  }

  return {
    adopt: false,
    reason:
      'Could not map that correction to a clear 50×50 frame method offline. Edit the formula box and tap Apply & remember, or rephrase (e.g. “should be 8.4×2 + 6×2 + 8.4”).',
    methodPatch: null,
  }
}

/** Overlay remembered formulas onto freshly built gate lines. */
export const applyRememberedGateFormulas = (lines = []) => {
  const memory = loadGateFormulaMemory()
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

export const applyGateLineOverrides = (lines = [], session = {}) => {
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

export const gatePriceRows = (lines = [], unitPrices = {}, pricing = {}) =>
  lines.map((row) => {
    const fallback = money(pricing[row.priceKey])
    const hasOverride = Object.prototype.hasOwnProperty.call(unitPrices || {}, row.id)
    const raw = hasOverride ? unitPrices[row.id] : undefined
    // Empty string means user cleared the box — keep it empty (don't snap back to list price).
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
      mode: row.measure === 'area' ? 'area' : 'length',
    }
  })

export const formatGateCostSummary = (priceRows = []) => {
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

export const deriveGateViews = (session, gate, pricing = {}) => {
  const base = session.lines?.length ? session.lines : buildGateMaterialLines(gate)
  const lines = applyGateLineOverrides(base, session)
  const priceRows = gatePriceRows(lines, session.unitPrices || {}, pricing)
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

export const pricingPatchFromGatePrices = (priceRows = []) => {
  const patch = {}
  priceRows.forEach((row) => {
    if (row.priceKey) patch[row.priceKey] = String(row.unitPrice)
  })
  return patch
}
