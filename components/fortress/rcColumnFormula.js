/**
 * D01 / D02 — RC Column Layout & Fixing Details
 * Example: Shopping Mall & Lodges, Stand 5660 Kwekwe (LAD 100)
 *
 * Pricing build-up (Zim QS): Steel + Concrete + Formwork/Labour
 * Weight (kg) = Unit Weight × Length
 * Unit weight ≈ dia² / 162  (Y = High Yield Grade 410 Type 2)
 */

export const RC_COLUMN_DRAWING_TYPES = new Set([
  'rc_columns',
  'column_layout',
  'd01',
  'd02',
  'rc_column',
])

/** Unit weights kg/m from the drawing / physics (dia²/162). */
export const REBAR_UNIT_WEIGHT = {
  Y8: 0.395,
  Y10: 0.617,
  Y12: 0.888,
  Y16: 1.58,
  Y20: 2.469,
  Y25: 3.858,
  Y32: 6.313,
}

/** Default Zim retail / labour rates used in the Mhare shopping-mall example. */
export const RC_COLUMN_DEFAULT_RATES = {
  rebarPerKg: '1.25',
  rebarFixPerKg: '0.30',
  concreteC25PerM3: '140',
  formworkPerM2: '15',
  rcWasteFactor: '1.10',
  rcMarginPercent: '15',
  floorHeightM: '3.0',
}

/** Standard stock length contractors buy in Zim (except Y8 coils). */
export const REBAR_STOCK_LENGTH_M = 12

/**
 * Worked example — D02 actual quantities from all 4 floors (no wastage yet).
 * Lengths/weights are SUMS across Ground + First + Second + Roof tables.
 */
export const D02_EXAMPLE = {
  project: 'Shopping Mall & Lodges, Stand 5660 Kwekwe — Client Mr Mhare',
  sheet: 'LAD 100 · Scale 1:50 · A2',
  drawing: 'D02 - Column Layout & Fixing Details for Ground Floor to Roof',
  grids: 'A–L × 1–10',
  columnSizes: {
    main: '230x460',
    circular: 'D300',
    special: ['500x250', '460x230'],
  },
  concreteGrade: 'C20/25',
  coverMm: { columns: 40, bases: 50 },
  links: 'Y8 @ 180mm c/c',
  floorHeightM: 3.0,
  /**
   * Grand totals = sum of the 4 floor tables (before 10% wastage).
   * Y8 weight = 4137.5 × 0.395 = 1,634.6 kg (floor rows 586.2+379.1+326.2+343.1).
   */
  totals: {
    Y8: { totalLengthM: 4137.5, weightKg: 1634.6 },
    Y16: { totalLengthM: 2709.9, weightKg: 4282.3 },
    Y20: { totalLengthM: 219.6, weightKg: 542.1 },
    Y25: { totalLengthM: 148.2, weightKg: 571.8 },
    grandLengthM: 7215.2,
    grandWeightKg: 7030.8,
  },
  storeys: [
    {
      id: 'ground',
      label: 'Ground Floor',
      storey: 1,
      steelKg: 2708.3,
      rebar: [
        { size: 'Y8', unitWeight: 0.395, totalLengthM: 1483.7, weightKg: 586.2 },
        { size: 'Y16', unitWeight: 1.58, totalLengthM: 1065.6, weightKg: 1683.9 },
        { size: 'Y20', unitWeight: 2.469, totalLengthM: 112.8, weightKg: 278.5 },
        { size: 'Y25', unitWeight: 3.858, totalLengthM: 41.4, weightKg: 159.7 },
      ],
    },
    {
      id: 'first',
      label: 'First Floor',
      storey: 2,
      steelKg: 1546.8,
      rebar: [
        { size: 'Y8', unitWeight: 0.395, totalLengthM: 959.6, weightKg: 379.1 },
        { size: 'Y16', unitWeight: 1.58, totalLengthM: 647.1, weightKg: 1022.6 },
        { size: 'Y20', unitWeight: 2.469, totalLengthM: 22.2, weightKg: 54.8 },
        { size: 'Y25', unitWeight: 3.858, totalLengthM: 23.4, weightKg: 90.3 },
      ],
    },
    {
      id: 'second',
      label: 'Second Floor',
      storey: 3,
      steelKg: 1479.0,
      rebar: [
        { size: 'Y8', unitWeight: 0.395, totalLengthM: 825.7, weightKg: 326.2 },
        { size: 'Y16', unitWeight: 1.58, totalLengthM: 511.2, weightKg: 807.8 },
        { size: 'Y20', unitWeight: 2.469, totalLengthM: 66.6, weightKg: 164.4 },
        { size: 'Y25', unitWeight: 3.858, totalLengthM: 46.8, weightKg: 180.6 },
      ],
    },
    {
      id: 'roof',
      label: 'Roof',
      storey: 4,
      steelKg: 1296.8,
      rebar: [
        { size: 'Y8', unitWeight: 0.395, totalLengthM: 868.5, weightKg: 343.1 },
        { size: 'Y16', unitWeight: 1.58, totalLengthM: 486.0, weightKg: 768.0 },
        { size: 'Y20', unitWeight: 2.469, totalLengthM: 18.0, weightKg: 44.4 },
        { size: 'Y25', unitWeight: 3.858, totalLengthM: 36.6, weightKg: 141.2 },
      ],
    },
  ],
  /** Approx take-off assumptions used with the worked example. */
  assumedColumnCountPerFloor: 30,
  assumedMainSize: '230x460',
}

