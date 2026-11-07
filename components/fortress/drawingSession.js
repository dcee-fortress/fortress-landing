/**
 * Chat-driven drawing take-off session: phase machine + derived views.
 * Used for D01/D02, steel structure, and gates that have a drawing.
 */

import { storage } from './storage.js'
import { unitWeightForSize, normalizeRebarSize } from './rcColumnFormula.js'
import { formatDrawingScript } from './steelVision.js'

/** Remembered take-off formulas (system memory) for drawing totals. */
export const QTY_FORMULA_MEMORY_KEY = 'fortress-fab-qty-formulas-v1'

export const loadQtyFormulaMemory = () => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = JSON.parse(storage.getItem(QTY_FORMULA_MEMORY_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

export const rememberQtyFormula = (materialId, entry = {}) => {
  if (!materialId) return loadQtyFormulaMemory()
  const memory = loadQtyFormulaMemory()
  memory[materialId] = {
    formula: String(entry.formula || ''),
    quantity: entry.quantity != null && entry.quantity !== '' ? Number(entry.quantity) : null,
    material: entry.material || '',
    at: Date.now(),
  }
  try {
    storage.setItem(QTY_FORMULA_MEMORY_KEY, JSON.stringify(memory))
  } catch {
    /* ignore */
  }
  return memory
}

export const DRAWING_PHASES = Object.freeze([
  'upload',
  'explain',
  'materials_lengths',
  'edit_lengths',
  'length_totals',
  'edit_length_totals',
  'weight_schedule',
  'edit_weights',
  'weight_products',
  'unit_prices',
  'cost_summary',
  'boq',
])

export const DEFAULT_BOQ_PERCENTS = Object.freeze({
  labourPercent: '10',
  consumablesPercent: '15',
  transportPercent: '10',
})

const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const round = (n, places = 2) => {
  const f = 10 ** places
  return Math.round((Number(n) || 0) * f) / f
}

export const usesWeightPath = (jobType) => jobType === 'rc_columns'

export const createEmptyDrawingSession = () => ({
  phase: 'upload',
  messages: [],
  lines: [],
  lengthOverrides: {},
  totalOverrides: {},
  formulaOverrides: {},
  weightOverrides: {},
  unitPrices: {},
  labourPercent: DEFAULT_BOQ_PERCENTS.labourPercent,
  consumablesPercent: DEFAULT_BOQ_PERCENTS.consumablesPercent,
  transportPercent: DEFAULT_BOQ_PERCENTS.transportPercent,
  busy: false,
  error: '',
})

/** Approximate gate take-off lengths when vision returned dims but no schedule. */
export const linesFromGateDraft = (gate = {}) => {
  const W = money(gate.width)
  const H = money(gate.height)
  if (!(W > 0 && H > 0)) return []
  const gateType = gate.gateType || 'swing-single'
  const design = gate.design || 'palisade'
  const spacing = money(gate.spacing) || 0.12
  const openingL = gateType === 'sliding' ? W + 0.4 : W
  const leaves = gateType === 'swing-double' ? 2 : 1
  const leafL = gateType === 'swing-double' ? openingL / 2 : openingL
  const frame50One = leafL * 2 + H * 2 + 3 * H + leafL
  const barCountOne = Math.floor(leafL / spacing + 1e-9)
  const barClearH = Math.max(0, H - 0.1)
  const sheetH = Math.min(0.9, H)
  const topH = Math.max(0, H - sheetH)
  let tube25One = 0
  let sheetOne = 0
  if (design === 'palisade') tube25One = barCountOne * barClearH * 1.1
  else if (design === 'solid') sheetOne = leafL * H
  else if (design === 'half') {
    sheetOne = leafL * sheetH
    tube25One = barCountOne * topH * 1.1
  }
  const rows = [
    {
      id: 'gate-tube50',
      material: '50x50 tube',
      description: 'Frame 50×50',
      section: '50x50',
      unit: 'm',
      lengthM: round(frame50One * leaves, 2),
      parts: [{ id: 'gate-tube50-p', label: 'Frame 50×50', lengthM: round(frame50One * leaves, 2) }],
      priceKey: 'tube50PerM',
      kgPerM: 0,
      weightKg: 0,
      scheduleId: 'gate-tube50',
    },
  ]
  if (tube25One > 0) {
    rows.push({
      id: 'gate-tube25',
      material: '25x25 tube',
      description: 'Infill 25×25',
      section: '25x25',
      unit: 'm',
      lengthM: round(tube25One * leaves, 2),
      parts: [{ id: 'gate-tube25-p', label: 'Infill 25×25', lengthM: round(tube25One * leaves, 2) }],
      priceKey: 'tube25PerM',
      kgPerM: 0,
      weightKg: 0,
      scheduleId: 'gate-tube25',
    })
  }
  if (sheetOne > 0) {
    rows.push({
      id: 'gate-sheet',
      material: 'Sheet',
      description: 'Cladding sheet',
      section: 'Sheet',
      unit: 'm',
      lengthM: round(sheetOne * leaves, 2),
      parts: [{ id: 'gate-sheet-p', label: 'Sheet area as length proxy', lengthM: round(sheetOne * leaves, 2) }],
      priceKey: 'sheetPerM2',
      kgPerM: 0,
      weightKg: 0,
      scheduleId: 'gate-sheet',
    })
  }
  if (gateType === 'sliding' && openingL > 0) {
    rows.push({
      id: 'gate-uchannel',
      material: 'U-channel',
      description: 'Sliding track',
      section: 'U-channel',
      unit: 'm',
      lengthM: round(openingL, 2),
      parts: [{ id: 'gate-uchannel-p', label: 'Track', lengthM: round(openingL, 2) }],
      priceKey: 'uChannelPerM',
      kgPerM: 0,
      weightKg: 0,
      scheduleId: 'gate-uchannel',
    })
  }
  return rows
}

/** Build editable material lines from a project schedule. */
export const linesFromSchedule = (schedule = [], jobType = 'structure', gate = null) => {
  const rows = Array.isArray(schedule) ? schedule : []
  if (!rows.length && jobType === 'gate') return linesFromGateDraft(gate || {})
  if (jobType === 'rc_columns') {
    return rows
      .filter((row) => row.group === 'steel' || /^Y\d+/i.test(row.section || ''))
      .map((row, index) => {
        const material = normalizeRebarSize(row.section) || row.section || `Item ${index + 1}`
        const lengthM = money(row.meters)
        const parts = [{ id: row.id || `part-${index}`, label: row.role || material, lengthM }]
        return {
          id: row.id || `line-${material}-${index}`,
          material,
          description: row.role || `Rebar ${material}`,
          section: row.section || material,
          unit: 'm',
          lengthM,
          parts,
          priceKey: row.priceKey || 'rebarPerKg',
          kgPerM: money(row.kgEach) || unitWeightForSize(material),
          weightKg: money(row.weightKg || row.qty),
          scheduleId: row.id,
        }
      })
  }

  return rows.map((row, index) => {
    const material = row.section || row.role || `Item ${index + 1}`
    const lengthM =
      row.unit === 'm' || money(row.meters) > 0
        ? money(row.meters)
        : money(row.qty)
    const parts = [
      {
        id: row.id || `part-${index}`,
        label: [row.role, row.mark].filter(Boolean).join(' ') || material,
        lengthM,
      },
    ]
    return {
      id: row.id || `line-${index}`,
      material,
      description: [row.role, row.mark].filter(Boolean).join(' · ') || material,
      section: row.section || '',
      unit: row.unit === 'kg' ? 'kg' : row.unit === 'qty' ? 'qty' : 'm',
      lengthM,
      parts,
      priceKey: row.priceKey || '',
      kgPerM: money(row.kgEach),
      weightKg: row.unit === 'kg' ? money(row.qty) * (money(row.kgEach) || 1) : 0,
      scheduleId: row.id,
    }
  })
}

export const applyLengthOverrides = (lines = [], overrides = {}) =>
  lines.map((line) => {
    const raw = overrides[line.id]
    if (raw == null || raw === '') return line
    const lengthM = money(raw)
    return {
      ...line,
      lengthM,
      parts: [{ id: `${line.id}-override`, label: line.description || line.material, lengthM }],
    }
  })

/** Aggregate total length (or qty) by material key. */
export const aggregateLengthTotals = (lines = []) => {
  const map = new Map()
  lines.forEach((line) => {
    const key = String(line.material || line.section || line.id).trim() || line.id
    const prev = map.get(key) || {
      id: key,
      material: key,
      description: line.description || key,
      lengthM: 0,
      unit: line.unit || 'm',
      priceKey: line.priceKey || '',
      kgPerM: line.kgPerM || 0,
      parts: [],
      lineIds: [],
    }
    prev.lengthM = round(prev.lengthM + money(line.lengthM), 3)
    prev.parts = [
      ...prev.parts,
      ...(line.parts || []).map((p) => ({
        ...p,
        label: p.label || line.description || key,
      })),
    ]
    prev.lineIds.push(line.id)
    if (!prev.priceKey && line.priceKey) prev.priceKey = line.priceKey
    if (!(prev.kgPerM > 0) && line.kgPerM > 0) prev.kgPerM = line.kgPerM
    map.set(key, prev)
  })
  return [...map.values()]
}

export const applyTotalOverrides = (totals = [], overrides = {}, formulaOverrides = {}) =>
  totals.map((row) => {
    const remembered = loadQtyFormulaMemory()[row.id]
    let formula =
      formulaOverrides[row.id] != null && formulaOverrides[row.id] !== ''
        ? String(formulaOverrides[row.id])
        : remembered?.formula || lengthFormula(row)
    let lengthM = money(row.lengthM)
    const raw = overrides[row.id]
    if (raw != null && raw !== '') {
      lengthM = money(raw)
    } else if (formulaOverrides[row.id] || remembered?.formula) {
      // lazy import-safe eval: only digits/operators after normalizing
      const cleaned = String(formula)
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .split('=')[0]
        .replace(/[^0-9+\-*/().\s]/g, '')
      if (cleaned.trim()) {
        try {
          // eslint-disable-next-line no-new-func
          const n = Function(`"use strict"; return (${cleaned})`)()
          if (Number.isFinite(n) && n >= 0) lengthM = n
        } catch {
          /* keep lengthM */
        }
      } else if (remembered?.quantity != null) {
        lengthM = money(remembered.quantity)
      }
    }
    return {
      ...row,
      lengthM: round(lengthM, 3),
      formula,
      fromMemory: Boolean(remembered?.formula || formulaOverrides[row.id]),
      formulaManual: raw != null && raw !== '',
    }
  })

/** Excel-like formula string for a total row's parts. */
export const lengthFormula = (totalRow = {}) => {
  if (totalRow.formula) return String(totalRow.formula)
  const parts = totalRow.parts || []
  if (!parts.length) return String(round(totalRow.lengthM, 3))
  const bits = parts.map((p) => round(money(p.lengthM), 3))
  const sum = round(
    bits.reduce((s, n) => s + n, 0),
    3,
  )
  return `${bits.join(' + ')} = ${sum}`
}

export const weightRowsFromTotals = (totals = [], weightOverrides = {}) =>
  totals.map((row) => {
    const material = normalizeRebarSize(row.material) || row.material
    const fromOverride = weightOverrides[row.id] ?? weightOverrides[material]
    const kgPerM =
      fromOverride != null && fromOverride !== ''
        ? money(fromOverride)
        : money(row.kgPerM) || unitWeightForSize(material)
    const lengthM = money(row.lengthM)
    const totalKg = round(lengthM * kgPerM, 2)
    return {
      ...row,
      material,
      kgPerM,
      lengthM,
      totalKg,
      productLabel: `${round(lengthM, 2)} m × ${round(kgPerM, 3)} kg/m = ${totalKg} kg`,
    }
  })

export const priceRowsFromSession = ({
  jobType = 'structure',
  totals = [],
  weightRows = [],
  unitPrices = {},
  pricing = {},
}) => {
  if (usesWeightPath(jobType)) {
    return weightRows.map((row) => {
      const key = row.priceKey || 'rebarPerKg'
      const fallback = money(pricing[key] ?? pricing.rebarPerKg)
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
      const weight = money(row.totalKg)
      const totalPrice = round(weight * unitPrice, 2)
      return {
        id: row.id,
        material: row.material,
        description: row.description || row.material,
        quantity: weight,
        quantityLabel: `${round(weight, 2)} kg`,
        unit: 'kg',
        unitPrice,
        unitPriceInput,
        totalPrice,
        priceKey: key,
        mode: 'weight',
      }
    })
  }

  return totals.map((row) => {
    const key = row.priceKey || ''
    const fallback = key ? money(pricing[key]) : 0
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
    const lengthM = money(row.lengthM)
    const totalPrice = round(lengthM * unitPrice, 2)
    return {
      id: row.id,
      material: row.material,
      description: row.description || row.material,
      quantity: lengthM,
      quantityLabel: `${round(lengthM, 2)} m`,
      unit: 'm',
      unitPrice,
      unitPriceInput,
      totalPrice,
      priceKey: key,
      mode: 'length',
    }
  })
}

export const materialCostTotal = (priceRows = []) =>
  round(
    priceRows.reduce((sum, row) => sum + money(row.totalPrice), 0),
    2,
  )

export const computeBoq = ({
  materialCost = 0,
  labourPercent = DEFAULT_BOQ_PERCENTS.labourPercent,
  consumablesPercent = DEFAULT_BOQ_PERCENTS.consumablesPercent,
  transportPercent = DEFAULT_BOQ_PERCENTS.transportPercent,
} = {}) => {
  const materials = money(materialCost)
  const labourPct = money(labourPercent)
  const consumablesPct = money(consumablesPercent)
  const transportPct = money(transportPercent)
  const labour = round(materials * (labourPct / 100), 2)
  const consumables = round(materials * (consumablesPct / 100), 2)
  const transport = round(materials * (transportPct / 100), 2)
  const total = round(materials + labour + consumables + transport, 2)
  return {
    materials,
    labour,
    labourPercent: labourPct,
    consumables,
    consumablesPercent: consumablesPct,
    transport,
    transportPercent: transportPct,
    total,
  }
}

/** Advance phase; RC gets weight steps, structure/gate skip them. */
export const getNextPhase = (phase, jobType) => {
  const order = DRAWING_PHASES
  const idx = order.indexOf(phase)
  if (idx < 0) return 'upload'
  let next = order[idx + 1]
  if (!next) return phase
  if (!usesWeightPath(jobType)) {
    while (next && ['weight_schedule', 'edit_weights', 'weight_products'].includes(next)) {
      const i = order.indexOf(next)
      next = order[i + 1]
    }
  }
  return next || phase
}

export const getPrevPhase = (phase, jobType) => {
  const order = DRAWING_PHASES
  const idx = order.indexOf(phase)
  if (idx <= 0) return 'upload'
  let prev = order[idx - 1]
  if (!usesWeightPath(jobType)) {
    while (prev && ['weight_schedule', 'edit_weights', 'weight_products'].includes(prev)) {
      const i = order.indexOf(prev)
      prev = order[i - 1]
    }
  }
  return prev || 'upload'
}

export const isNextCommand = (text = '') => {
  const t = String(text).trim().toLowerCase()
  return t === 'next' || t === 'nxt' || t === 'continue' || t === '→' || t === '->'
}

/** ChatGPT-style prose explanation from project + schedule. */
export const buildDrawingExplanation = (project = {}) => {
  const jobType = project.jobType || 'structure'
  const typeLabel =
    jobType === 'rc_columns'
      ? 'an RC column layout drawing (D01/D02 style)'
      : jobType === 'gate'
        ? 'a gate / burglar fabrication drawing'
        : 'a steel structure fabrication drawing'

  const intro = [
    `I've reviewed ${project.drawingName ? `"${project.drawingName}"` : 'this drawing'}.`,
    `It reads as ${typeLabel}${project.name ? ` for ${project.name}` : ''}${
      project.client ? ` (client: ${project.client})` : ''
    }.`,
  ]

  const body = formatDrawingScript({
    drawingType: project.drawingType,
    jobType: project.jobType,
    roofLength: project.roofLength,
    roofWidth: project.roofWidth,
    wallArea: project.wallArea,
    foundationPads: project.foundationPads,
    gate: project.gate,
    schedule: project.schedule,
    notes: project.confirmNotes || '',
    name: project.name,
    client: project.client,
    confirmNotes: project.confirmNotes || '',
    rcStoreys: project.rcStoreys,
  })

  const outro =
    jobType === 'rc_columns'
      ? '\n\nNext I will list each rebar size with its total length from the take-off. Type next when you are ready, or tell me what to correct.'
      : '\n\nNext I will list each material and its length. Type next when you are ready, or tell me what looks wrong.'

  return [...intro, '', body, outro].join('\n')
}

export const formatLengthsSummary = (lines = []) => {
  if (!lines.length) return 'No materials with lengths were found on this drawing yet.'
  return lines
    .map((line) => {
      const qty =
        line.unit === 'm' || !line.unit
          ? `${round(line.lengthM, 2)} m`
          : line.unit === 'kg'
            ? `${round(line.lengthM, 2)} kg`
            : `${round(line.lengthM, 2)}`
      return `${line.material} = ${qty}${line.description && line.description !== line.material ? ` · ${line.description}` : ''}`
    })
    .join('\n')
}

export const formatTotalsSummary = (totals = []) => {
  if (!totals.length) return 'No material totals yet.'
  return totals
    .map((row) => {
      const unit = row.unit === 'm' || !row.unit ? 'm' : row.unit
      return `${row.material} total length is ${round(row.lengthM, 2)}${unit === 'm' ? 'm' : ` ${unit}`}`
    })
    .join('\n')
}

export const formatWeightScheduleSummary = (weightRows = []) => {
  if (!weightRows.length) return 'No weight schedule yet.'
  return weightRows
    .map((row) => `${row.material}: ${round(row.kgPerM, 3)} kg/m`)
    .join('\n')
}

export const formatWeightProductsSummary = (weightRows = []) => {
  if (!weightRows.length) return 'No weight products yet.'
  return weightRows.map((row) => `${row.material}: ${row.productLabel}`).join('\n')
}

export const formatCostSummary = (priceRows = []) => {
  if (!priceRows.length) return 'No material costs yet.'
  return priceRows
    .map((row) => `${row.material} = $${round(row.totalPrice, 2).toFixed(2)}`)
    .join('\n')
}

export const syncScheduleFromLines = (schedule = [], lines = [], jobType = 'structure') => {
  const byId = new Map(lines.map((l) => [l.scheduleId || l.id, l]))
  return (schedule || []).map((row) => {
    const line = byId.get(row.id)
    if (!line) return row
    if (jobType === 'rc_columns' && (row.group === 'steel' || /^Y\d+/i.test(row.section || ''))) {
      const lengthM = money(line.lengthM)
      const kgPerM = money(line.kgPerM) || unitWeightForSize(row.section)
      const weightKg = money(line.weightKg) || round(lengthM * kgPerM, 1)
      return {
        ...row,
        meters: String(lengthM),
        kgEach: String(kgPerM),
        qty: String(weightKg),
        weightKg: String(weightKg),
      }
    }
    if (row.unit === 'm' || money(row.meters) > 0) {
      return { ...row, meters: String(money(line.lengthM)) }
    }
    return { ...row, qty: String(money(line.lengthM)) }
  })
}

export const pricingPatchFromUnitPrices = (priceRows = []) => {
  const patch = {}
  priceRows.forEach((row) => {
    if (row.priceKey) patch[row.priceKey] = String(row.unitPrice)
  })
  return patch
}

export const deriveSessionViews = (session, project, pricing = {}) => {
  const jobType = project?.jobType || 'structure'
  const baseLines =
    session.lines?.length > 0
      ? session.lines
      : linesFromSchedule(project?.schedule || [], jobType, project?.gate)
  const lines = applyLengthOverrides(baseLines, session.lengthOverrides || {})
  const totalsBase = aggregateLengthTotals(lines)
  const totals = applyTotalOverrides(
    totalsBase,
    session.totalOverrides || {},
    session.formulaOverrides || {},
  )
  const weightRows = usesWeightPath(jobType)
    ? weightRowsFromTotals(totals, session.weightOverrides || {})
    : []
  const priceRows = priceRowsFromSession({
    jobType,
    totals,
    weightRows,
    unitPrices: session.unitPrices || {},
    pricing,
  })
  const materialCost = materialCostTotal(priceRows)
  const boq = computeBoq({
    materialCost,
    labourPercent: session.labourPercent,
    consumablesPercent: session.consumablesPercent,
    transportPercent: session.transportPercent,
  })
  return { jobType, lines, totals, weightRows, priceRows, materialCost, boq }
}
