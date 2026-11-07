/** Intelligent steel-drawing brain: Vision extract → master template → auto schedule */

import { storage } from './storage.js'
import { apiUrl } from './native.js'
import { NETWORK_ACTIONS, offlineActionMessage, readOnline } from './offline.js'
import {
  buildRcColumnSchedule,
  isRcColumnDrawingType,
  formatRcColumnScript,
} from './rcColumnFormula.js'

export const FAB_MASTER_KEY = 'fortress-fab-master-template-v1'

const GATE_DRAWING_TYPES = new Set(['gate', 'burglar'])

/** Map vision/memory drawing_type → calc jobType (`gate` | `structure` | `rc_columns`). */
export const jobTypeFromDrawingType = (drawingType = '', hints = {}) => {
  const type = String(drawingType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
  if (GATE_DRAWING_TYPES.has(type)) return 'gate'
  if (isRcColumnDrawingType(type)) return 'rc_columns'
  const blob = `${hints.notes || ''} ${hints.name || ''} ${hints.label || ''}`.toLowerCase()
  if (/\bgate\b|burglar|palisade|sliding\s*gate|swing\s*gate/.test(blob)) return 'gate'
  if (
    /\bd0[12]\b|column\s*layout|fixing\s*detail|bar\s*bending|rebar|\by8\b|\by16\b|c20\s*\/?\s*25|rc\s*column/.test(
      blob,
    )
  ) {
    return 'rc_columns'
  }
  if (type && type !== 'unknown') return 'structure'
  return 'structure'
}

export const normalizeGateType = (value) => {
  const v = String(value || '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  if (v === 'sliding') return 'sliding'
  if (['swing-double', 'double', 'double-swing', 'double-leaf'].includes(v)) return 'swing-double'
  if (['swing-single', 'single', 'single-swing', 'swing', 'pedestrian'].includes(v)) return 'swing-single'
  return ''
}

export const normalizeGateDesign = (value) => {
  const v = String(value || '').toLowerCase()
  if (/palisade|spear|vertical\s*tube|25\s*[x×]\s*25/.test(v)) return 'palisade'
  if (/solid|private|ibr|sheet|clad|no\s*see/.test(v)) return 'solid'
  if (/half/.test(v)) return 'half'
  return ''
}

export const inferDrawingTypeFromText = (text = '') => {
  const t = String(text || '').toLowerCase()
  if (/burglar/.test(t)) return 'burglar'
  if (/\bgate\b|palisade|sliding\s*gate|swing\s*gate|driveway\s*gate/.test(t)) return 'gate'
  if (
    /\bd0[12]\b|column\s*layout|columns?\s*fixing|bar\s*bending\s*schedule|ground\s*floor\s*columns|y8\s*.*y16|c20\s*\/?\s*25/.test(
      t,
    )
  ) {
    return 'rc_columns'
  }
  if (/carport/.test(t)) return 'carport'
  if (/warehouse/.test(t)) return 'warehouse'
  if (/workshop/.test(t)) return 'workshop'
  if (/stair|staircase|stringer|tread/.test(t)) return 'staircase'
  if (/roof\s*plan/.test(t)) return 'roof_plan'
  if (/steel\s*schedule|purlin|girt|rafter|pfc\s*\d|h\s*\d{2,3}/.test(t)) return 'steel_structure'
  return 'unknown'
}

const SECTION_ALIASES = [
  { test: /h\s*120|120\s*[x×]\s*120/i, priceKey: 'h120PerM', defaultRate: '18', role: 'Columns' },
  { test: /pfc\s*150|150\s*[x×]\s*75/i, priceKey: 'pfc150PerM', defaultRate: '14', role: 'Rafters' },
  { test: /lc\s*150|150\s*lip|c\s*150/i, priceKey: 'lc150PerM', defaultRate: '7.50', role: 'Purlins' },
  { test: /lc\s*125|125\s*lip|c\s*125/i, priceKey: 'lc125PerM', defaultRate: '6.50', role: 'Purlins' },
  { test: /lc\s*100|100\s*lip|c\s*100/i, priceKey: 'lc100PerM', defaultRate: '5.20', role: 'Girts' },
  { test: /l\s*50|50\s*[x×]\s*50/i, priceKey: 'angle50PerM', defaultRate: '3.50', role: 'Braces' },
  { test: /plate|200\s*[x×]\s*200|base\s*plate/i, priceKey: 'platePerKg', defaultRate: '1.80', role: 'Plates' },
  { test: /m16.*8\.8|8\.8.*m16/i, priceKey: 'boltM16_88', defaultRate: '1.20', role: 'Bolts M16 8.8' },
  { test: /m16.*hd|hd.*m16|m16/i, priceKey: 'boltM16', defaultRate: '1.20', role: 'Bolts M16' },
  { test: /m12/i, priceKey: 'boltM12', defaultRate: '0.80', role: 'Bolts M12' },
]

export const emptyMasterTemplate = () => ({
  learned_from: '6x4.7m Workshop',
  learned_count: 1,
  patterns: {
    columns: 'H 120x120',
    rafters: 'PFC 150x75',
    purlins: 'LC 125',
    girts: 'LC 100',
    braces: 'L 50x50x5',
    has_steel_schedule: true,
    has_base_plates: true,
    formula: 'Total_Material = SUM(length * price) * 1.10',
    known_sections: [
      'H 120x120',
      'PFC 150x75',
      'LC 125',
      'LC 100',
      'L 50x50x5',
      '200x200x10',
      'M16 HD',
      'M16 8.8',
      'M12',
    ],
  },
  extractions: [],
  updatedAt: Date.now(),
})

export const loadMasterTemplate = () => {
  if (typeof window === 'undefined') return emptyMasterTemplate()
  try {
    return { ...emptyMasterTemplate(), ...JSON.parse(storage.getItem(FAB_MASTER_KEY) || '{}') }
  } catch {
    return emptyMasterTemplate()
  }
}

export const saveMasterTemplate = (master) => {
  try {
    storage.setItem(FAB_MASTER_KEY, JSON.stringify(master))
  } catch {
    /* ignore */
  }
}

const slugId = (text) =>
  String(text || 'item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'item'

export const matchSectionMeta = (size = '', roleHint = '') => {
  const hay = `${roleHint} ${size}`
  const hit = SECTION_ALIASES.find((item) => item.test.test(hay) || item.test.test(size))
  if (hit) return hit
  const key = `custom_${slugId(size)}`
  return {
    priceKey: key,
    defaultRate: '5.00',
    role: roleHint || 'Steel member',
    custom: true,
  }
}

const scheduleRowKey = (row = {}) => {
  const mark = String(row.mark || '')
    .trim()
    .toLowerCase()
  // Keep distinct marks / grid lines (A vs B, C1 vs C2) as separate rows.
  return `${row.role}|${row.section}|${row.priceKey}|${mark}`
}

const addNumericFields = (a = '', b = '') => {
  const left = Number(a)
  const right = Number(b)
  if (Number.isFinite(left) && Number.isFinite(right) && (left || right)) {
    const sum = left + right
    return Number.isInteger(sum) ? String(sum) : String(Number(sum.toFixed(3)))
  }
  return b || a || ''
}

const flattenExtracted = (extracted = {}) => {
  const rows = []
  const pushGroup = (list, role) => {
    ;(list || []).forEach((item, index) => {
      const size = item.size || item.section || item.grade || 'Unknown'
      const mark = String(item.mark || '').trim()
      const qty = Number(item.qty) || 0
      const total =
        Number(item.total_m) ||
        (Number(item.length_m) && qty ? Number(item.length_m) * qty : 0) ||
        0
      const meta = matchSectionMeta(size, role)
      const isPlate = /plate/i.test(role) || /plate|200x200/i.test(size)
      const isBolt = /bolt/i.test(role) || /^m\d+/i.test(size)
      rows.push({
        id: `${slugId(role)}-${slugId(mark || size)}-${index}`,
        role: meta.role || role,
        mark,
        section: size,
        unit: isPlate ? 'kg' : isBolt ? 'qty' : 'm',
        qty: String(qty || ''),
        meters: String(total || ''),
        kgEach: isPlate ? '3.14' : '',
        priceKey: meta.priceKey,
        defaultRate: meta.defaultRate,
        custom: Boolean(meta.custom),
      })
    })
  }
  pushGroup(extracted.columns, 'Columns')
  pushGroup(extracted.rafters, 'Rafters')
  pushGroup(extracted.purlins, 'Purlins')
  pushGroup(extracted.girts, 'Girts')
  pushGroup(extracted.braces, 'Braces')
  pushGroup(extracted.plates, 'Plates')
  pushGroup(extracted.bolts, 'Bolts')
  ;(extracted.other || []).forEach((item, index) => {
    const size = item.size || 'Other'
    const mark = String(item.mark || '').trim()
    const meta = matchSectionMeta(size, item.role || 'Other')
    rows.push({
      id: `other-${slugId(mark || size)}-${index}`,
      role: item.role || meta.role,
      mark,
      section: size,
      unit: item.unit || 'm',
      qty: String(item.qty || ''),
      meters: String(item.total_m || ''),
      kgEach: '',
      priceKey: meta.priceKey,
      defaultRate: meta.defaultRate,
      custom: Boolean(meta.custom),
    })
  })
  return rows
}

export const mergeScheduleWithExtraction = (extracted, previousSchedule = [], { replace = false } = {}) => {
  const drawingType = extracted?.drawing_type || extracted?.drawingType || ''
  if (isRcColumnDrawingType(drawingType) || extracted?.rebar?.length || extracted?.storeys?.length) {
    const rc = buildRcColumnSchedule(extracted)
    return {
      schedule: rc.schedule,
      addedSections: rc.schedule.map((row) => row.section).filter(Boolean),
      pricingUpdates: rc.pricingUpdates,
      building: extracted?.building || null,
      gate: null,
      drawingType: 'rc_columns',
      source: extracted?.source || 'schedule_read',
      notes: rc.notes || extracted?.notes || '',
      rcMeta: {
        netSteelKg: rc.netSteelKg,
        concreteM3: rc.concreteM3,
        formworkM2: rc.formworkM2,
        floorHeightM: rc.floorHeightM,
        storeys: rc.storeys,
      },
    }
  }
  const extractedRows = flattenExtracted(extracted)
  if (!extractedRows.length) {
    return {
      schedule: replace ? [] : previousSchedule,
      addedSections: [],
      pricingUpdates: {},
      building: extracted?.building || null,
      gate: extracted?.gate || null,
      drawingType: extracted?.drawing_type || extracted?.drawingType || '',
      source: extracted?.source || 'schedule_read',
      notes: extracted?.notes || '',
    }
  }
  const byKey = new Map()
  if (!replace) {
    previousSchedule.forEach((row) => {
      byKey.set(scheduleRowKey(row), row)
    })
  }
  const addedSections = []
  const pricingUpdates = {}
  extractedRows.forEach((row) => {
    const key = scheduleRowKey(row)
    const prev = byKey.get(key)
    if (prev) {
      // Same mark + size again (e.g. two schedule tables): add totals, do not drop the first.
      byKey.set(key, {
        ...prev,
        ...row,
        id: prev.id || row.id,
        mark: row.mark || prev.mark || '',
        qty: addNumericFields(prev.qty, row.qty),
        meters: addNumericFields(prev.meters, row.meters),
        kgEach: row.kgEach || prev.kgEach || '',
      })
    } else {
      byKey.set(key, row)
      addedSections.push(row.section)
    }
    if (row.priceKey) pricingUpdates[row.priceKey] = row.defaultRate
  })
  return {
    schedule: [...byKey.values()],
    addedSections: [...new Set(addedSections)],
    pricingUpdates,
    building: extracted?.building || null,
    gate: extracted?.gate || null,
    drawingType: extracted?.drawing_type || extracted?.drawingType || '',
    source: extracted?.source || 'schedule_read',
    notes: extracted?.notes || '',
  }
}

/** Human-readable take-off script for the confirm step (linked to meta / template). */
export const formatDrawingScript = ({
  drawingType = '',
  jobType = '',
  roofLength = '',
  roofWidth = '',
  wallArea = '',
  foundationPads = '',
  gate = null,
  schedule = [],
  notes = '',
  name = '',
  client = '',
  confirmNotes = '',
  rcStoreys = null,
} = {}) => {
  if (jobType === 'rc_columns' || isRcColumnDrawingType(drawingType)) {
    return formatRcColumnScript({
      name,
      client,
      schedule,
      confirmNotes: confirmNotes || notes,
      rcStoreys,
    })
  }
  const lines = []
  const type = drawingType || (jobType === 'gate' ? 'gate' : 'steel_structure')
  lines.push(`Drawing type: ${type.replace(/_/g, ' ')}.`)
  if (jobType === 'gate') {
    lines.push(
      `Opening size: ${gate?.width || '—'} m wide × ${gate?.height || '—'} m high.`,
    )
    if (gate?.gateType) lines.push(`Gate type: ${gate.gateType}.`)
    if (gate?.design) lines.push(`Design: ${gate.design}.`)
  } else {
    lines.push(`Overall dimensions: ${roofLength || '—'} m × ${roofWidth || '—'} m.`)
    if (wallArea) lines.push(`Wall / cladding area: ${wallArea} sqm.`)
    if (foundationPads) lines.push(`Foundation pads: ${foundationPads}.`)
  }
  lines.push('')
  lines.push('Materials from this drawing:')
  const rows = schedule || []
  if (!rows.length && jobType !== 'gate') {
    lines.push('— No steel members listed yet.')
  }
  rows.forEach((row) => {
    const label = row.mark
      ? `${row.role || 'Member'} ${row.mark}: ${row.section || '—'}`
      : `${row.role || 'Member'}: ${row.section || '—'}`
    const bits = [label]
    if (row.qty !== '' && row.qty != null) bits.push(`qty ${row.qty}`)
    if (row.unit === 'm' || row.meters) bits.push(`${row.meters || '—'} m total`)
    if (row.unit === 'kg' || row.kgEach) bits.push(`${row.kgEach || '—'} kg each`)
    if (row.unit === 'qty' && !row.meters) bits.push('each')
    lines.push(`• ${bits.join(' · ')}`)
  })
  if (notes) {
    lines.push('')
    lines.push(`Reader notes: ${notes}`)
  }
  return lines.join('\n')
}

export const projectToExtraction = (project = {}) => {
  const buckets = {
    columns: [],
    rafters: [],
    purlins: [],
    girts: [],
    braces: [],
    plates: [],
    bolts: [],
    other: [],
  }
  const roleBucket = (role = '') => {
    const r = String(role).toLowerCase()
    if (/column|stanchion/.test(r)) return 'columns'
    if (/rafter|beam/.test(r)) return 'rafters'
    if (/purlin/.test(r)) return 'purlins'
    if (/girt|rail/.test(r)) return 'girts'
    if (/brace|angle|cleat/.test(r)) return 'braces'
    if (/plate|base/.test(r)) return 'plates'
    if (/bolt/.test(r)) return 'bolts'
    return 'other'
  }
  ;(project.schedule || []).forEach((row) => {
    const bucket = roleBucket(row.role)
    const mark = String(row.mark || '').trim()
    const qty = Number(row.qty) || 0
    const total_m = Number(row.meters) || 0
    const length_m = qty > 0 && total_m ? Number((total_m / qty).toFixed(3)) : 0
    if (bucket === 'plates') {
      buckets.plates.push({ mark, size: row.section, qty, thickness_mm: null })
      return
    }
    if (bucket === 'bolts') {
      buckets.bolts.push({ grade: '', size: row.section, qty })
      return
    }
    if (bucket === 'other') {
      buckets.other.push({
        role: row.role || 'Steel member',
        mark,
        size: row.section,
        qty,
        total_m: total_m || null,
        unit: row.unit || 'm',
      })
      return
    }
    buckets[bucket].push({ mark, size: row.section, qty, length_m, total_m })
  })
  return {
    drawing_type: project.drawingType || 'steel_structure',
    source: 'confirmed',
    building: {
      length_m: Number(project.roofLength) || null,
      width_m: Number(project.roofWidth) || null,
      height_m: null,
      name: project.name || project.drawingName || null,
    },
    gate: null,
    ...buckets,
    notes: project.confirmNotes || project.drawingScript || '',
  }
}

export const FAB_NATURE_PRICES_KEY = 'fortress-fab-nature-prices-v1'

export const drawingNatureKey = ({ drawingType = '', building = {}, schedule = [] } = {}) => {
  const L = Math.round((Number(building?.length_m) || Number(building?.roofLength) || 0) * 2) / 2
  const W = Math.round((Number(building?.width_m) || Number(building?.roofWidth) || 0) * 2) / 2
  const type = String(drawingType || 'steel')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'steel'
  const sections = (schedule || [])
    .map((row) => String(row.section || '').toLowerCase().replace(/\s+/g, ''))
    .filter(Boolean)
    .sort()
    .slice(0, 14)
    .join('|')
  return `${type}|${L}x${W}|${sections}`
}

export const loadNaturePrices = () => {
  if (typeof window === 'undefined') return []
  try {
    const rows = JSON.parse(storage.getItem(FAB_NATURE_PRICES_KEY) || '[]')
    return Array.isArray(rows) ? rows : []
  } catch {
    return []
  }
}

export const saveNaturePrices = (rows) => {
  try {
    storage.setItem(FAB_NATURE_PRICES_KEY, JSON.stringify(rows.slice(0, 60)))
  } catch {
    /* ignore */
  }
}

export const findNaturePriceMemory = (natureKey, { drawingType = '', schedule = [] } = {}) => {
  const rows = loadNaturePrices()
  if (!rows.length) return null
  const exact = rows.find((row) => row.natureKey === natureKey)
  if (exact) return { ...exact, match: 'exact' }

  const type = String(drawingType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
  const sections = new Set(
    (schedule || []).map((row) => String(row.section || '').toLowerCase().replace(/\s+/g, '')).filter(Boolean),
  )
  let best = null
  let bestScore = 0
  rows.forEach((row) => {
    const rowType = String(row.drawingType || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
    if (type && rowType && type !== rowType) return
    const known = (row.sections || []).map((s) => String(s).toLowerCase().replace(/\s+/g, ''))
    if (!known.length || !sections.size) return
    let hit = 0
    known.forEach((section) => {
      if (sections.has(section)) hit += 1
    })
    const score = hit / Math.max(known.length, sections.size)
    if (score > bestScore) {
      bestScore = score
      best = row
    }
  })
  if (best && bestScore >= 0.75) return { ...best, match: 'similar', score: bestScore }
  return null
}

export const rememberNaturePrices = ({
  natureKey,
  drawingType = '',
  label = '',
  pricing = {},
  schedule = [],
  building = null,
} = {}) => {
  if (!natureKey) return
  const sections = (schedule || []).map((row) => row.section).filter(Boolean)
  const entry = {
    natureKey,
    drawingType,
    label,
    pricing: { ...pricing },
    sections,
    building,
    at: Date.now(),
  }
  const next = [entry, ...loadNaturePrices().filter((row) => row.natureKey !== natureKey)]
  saveNaturePrices(next)
  return entry
}

export const updateMasterFromExtraction = (master, extracted, label = 'New drawing') => {
  const next = {
    ...emptyMasterTemplate(),
    ...master,
    patterns: { ...emptyMasterTemplate().patterns, ...(master?.patterns || {}) },
  }
  const known = new Set(next.patterns.known_sections || [])
  const rows = flattenExtracted(extracted)
  rows.forEach((row) => {
    if (row.section) known.add(row.section)
  })
  if (extracted?.columns?.[0]?.size) next.patterns.columns = extracted.columns[0].size
  if (extracted?.rafters?.[0]?.size) next.patterns.rafters = extracted.rafters[0].size
  if (extracted?.purlins?.[0]?.size) next.patterns.purlins = extracted.purlins[0].size
  if (extracted?.girts?.[0]?.size) next.patterns.girts = extracted.girts[0].size
  if (extracted?.braces?.[0]?.size) next.patterns.braces = extracted.braces[0].size
  next.patterns.has_steel_schedule = true
  next.patterns.has_base_plates = Boolean(extracted?.plates?.length || next.patterns.has_base_plates)
  next.patterns.known_sections = [...known]
  next.patterns.formula = 'Total_Material = SUM(length * price) * 1.10'
  next.learned_from = extracted?.building?.name || label || next.learned_from
  next.learned_count = (next.learned_count || 0) + 1
  next.extractions = [
    {
      at: Date.now(),
      label: next.learned_from,
      building: extracted?.building || null,
      sections: rows.map((row) => row.section),
    },
    ...(next.extractions || []).slice(0, 19),
  ]
  next.updatedAt = Date.now()
  saveMasterTemplate(next)
  return next
}

const splitDataUrl = (dataUrl) => {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) throw new Error('Invalid drawing data')
  return { mime: match[1], base64: match[2] }
}

const visionExtractUrl = () => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VISION_API_URL) {
      return String(import.meta.env.VITE_VISION_API_URL)
    }
  } catch {
    /* ignore */
  }
  return apiUrl('/api/vision-extract')
}

/** Calls Fortress backend — Gemini API key never leaves the server. Limit: 10 drawings / min. */
export const extractSteelScheduleWithGemini = async (dataUrl, { corrections = '' } = {}) => {
  if (!readOnline()) {
    throw new Error(offlineActionMessage(NETWORK_ACTIONS.vision))
  }
  splitDataUrl(dataUrl) // validate early
  const url = visionExtractUrl()
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, corrections: String(corrections || '').trim() || undefined }),
    })
  } catch {
    throw new Error(
      'Could not reach the vision server. Run `npm run dev` (starts web + Gemini backend) and try again.',
    )
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Vision server failed')
  }
  if (!payload?.schedule) throw new Error('Vision server returned no schedule')
  return payload.schedule
}