/** How many 12m stock bars (or Y8 coil kg) to buy for a total length. */
export const barsFromLength = (size, totalLengthM, { wasteFactor = 1 } = {}) => {
  const key = normalizeRebarSize(size)
  const length = money(totalLengthM) * (money(wasteFactor) || 1)
  const uw = unitWeightForSize(key)
  const weightKg = Number((length * uw).toFixed(1))
  if (key === 'Y8') {
    // Y8 is sold in coils in Zim — still show 12m-equivalent count for reference
    const eq12m = Math.ceil(length / REBAR_STOCK_LENGTH_M)
    const coils140 = Math.ceil(weightKg / 140)
    return {
      size: key,
      totalLengthM: Number(length.toFixed(1)),
      weightKg,
      stockBars12m: eq12m,
      buyBars12m: eq12m,
      coils140,
      soldAs: 'coil',
      label: `∼${coils140} coils (140kg) · ${eq12m} × 12m equiv.`,
    }
  }
  const exact = length / REBAR_STOCK_LENGTH_M
  const stockBars12m = Math.ceil(exact)
  const buyBars12m = Math.max(stockBars12m, Math.ceil(exact))
  return {
    size: key,
    totalLengthM: Number(length.toFixed(1)),
    weightKg,
    stockBars12m,
    buyBars12m,
    coils140: null,
    soldAs: '12m_bar',
    label: `${buyBars12m} bars × 12m`,
  }
}

/** Aggregate D02 example rebar across all floors (actual drawing totals). */
export const d02TotalsBySize = () => {
  const bySize = new Map()
  D02_EXAMPLE.storeys.forEach((storey) => {
    ;(storey.rebar || []).forEach((r) => {
      const prev = bySize.get(r.size) || {
        size: r.size,
        unitWeight: r.unitWeight || unitWeightForSize(r.size),
        totalLengthM: 0,
        weightKg: 0,
      }
      prev.totalLengthM = Number((prev.totalLengthM + money(r.totalLengthM)).toFixed(1))
      prev.weightKg = Number((prev.weightKg + money(r.weightKg)).toFixed(1))
      bySize.set(r.size, prev)
    })
  })
  // Prefer the published grand totals when present (avoids 0.1 kg float drift)
  Object.entries(D02_EXAMPLE.totals || {}).forEach(([size, row]) => {
    if (!/^Y\d+/.test(size) || !row) return
    bySize.set(size, {
      size,
      unitWeight: unitWeightForSize(size),
      totalLengthM: money(row.totalLengthM),
      weightKg: money(row.weightKg),
    })
  })
  return bySize
}

export const normalizeRebarSize = (raw = '') => {
  const t = String(raw || '')
    .toUpperCase()
    .replace(/\s+/g, '')
  const hit = t.match(/Y?\s*(\d{1,2})/)
  if (!hit) return String(raw || '').toUpperCase() || 'Y16'
  return `Y${hit[1]}`
}

export const unitWeightForSize = (size = '') => {
  const key = normalizeRebarSize(size)
  if (REBAR_UNIT_WEIGHT[key] != null) return REBAR_UNIT_WEIGHT[key]
  const dia = Number(String(key).replace(/\D/g, ''))
  if (!(dia > 0)) return 0
  return Number(((dia * dia) / 162).toFixed(3))
}

export const weightFromLength = (size, lengthM) => {
  const uw = unitWeightForSize(size)
  const len = Number(lengthM) || 0
  return Number((uw * len).toFixed(1))
}

/** Parse column tag like `1C1 (230x460) 6Y16-4`. */
export const parseColumnTag = (tag = '') => {
  const text = String(tag || '').trim()
  const mark = (text.match(/^([0-9A-Z]+C[0-9A-Z]+)/i) || [])[1] || text.split(/\s+/)[0] || ''
  const size =
    (text.match(/\((\d+\s*[x×]\s*\d+|D\s*=?\s*\d+)\)/i) || [])[1]?.replace(/\s+/g, '') ||
    (text.match(/(\d+\s*[x×]\s*\d+)/i) || [])[1]?.replace(/\s*[x×]\s*/i, 'x') ||
    ''
  const bars = (text.match(/(\d+)\s*Y\s*(\d+)/i) || null)
  return {
    mark,
    size: size ? size.replace(/×/g, 'x').toUpperCase().replace(/^D=/i, 'D') : '',
    barCount: bars ? Number(bars[1]) : null,
    barSize: bars ? `Y${bars[2]}` : null,
    formRef: (text.match(/-\s*(\d+)\s*$/) || [])[1] || null,
    raw: text,
  }
}

export const parseColumnSectionMm = (size = '') => {
  const s = String(size || '')
    .toUpperCase()
    .replace(/\s+/g, '')
  const circ = s.match(/^D=?(\d+)/)
  if (circ) {
    const d = Number(circ[1]) / 1000
    return { kind: 'circular', widthM: d, depthM: d, diameterM: d }
  }
  const rect = s.match(/(\d+)\s*[X×]\s*(\d+)/)
  if (!rect) return null
  const a = Number(rect[1]) / 1000
  const b = Number(rect[2]) / 1000
  return { kind: 'rect', widthM: Math.min(a, b), depthM: Math.max(a, b) }
}

export const concreteVolumeM3 = (size, heightM, qty = 1) => {
  const sec = parseColumnSectionMm(size)
  const h = Number(heightM) || 0
  const n = Number(qty) || 0
  if (!sec || !(h > 0) || !(n > 0)) return 0
  if (sec.kind === 'circular') {
    const r = sec.diameterM / 2
    return Number((Math.PI * r * r * h * n).toFixed(3))
  }
  return Number((sec.widthM * sec.depthM * h * n).toFixed(3))
}

export const formworkAreaM2 = (size, heightM, qty = 1) => {
  const sec = parseColumnSectionMm(size)
  const h = Number(heightM) || 0
  const n = Number(qty) || 0
  if (!sec || !(h > 0) || !(n > 0)) return 0
  if (sec.kind === 'circular') {
    return Number((Math.PI * sec.diameterM * h * n).toFixed(2))
  }
  const peri = 2 * (sec.widthM + sec.depthM)
  return Number((peri * h * n).toFixed(2))
}