/** Pull steel schedule rows from OCR / table text (Tesseract). */
export const parseSteelScheduleFromOcrText = (rawText = '') => {
  const text = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[–—]/g, '-')
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const buckets = {
    columns: [],
    rafters: [],
    purlins: [],
    girts: [],
    braces: [],
    plates: [],
    bolts: [],
    other: [],
  }

  const building = { length_m: null, width_m: null, height_m: null, name: null }
  const dimHit = text.match(
    /(?:span|size|building|footprint|overall)?\s*(\d+(?:\.\d+)?)\s*m\s*[x×]\s*(\d+(?:\.\d+)?)\s*m(?:\s*[x×]\s*(\d+(?:\.\d+)?)\s*m)?/i,
  )
  if (dimHit) {
    building.length_m = Number(dimHit[1]) || null
    building.width_m = Number(dimHit[2]) || null
    building.height_m = dimHit[3] ? Number(dimHit[3]) || null : null
  }
  const nameHit = text.match(/(?:project|building|workshop|carport|warehouse)[:\s-]+([A-Za-z0-9 /-]{3,40})/i)
  if (nameHit) building.name = nameHit[1].trim()

  const sectionRe =
    /\b((?:H|UB|UC|PFC|CHS|RHS|SHS|LC|L|EA|UA)\s*\d{2,3}(?:\s*[x×]\s*\d{2,3}(?:\s*[x×]\s*\d{1,2}(?:\.\d)?)?)?|\d{2,3}\s*[x×]\s*\d{2,3}\s*[x×]\s*\d{1,2}(?:\.\d)?|M\s*\d{1,2}(?:\s*(?:HD|8\.8))?)\b/i
  const numsRe = /(\d+(?:\.\d+)?)/g

  const roleFromHint = (line, size) => {
    const hay = `${line} ${size}`.toLowerCase()
    if (/column|col\b|stanchion/.test(hay) || /^h\s*\d/i.test(size) || /^ub|uc/i.test(size)) return 'columns'
    if (/rafter|beam|pfc/.test(hay)) return 'rafters'
    if (/purlin/.test(hay) || /lc\s*1[25]/i.test(size)) return 'purlins'
    if (/girt|rail/.test(hay) || /lc\s*100/i.test(size)) return 'girts'
    if (/brace|angle|cleat/.test(hay) || /^l\s*\d/i.test(size)) return 'braces'
    if (/plate|base\s*pl/.test(hay) || /\d+\s*[x×]\s*\d+\s*[x×]\s*\d+/i.test(size)) return 'plates'
    if (/bolt|m\s*\d{1,2}/i.test(hay) || /^m\s*\d/i.test(size)) return 'bolts'
    const meta = matchSectionMeta(size, '')
    if (/column/i.test(meta.role)) return 'columns'
    if (/rafter/i.test(meta.role)) return 'rafters'
    if (/purlin/i.test(meta.role)) return 'purlins'
    if (/girt/i.test(meta.role)) return 'girts'
    if (/brace/i.test(meta.role)) return 'braces'
    if (/plate/i.test(meta.role)) return 'plates'
    if (/bolt/i.test(meta.role)) return 'bolts'
    return 'other'
  }

  lines.forEach((line) => {
    if (/steel schedule|material list|bill of|drawing no|rev\b|sheet\b/i.test(line) && !sectionRe.test(line)) {
      return
    }
    // Side-by-side schedule columns often OCR as one line with several sizes — parse every match.
    const sizeMatches = [...line.matchAll(new RegExp(sectionRe.source, 'gi'))]
    if (!sizeMatches.length) return
    sizeMatches.forEach((sizeMatch, matchIndex) => {
      const size = sizeMatch[1].replace(/\s+/g, ' ').trim()
      const start = sizeMatch.index
      const end = start + sizeMatch[0].length
      const nextStart = sizeMatches[matchIndex + 1]?.index ?? line.length
      const after = line.slice(end, nextStart)
      const before = line.slice(matchIndex === 0 ? 0 : sizeMatches[matchIndex - 1].index + sizeMatches[matchIndex - 1][0].length, start)
      // Only numbers after the section size (before the next size) are qty / length / total.
      const nums = [...after.matchAll(numsRe)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n))
      let qty = 0
      let length_m = 0
      let total_m = 0
      if (nums.length >= 3) {
        qty = nums[0]
        length_m = nums[1]
        total_m = nums[2]
      } else if (nums.length === 2) {
        qty = nums[0]
        total_m = nums[1]
        length_m = qty ? Number((total_m / qty).toFixed(3)) : 0
      } else if (nums.length === 1) {
        qty = nums[0]
      }
      const bucket = roleFromHint(`${before} ${after}`, size)
      const markHit =
        before.match(/\b(?:grid|line|col(?:umn)?|mark)?\s*([A-Z]{1,3}\d{0,3})\b/i) ||
        before.match(/\b([A-Z]{1,3}\d{0,3})\b/)
      const row = {
        mark: markHit ? String(markHit[1]).toUpperCase() : '',
        size,
        qty: qty || 0,
        length_m: length_m || 0,
        total_m: total_m || (qty && length_m ? qty * length_m : 0),
      }
      if (bucket === 'plates') {
        buckets.plates.push({
          mark: row.mark,
          size,
          qty: row.qty,
          thickness_mm: (size.match(/[x×]\s*(\d{1,2}(?:\.\d)?)\s*$/) || [])[1]
            ? Number((size.match(/[x×]\s*(\d{1,2}(?:\.\d)?)\s*$/) || [])[1])
            : null,
        })
        return
      }
      if (bucket === 'bolts') {
        buckets.bolts.push({ grade: /8\.8/i.test(size) ? '8.8' : /hd/i.test(size) ? 'HD' : '', size, qty: row.qty })
        return
      }
      if (bucket === 'other') {
        buckets.other.push({
          role: 'Steel member',
          mark: row.mark,
          size,
          qty: row.qty,
          total_m: row.total_m,
          unit: 'm',
        })
        return
      }
      buckets[bucket].push(row)
    })
  })

  const found =
    buckets.columns.length +
    buckets.rafters.length +
    buckets.purlins.length +
    buckets.girts.length +
    buckets.braces.length +
    buckets.plates.length +
    buckets.bolts.length +
    buckets.other.length

  const drawing_type = inferDrawingTypeFromText(text)

  if (!found) {
    if (GATE_DRAWING_TYPES.has(drawing_type)) {
      return {
        drawing_type,
        source: 'schedule_read',
        building,
        gate: {
          width_m: building.width_m || building.length_m,
          height_m: building.height_m,
          gate_type: null,
          design: /palisade/.test(text.toLowerCase())
            ? 'palisade'
            : /ibr|sheet|solid/.test(text.toLowerCase())
              ? 'solid'
              : /half/.test(text.toLowerCase())
                ? 'half'
                : null,
        },
        columns: [],
        rafters: [],
        purlins: [],
        girts: [],
        braces: [],
        plates: [],
        bolts: [],
        other: [],
        notes: 'Gate / burglar detected on-device. Confirm opening size, type, and design.',
      }
    }
    throw new Error(
      'Tesseract could not find steel sizes in this drawing. Use a clearer photo of the schedule table, or try free Gemini.',
    )
  }

  return {
    drawing_type: drawing_type === 'unknown' ? 'steel_structure' : drawing_type,
    source: 'schedule_read',
    building,
    gate: null,
    ...buckets,
    notes: 'Parsed on-device with Tesseract OCR (free). Check quantities against the drawing.',
  }
}

export const extractSteelScheduleWithTesseract = async (dataUrl) => {
  const { mime } = splitDataUrl(dataUrl)
  if (/pdf/i.test(mime)) {
    throw new Error('Tesseract reads photos. Snap a picture of the schedule page, or use free Gemini for PDFs.')
  }
  const pkg = 'tesseract.js'
  const { createWorker } = await import(/* webpackIgnore: true */ pkg)
  const worker = await createWorker('eng')
  try {
    const {
      data: { text },
    } = await worker.recognize(dataUrl)
    return parseSteelScheduleFromOcrText(text)
  } finally {
    await worker.terminate()
  }
}

export const extractSteelSchedule = async (dataUrl, { provider = 'tesseract', corrections = '' } = {}) => {
  const mode = provider === 'openai' ? 'gemini' : provider || 'tesseract'
  if (mode === 'tesseract') return extractSteelScheduleWithTesseract(dataUrl)
  return extractSteelScheduleWithGemini(dataUrl, { corrections })
}