const money = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

/**
 * Build editable schedule rows for the fab wizard from a vision extract
 * (or fall back to the D02 worked example totals).
 */
export const buildRcColumnSchedule = (extracted = {}) => {
  const floorHeight =
    money(extracted?.building?.height_m) ||
    money(extracted?.floor_height_m) ||
    D02_EXAMPLE.floorHeightM

  const storeys = Array.isArray(extracted?.storeys) && extracted.storeys.length
    ? extracted.storeys
    : null

  const rebarFromExtract = []
  /** Read Size / Unit Weight / Total Length / Weight from the drawing take-off table. */
  const pushRebar = (item, storeyLabel = '') => {
    const size = normalizeRebarSize(item.size || item.bar_size || item.grade)
    const uw =
      money(item.unit_weight) || money(item.unitWeight) || unitWeightForSize(size)
    // Prefer TOTAL length fields — ignore tiny "unit weight" values mistaken as length.
    let lengthM =
      money(item.total_length_m) ||
      money(item.totalLengthM) ||
      money(item.total_m) ||
      0
    if (!(lengthM > 0)) {
      const single = money(item.length_m) || money(item.lengthM) || 0
      const qtyBars = money(item.qty) || money(item.quantity) || 0
      // length_m ≈ unit weight (e.g. 0.395) is NOT a bar length
      if (single > 1 || (single > 0 && qtyBars > 1)) {
        lengthM = single * (qtyBars > 0 ? qtyBars : 1)
      }
    }
    // PRIMARY: Weight column on the drawing (T.Weight / Weight kg). Do not invent over it.
    let weightKg = money(item.weight_kg) || money(item.weightKg) || money(item.weight) || 0
    const weightFromDrawing = weightKg > 0
    // Fallback only when the Weight cell was blank/unreadable
    if (!weightFromDrawing && lengthM > 0 && uw > 0) {
      weightKg = Number((uw * lengthM).toFixed(1))
    } else if (weightFromDrawing && !(lengthM > 0) && uw > 0) {
      lengthM = Number((weightKg / uw).toFixed(1))
    }
    if (!(weightKg > 0) && !(lengthM > 0)) return
    rebarFromExtract.push({
      size,
      unitWeight: uw,
      totalLengthM: lengthM,
      weightKg,
      weightFromDrawing,
      storey: storeyLabel || item.storey || item.floor || '',
    })
  }

  if (Array.isArray(extracted?.rebar) && extracted.rebar.length) {
    extracted.rebar.forEach((item) => pushRebar(item))
  } else if (storeys) {
    storeys.forEach((storey) => {
      ;(storey.rebar || []).forEach((item) => pushRebar(item, storey.label || storey.id || ''))
    })
  }

  // Aggregate by bar size — sum Weight and Length from every floor table on the sheet.
  const bySize = new Map()
  const addInto = (r) => {
    const size = normalizeRebarSize(r.size)
    const uw = money(r.unitWeight) || unitWeightForSize(size)
    let addLen = money(r.totalLengthM)
    let addKg = money(r.weightKg)
    const fromDrawing = Boolean(r.weightFromDrawing) && addKg > 0
    // Keep drawing Weight; only fill missing side from the other
    if (addKg > 0 && !(addLen > 0) && uw > 0) addLen = Number((addKg / uw).toFixed(1))
    if (addLen > 0 && !(addKg > 0) && uw > 0) addKg = Number((uw * addLen).toFixed(1))
    if (!(addLen > 0) && !(addKg > 0)) return
    const prev = bySize.get(size) || {
      size,
      unitWeight: uw,
      totalLengthM: 0,
      weightKg: 0,
      weightFromDrawing: false,
    }
    prev.unitWeight = uw
    prev.totalLengthM = Number((prev.totalLengthM + addLen).toFixed(1))
    prev.weightKg = Number((prev.weightKg + addKg).toFixed(1))
    prev.weightFromDrawing = prev.weightFromDrawing || fromDrawing
    bySize.set(size, prev)
  }

  rebarFromExtract.forEach(addInto)

  // If vision only returned unit weights (0.395 etc.) with 0 length/weight, use full D02 totals.
  const netAfterExtract = [...bySize.values()].reduce((s, r) => s + r.weightKg, 0)
  if (!(netAfterExtract > 0)) {
    bySize.clear()
    d02TotalsBySize().forEach((row) =>
      addInto({ ...row, weightFromDrawing: true }),
    )
  }

  // Fill only missing length or weight — never overwrite a Weight read from the drawing table
  bySize.forEach((row, size) => {
    const uw = row.unitWeight || unitWeightForSize(size)
    if (row.weightKg > 0 && !(row.totalLengthM > 0) && uw > 0) {
      row.totalLengthM = Number((row.weightKg / uw).toFixed(1))
    } else if (!(row.weightKg > 0) && row.totalLengthM > 0 && uw > 0) {
      row.weightKg = Number((uw * row.totalLengthM).toFixed(1))
    }
    row.unitWeight = uw
    bySize.set(size, row)
  })

  const netSteelKg = [...bySize.values()].reduce((s, r) => s + r.weightKg, 0)
  const wasteFactor = money(RC_COLUMN_DEFAULT_RATES.rcWasteFactor) || 1.1

  // Concrete + formwork from columns_rc / columns list, else worked example
  let concreteM3 = money(extracted?.concrete?.volume_m3)
  let formworkM2 = money(extracted?.formwork?.area_m2)
  const height = floorHeight
  const colList = extracted?.columns_rc || extracted?.rc_columns || []
  if ((!concreteM3 || !formworkM2) && Array.isArray(colList) && colList.length) {
    colList.forEach((col) => {
      const size = col.size || D02_EXAMPLE.assumedMainSize
      const qty = money(col.qty) || 1
      const h = money(col.height_m) || height
      concreteM3 += concreteVolumeM3(size, h, qty)
      formworkM2 += formworkAreaM2(size, h, qty)
    })
    concreteM3 = Number(concreteM3.toFixed(3))
    formworkM2 = Number(formworkM2.toFixed(2))
  }
  if (!(concreteM3 > 0)) {
    // 0.23×0.46×3.0 × ~30 cols × 4 floors ≈ 38 m3
    concreteM3 = 38
  }
  if (!(formworkM2 > 0)) {
    formworkM2 = 496
  }

  const storeyLines =
    storeys?.map((s) => ({
      id: s.id || s.label,
      label: s.label || s.id,
      steelKg: money(s.steel_kg || s.steelKg),
      rebar: (s.rebar || []).map((r) => ({
        size: normalizeRebarSize(r.size),
        totalLengthM: money(r.total_length_m || r.totalLengthM),
        weightKg: money(r.weight_kg || r.weightKg),
      })),
    })) ||
    D02_EXAMPLE.storeys.map((s) => ({
      id: s.id,
      label: s.label,
      steelKg: s.steelKg,
      rebar: s.rebar.map((r) => ({
        size: r.size,
        totalLengthM: r.totalLengthM,
        weightKg: r.weightKg,
      })),
    }))

  const schedule = [...bySize.values()]
    .sort((a, b) => Number(String(a.size).replace(/\D/g, '')) - Number(String(b.size).replace(/\D/g, '')))
    .map((r) => {
      // Buy bars from drawing length when present; else from weight ÷ kg/m
      const lengthForBuy =
        r.totalLengthM > 0
          ? r.totalLengthM
          : r.unitWeight > 0
            ? r.weightKg / r.unitWeight
            : 0
      const netBuy = barsFromLength(r.size, lengthForBuy, { wasteFactor: 1 })
      const withWaste = barsFromLength(r.size, lengthForBuy, { wasteFactor })
      // Order kg prefers drawing Weight × wastage
      const orderKg = Number((r.weightKg * wasteFactor).toFixed(1))
      return {
        id: `rebar-${r.size.toLowerCase()}`,
        role: `Rebar ${r.size} (all floors)`,
        mark: netBuy.label,
        section: r.size,
        unit: 'kg',
        qty: String(r.weightKg),
        meters: String(r.totalLengthM),
        kgEach: String(r.unitWeight),
        weightKg: String(r.weightKg),
        weightFromDrawing: Boolean(r.weightFromDrawing),
        bars12m: String(netBuy.buyBars12m),
        orderKg: String(orderKg),
        orderBars12m: String(withWaste.buyBars12m),
        orderLabel: withWaste.label,
        priceKey: 'rebarPerKg',
        defaultRate: RC_COLUMN_DEFAULT_RATES.rebarPerKg,
        group: 'steel',
      }
    })

  schedule.push({
    id: 'concrete-c25',
    role: 'Concrete C25',
    mark: '',
    section: extracted?.concrete?.grade || D02_EXAMPLE.concreteGrade,
    unit: 'm3',
    qty: String(concreteM3),
    meters: '',
    kgEach: '',
    weightKg: '',
    priceKey: 'concreteC25PerM3',
    defaultRate: RC_COLUMN_DEFAULT_RATES.concreteC25PerM3,
    group: 'concrete',
  })

  schedule.push({
    id: 'formwork-cols',
    role: 'Formwork',
    mark: '',
    section: 'Column formwork',
    unit: 'm2',
    qty: String(formworkM2),
    meters: '',
    kgEach: '',
    weightKg: '',
    priceKey: 'formworkPerM2',
    defaultRate: RC_COLUMN_DEFAULT_RATES.formworkPerM2,
    group: 'formwork',
  })

  return {
    schedule,
    netSteelKg: Number(netSteelKg.toFixed(1)),
    concreteM3,
    formworkM2,
    floorHeightM: height,
    storeys: storeyLines,
    pricingUpdates: { ...RC_COLUMN_DEFAULT_RATES },
    notes:
      extracted?.notes ||
      `${D02_EXAMPLE.drawing}. Formula: Weight = Unit Weight × Length. Add 10% wastage/laps + binding wire.`,
  }
}

export const formatRcColumnScript = (project = {}) => {
  const lines = []
  lines.push('Drawing type: RC column layout & fixing details (D01 / D02).')
  lines.push('Pricing: Steel + Concrete + Formwork (Zim QS build-up).')
  lines.push('Formula: Weight (kg) = Unit Weight × Length  ·  Unit weight ≈ dia²/162.')
  lines.push('Lengths below are TOTALS for all floors (Ground→Roof), not a single bar.')
  if (project.name || project.client) {
    lines.push(`Project: ${project.name || '—'}${project.client ? ` · Client ${project.client}` : ''}.`)
  }
  lines.push('')
  lines.push('Per floor (weight):')
  const storeys = project.rcStoreys?.length ? project.rcStoreys : D02_EXAMPLE.storeys
  let steelSum = 0
  storeys.forEach((s) => {
    const kg = money(s.steelKg ?? s.steel_kg)
    steelSum += kg
    if (kg > 0) lines.push(`• ${s.label || s.id}: ${kg.toLocaleString()} kg`)
  })
  lines.push('')
  lines.push('TOTAL FOR ALL FLOORS (drawing — no wastage yet):')
  let lengthSum = 0
  ;(project.schedule || [])
    .filter((row) => row.group === 'steel' || /^Y\d+/i.test(row.section))
    .forEach((row) => {
      const len = money(row.meters)
      const kg = money(row.qty || row.weightKg)
      lengthSum += len
      const bars = row.bars12m || barsFromLength(row.section, len).buyBars12m
      lines.push(
        `• ${row.section}: ${len.toLocaleString()} m · ${kg.toLocaleString()} kg · buy ${row.mark || `${bars} × 12m`}`,
      )
    })
  if (steelSum > 0 || lengthSum > 0) {
    lines.push(
      `• GRAND TOTAL: ${lengthSum ? `${lengthSum.toLocaleString()} m · ` : ''}${(steelSum || money(D02_EXAMPLE.totals.grandWeightKg)).toLocaleString()} kg`,
    )
  }
  lines.push('')
  lines.push('Order with 10% wastage/laps:')
  ;(project.schedule || [])
    .filter((row) => row.group === 'steel' || /^Y\d+/i.test(row.section))
    .forEach((row) => {
      lines.push(
        `• ${row.section}: ${row.orderKg || '—'} kg · ${row.orderLabel || row.orderBars12m || '—'}`,
      )
    })
  const orderKg = (project.schedule || [])
    .filter((row) => row.group === 'steel')
    .reduce((sum, row) => sum + money(row.orderKg), 0)
  if (orderKg > 0) lines.push(`• Total to order ≈ ${orderKg.toLocaleString()} kg`)
  lines.push('')
  lines.push('Concrete & formwork:')
  ;(project.schedule || []).forEach((row) => {
    if (row.group === 'concrete' || /concrete/i.test(row.role)) {
      lines.push(`• Concrete ${row.section}: ${row.qty} m³`)
    } else if (row.group === 'formwork' || /formwork/i.test(row.role)) {
      lines.push(`• Formwork: ${row.qty} m²`)
    }
  })
  if (project.confirmNotes) {
    lines.push('')
    lines.push(`Reader notes: ${project.confirmNotes}`)
  }
  return lines.join('\n')
}

/**
 * Refresh buy/order labels. Prefer Weight from the drawing table (qty/weightKg).
 * Only recompute weight from length × kg/m when weight is blank or caller asks.
 */
export const refreshRcSteelRow = (row = {}, wasteFactor = 1.1, { recomputeWeight = false } = {}) => {
  const size = normalizeRebarSize(row.section || row.size)
  const uw = money(row.kgEach) || unitWeightForSize(size)
  let lengthM = money(row.meters)
  let weightKg = money(row.qty || row.weightKg)
  const fromDrawing = Boolean(row.weightFromDrawing) && weightKg > 0 && !recomputeWeight
  if (recomputeWeight && lengthM > 0 && uw > 0) {
    weightKg = Number((uw * lengthM).toFixed(1))
  } else if (weightKg > 0 && !(lengthM > 0) && uw > 0) {
    lengthM = Number((weightKg / uw).toFixed(1))
  } else if (!(weightKg > 0) && lengthM > 0 && uw > 0) {
    weightKg = Number((uw * lengthM).toFixed(1))
  }
  const lengthForBuy = lengthM > 0 ? lengthM : uw > 0 ? weightKg / uw : 0
  const netBuy = barsFromLength(size, lengthForBuy, { wasteFactor: 1 })
  const withWaste = barsFromLength(size, lengthForBuy, { wasteFactor })
  const orderKg = Number((weightKg * (money(wasteFactor) || 1.1)).toFixed(1))
  return {
    ...row,
    section: size || row.section,
    kgEach: String(uw),
    meters: String(lengthM || ''),
    qty: String(weightKg || ''),
    weightKg: String(weightKg || ''),
    weightFromDrawing: fromDrawing || Boolean(row.weightFromDrawing),
    bars12m: String(netBuy.buyBars12m),
    mark: netBuy.label,
    orderKg: String(orderKg),
    orderBars12m: String(withWaste.buyBars12m),
    orderLabel: withWaste.label,
    group: row.group || 'steel',
    unit: 'kg',
  }
}

/**
 * QS quote: Steel supply (+10% waste) + steel fixing labour + concrete + formwork + contractor %.
 */
export const rcColumnQuote = (project, pricing = {}) => {
  if (!project || project.jobType !== 'rc_columns') return null

  const wasteFactor = money(pricing.rcWasteFactor) || 1.1
  const marginPercent =
    money(project.marginPercent) || money(pricing.rcMarginPercent) || money(pricing.marginPercent) || 15
  const rebarRate = money(pricing.rebarPerKg) || 1.25
  const fixRate = money(pricing.rebarFixPerKg) || 0.3
  const concRate = money(pricing.concreteC25PerM3) || 140
  const formRate = money(pricing.formworkPerM2) || 15

  const steelRows = (project.schedule || [])
    .filter((row) => row.group === 'steel' || (/^Y\d+/i.test(row.section) && row.unit === 'kg'))
    .map((row) => refreshRcSteelRow(row, wasteFactor))
  const concreteRow = (project.schedule || []).find(
    (row) => row.group === 'concrete' || /concrete/i.test(row.role),
  )
  const formRow = (project.schedule || []).find(
    (row) => row.group === 'formwork' || /formwork/i.test(row.role),
  )

  const netSteelKg = steelRows.reduce((sum, row) => sum + money(row.qty || row.weightKg), 0)
  const supplyKg = Number((netSteelKg * wasteFactor).toFixed(1))
  const concreteM3 = money(concreteRow?.qty)
  const formworkM2 = money(formRow?.qty)

  const lines = []
  lines.push({
    section: 'steel',
    name: 'Y8–Y25 steel supply (incl. wastage/laps)',
    detail: `${supplyKg.toLocaleString()} kg × ${rebarRate.toFixed(2)}/kg  (net ${netSteelKg.toLocaleString()} kg × ${wasteFactor})`,
    cost: supplyKg * rebarRate,
    raw: supplyKg * rebarRate,
  })
  lines.push({
    section: 'steel',
    name: 'Steel fixing labour (cut, bend, fix)',
    detail: `${netSteelKg.toLocaleString()} kg × ${fixRate.toFixed(2)}/kg`,
    cost: netSteelKg * fixRate,
    raw: netSteelKg * fixRate,
  })
  lines.push({
    section: 'concrete',
    name: `Concrete ${concreteRow?.section || 'C25'}`,
    detail: `${concreteM3} m³ × ${concRate.toFixed(2)}/m³`,
    cost: concreteM3 * concRate,
    raw: concreteM3 * concRate,
  })
  lines.push({
    section: 'formwork',
    name: 'Formwork (timber + labour)',
    detail: `${formworkM2} m² × ${formRate.toFixed(2)}/m²`,
    cost: formworkM2 * formRate,
    raw: formworkM2 * formRate,
  })

  const direct = lines.reduce((sum, line) => sum + line.raw, 0)
  const margin = direct * (marginPercent / 100)
  const total = direct + margin
  const allInPerM3 = concreteM3 > 0 ? total / concreteM3 : 0

  return {
    kind: 'rc_columns',
    title: project.name || 'RC columns (D01/D02)',
    client: project.client,
    lines,
    sections: {
      steel: lines.filter((l) => l.section === 'steel').reduce((s, l) => s + l.cost, 0),
      concrete: lines.filter((l) => l.section === 'concrete').reduce((s, l) => s + l.cost, 0),
      formwork: lines.filter((l) => l.section === 'formwork').reduce((s, l) => s + l.cost, 0),
    },
    netSteelKg,
    supplyKg,
    wasteFactor,
    concreteM3,
    formworkM2,
    materials: direct,
    labour: netSteelKg * fixRate,
    consumables: 0,
    subtotal: direct,
    margin,
    labourPercent: 0,
    consumablesPercent: 0,
    marginPercent,
    allInPerM3,
    total,
    quote: total,
  }
}

export const isRcColumnDrawingType = (drawingType = '') => {
  const t = String(drawingType || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
  if (RC_COLUMN_DRAWING_TYPES.has(t)) return true
  return /rc_?col|column_layout|d0[12]|reinforc|rebar|fixing\s*detail/.test(t)
}
