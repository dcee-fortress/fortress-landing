import { SITE_ACTIVITIES } from "@/lib/activities"
import { rememberMaterialScheduleDescriptions } from "@/lib/boqDescriptionMemory"
import {
  ACTUAL_COST_ON_SITE_LABEL,
} from "@/lib/earnedValueTable"
import { dayIdFromDate, parseDayId } from "@/lib/dailyFiles"
import {
  buildResolvedNumericGrid,
  evaluateFormula,
  isFormula,
  resolveNumericField,
} from "@/lib/materialScheduleFormulas"
import {
  calculateDailyRate,
  calculateFuelCost,
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
  formatMaterialRate,
  parsePlantCostAmount,
  roundMaterialAmount,
} from "@/lib/plantCostCalculations"
import { createLocalStorageCache } from "@/lib/storageCache"

export const MATERIAL_SCHEDULE_STORAGE_KEY = "grove-material-schedules"
export const MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY = "grove-material-schedule-drafts"

const materialScheduleStore = createLocalStorageCache(MATERIAL_SCHEDULE_STORAGE_KEY, {})
const materialScheduleDraftStore = createLocalStorageCache(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY, {})

export const ACTUAL_COST_SCHEDULE_TYPE = "value-earned"

export const MATERIAL_SCHEDULE_TYPES = {
  [ACTUAL_COST_SCHEDULE_TYPE]: {
    label: ACTUAL_COST_ON_SITE_LABEL,
    shortLabel: ACTUAL_COST_ON_SITE_LABEL,
    field: "valueEarned",
  },
}

export const MATERIAL_SCHEDULE_COLUMNS = [
  { key: "date", label: "Date", align: "left", editable: true, columnLetter: "A" },
  {
    key: "activityDescription",
    label: "Activity description",
    align: "left",
    editable: true,
    columnLetter: "B",
  },
  { key: "plantName", label: "Plant name", align: "left", editable: true, columnLetter: "C" },
  {
    key: "fuelAllocated",
    label: "Fuel allocated",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "D",
  },
  {
    key: "fuelPrice",
    label: "Fuel price",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "E",
  },
  {
    key: "fuelCost",
    label: "Fuel cost",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "F",
  },
  {
    key: "plantHire",
    label: "Plant hire",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "G",
  },
  {
    key: "laborCost",
    label: "Labor cost",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "H",
  },
  {
    key: "totalCost",
    label: "Total cost",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "I",
  },
  { key: "unit", label: "Unit", align: "left", editable: true, columnLetter: "J" },
  {
    key: "production",
    label: "Production",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "K",
  },
  {
    key: "rate",
    label: "Rate",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "L",
  },
]

const MATERIAL_FORMULA_FIELDS = [
  "fuelAllocated",
  "fuelPrice",
  "fuelCost",
  "plantHire",
  "laborCost",
  "totalCost",
  "production",
  "rate",
]

export function getMaterialFormulaFieldKey(columnKey) {
  return `${columnKey}Formula`
}

export function formatMaterialScheduleDate(dayId) {
  const date = dayId ? parseDayId(dayId) : new Date()
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function emptyFormulaFields() {
  return Object.fromEntries(MATERIAL_FORMULA_FIELDS.map((key) => [getMaterialFormulaFieldKey(key), ""]))
}

export function isValidMaterialScheduleType(type) {
  return type in MATERIAL_SCHEDULE_TYPES
}

export function getMaterialScheduleHref(projectId, dayId, slotId, scheduleType) {
  return `/project/${projectId}/dashboard/daily-value/${dayId}/hourly/${slotId}/material-schedule/${scheduleType}`
}

export function getHourlyDashboardHref(projectId, dayId) {
  return `/project/${projectId}/dashboard/daily-value/${dayId}`
}

function readStore() {
  return materialScheduleStore.read()
}

function writeStore(store) {
  materialScheduleStore.write(store)
}

function readDraftStore() {
  return materialScheduleDraftStore.read()
}

function writeDraftStore(store) {
  materialScheduleDraftStore.write(store)
}

function serializeDraftRows(rows, dayId) {
  const defaultDate = formatMaterialScheduleDate(dayId)

  return rows.map((row) =>
    serializeMaterialRow({
      ...row,
      date: rowBelongsToDay(row, dayId) ? row.date?.trim() || defaultDate : defaultDate,
    })
  )
}

export function removeMaterialSchedulesForProject(projectId) {
  const store = readStore()
  const draftStore = readDraftStore()
  const prefix = `${projectId}::`

  for (const key of Object.keys(store)) {
    if (key.startsWith(prefix)) {
      delete store[key]
    }
  }

  for (const key of Object.keys(draftStore)) {
    if (key.startsWith(prefix)) {
      delete draftStore[key]
    }
  }

  writeStore(store)
  writeDraftStore(draftStore)
}

export function clearAllMaterialSchedules() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(MATERIAL_SCHEDULE_STORAGE_KEY)
  window.localStorage.removeItem(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY)
  materialScheduleStore.invalidate()
  materialScheduleDraftStore.invalidate()
}

export function purgeTargetCostMaterialSchedules() {
  if (typeof window === "undefined") return false

  const store = readStore()
  const draftStore = readDraftStore()
  let changed = false

  for (const key of Object.keys(store)) {
    if (key.endsWith("::target-earned-value")) {
      delete store[key]
      changed = true
    }
  }

  for (const key of Object.keys(draftStore)) {
    if (key.endsWith("::target-earned-value")) {
      delete draftStore[key]
      changed = true
    }
  }

  if (changed) {
    writeStore(store)
    writeDraftStore(draftStore)
  }

  return changed
}

function scheduleKey(projectId, dayId, slotId, scheduleType) {
  return `${projectId}::${dayId}::${slotId}::${scheduleType}`
}

function isDayId(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? ""))
}

function parseMaterialDateToDayId(dateStr) {
  const trimmed = String(dateStr ?? "").trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (!day || !month || !year) return null

  const parsed = new Date(year, month - 1, day)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null
  }

  return dayIdFromDate(parsed)
}

function rowBelongsToDay(row, dayId) {
  const rowDayId = parseMaterialDateToDayId(row.date)
  if (!rowDayId) return true
  return rowDayId === dayId
}

function filterRowsForDay(rows, dayId) {
  return rows.filter((row) => rowBelongsToDay(migrateLegacyRow(row), dayId))
}

function parseScheduleStoreKey(key) {
  const parts = key.split("::")
  if (parts.length === 3) {
    return {
      projectId: parts[0],
      dayId: null,
      slotId: parts[1],
      scheduleType: parts[2],
      legacy: true,
    }
  }

  if (parts.length === 4 && isDayId(parts[1])) {
    return {
      projectId: parts[0],
      dayId: parts[1],
      slotId: parts[2],
      scheduleType: parts[3],
      legacy: false,
    }
  }

  return null
}

export function migrateLegacyMaterialScheduleKeys() {
  if (typeof window === "undefined") return false

  const store = readStore()
  let changed = false

  for (const key of Object.keys(store)) {
    const parsed = parseScheduleStoreKey(key)
    if (!parsed?.legacy) continue

    const rows = store[key]
    delete store[key]
    changed = true

    if (!Array.isArray(rows) || rows.length === 0) {
      continue
    }

    const rowsByDay = new Map()
    for (const row of rows.map(migrateLegacyRow)) {
      const rowDayId = parseMaterialDateToDayId(row.date)
      if (!rowDayId) continue

      const bucket = rowsByDay.get(rowDayId) ?? []
      bucket.push(row)
      rowsByDay.set(rowDayId, bucket)
    }

    for (const [rowDayId, dayRows] of rowsByDay) {
      const nextKey = scheduleKey(parsed.projectId, rowDayId, parsed.slotId, parsed.scheduleType)
      if (!store[nextKey]?.length) {
        store[nextKey] = dayRows.map(serializeMaterialRow)
      }
    }
  }

  if (changed) {
    writeStore(store)
  }

  return changed
}

export function scrubMisdatedMaterialScheduleRows() {
  if (typeof window === "undefined") return false

  const store = readStore()
  let changed = false

  for (const key of Object.keys(store)) {
    const parsed = parseScheduleStoreKey(key)
    if (!parsed || parsed.legacy || !parsed.dayId) continue

    const rows = store[key]
    if (!Array.isArray(rows) || rows.length === 0) continue

    const filtered = filterRowsForDay(rows, parsed.dayId)
    if (filtered.length === rows.length) continue

    changed = true
    if (filtered.length === 0) {
      delete store[key]
    } else {
      store[key] = filtered.map(serializeMaterialRow)
    }
  }

  if (changed) {
    writeStore(store)
  }

  return changed
}

function parseNumber(value) {
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeDescription(description) {
  return String(description ?? "").trim().toLowerCase()
}

function normalizeActivityDescription(row) {
  return (
    row.activityDescription?.trim() ||
    row.description?.trim() ||
    row.activityDone?.trim() ||
    ""
  )
}

function descriptionToId(description) {
  const normalized = String(description ?? "").trim()
  if (!normalized) return `activity-${Math.random().toString(36).slice(2, 9)}`
  return normalized.toLowerCase().replace(/\s+/g, "-")
}

function migrateFormulaFields(row) {
  const next = {
    ...emptyFormulaFields(),
    ...row,
  }

  for (const key of MATERIAL_FORMULA_FIELDS) {
    const formulaKey = getMaterialFormulaFieldKey(key)
    if (isFormula(row[key]) && !row[formulaKey]) {
      next[formulaKey] = String(row[key]).trim()
      const evaluated = evaluateFormula(row[key])
      next[key] = evaluated === null ? "" : String(evaluated)
    }
  }

  return next
}

function migrateLegacyRow(row) {
  const activityDescription = normalizeActivityDescription(row)
  const plantName = row.plantName?.trim() || row.materialEquipment?.trim() || ""

  if (row.date !== undefined && activityDescription) {
    return migrateFormulaFields({
      ...row,
      activityDescription,
      plantName,
      fuelAllocated: row.fuelAllocated ?? "",
      fuelPrice: row.fuelPrice ?? "",
      fuelCost: row.fuelCost ?? "",
      plantHire: row.plantHire ?? "",
      laborCost: row.laborCost ?? "",
      production: row.production ?? "",
      unit: row.unit ?? "",
      totalCost: row.totalCost ?? "",
      rate: row.rate ?? "",
    })
  }

  if (row.activityId) {
    const activity = SITE_ACTIVITIES.find(
      (item) => item.description.toLowerCase().replace(/\s+/g, "-") === row.activityId
    )
    if (activity) {
      const legacyTotal = parseNumber(row.totalCost ?? row.amount ?? 0)
      return migrateFormulaFields({
        ...row,
        date: row.date ?? "",
        activityDescription: activity.description,
        plantName: plantName || (row.material ?? ""),
        fuelAllocated: "",
        fuelPrice: "",
        fuelCost: "",
        plantHire: legacyTotal,
        laborCost: "",
        production: parseNumber(row.quantity),
        unit: row.unit ?? "",
        totalCost: "",
        rate: "",
      })
    }
  }

  const legacyTotal = parseNumber(row.totalCost ?? row.amount ?? 0)
  if (legacyTotal > 0 || activityDescription) {
    return migrateFormulaFields({
      ...row,
      date: row.date ?? "",
      activityDescription,
      plantName,
      fuelAllocated: row.fuelAllocated ?? "",
      fuelPrice: row.fuelPrice ?? "",
      fuelCost: row.fuelCost ?? "",
      plantHire: row.plantHire ?? (legacyTotal || ""),
      laborCost: row.laborCost ?? "",
      production: row.production ?? parseNumber(row.quantity),
      unit: row.unit ?? "",
      totalCost: row.totalCost ?? "",
      rate: row.rate ?? "",
    })
  }

  return migrateFormulaFields(row)
}

export function calculateMaterialTotalCost(fuelCost, plantHire, laborCost) {
  if (fuelCost === null && plantHire === null && laborCost === null) {
    return null
  }

  return (
    Math.round(((fuelCost ?? 0) + (plantHire ?? 0) + (laborCost ?? 0)) * 100) / 100
  )
}

export function createMaterialRow(activityDescription = "", dayId = null) {
  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: formatMaterialScheduleDate(dayId),
    activityDescription,
    plantName: "",
    fuelAllocated: "",
    fuelPrice: "",
    fuelCost: "",
    plantHire: "",
    laborCost: "",
    totalCost: "",
    unit: "",
    production: "",
    rate: "",
    ...emptyFormulaFields(),
  }
}

function hasManualNumericValue(raw, key) {
  const value = raw?.[key]
  return value !== undefined && value !== null && String(value).trim() !== "" && !isFormula(value)
}

function computeDerivedValues(rawRows, resolvedGrid, rowIndex) {
  const raw = migrateLegacyRow(rawRows[rowIndex])

  const fuelAllocated = resolveNumericField(rawRows, resolvedGrid, rowIndex, "fuelAllocated")
  const fuelPrice = resolveNumericField(rawRows, resolvedGrid, rowIndex, "fuelPrice")
  const plantHire = resolveNumericField(rawRows, resolvedGrid, rowIndex, "plantHire")
  const laborCost = resolveNumericField(rawRows, resolvedGrid, rowIndex, "laborCost")
  const production = resolveNumericField(rawRows, resolvedGrid, rowIndex, "production")

  let fuelCost = null
  if (raw.fuelCostFormula || hasManualNumericValue(raw, "fuelCost")) {
    fuelCost = resolveNumericField(rawRows, resolvedGrid, rowIndex, "fuelCost")
  } else {
    fuelCost = calculateFuelCost(fuelAllocated, fuelPrice)
  }

  let totalCost = null
  if (raw.totalCostFormula || hasManualNumericValue(raw, "totalCost")) {
    totalCost = resolveNumericField(rawRows, resolvedGrid, rowIndex, "totalCost")
  } else {
    totalCost = calculateMaterialTotalCost(fuelCost, plantHire, laborCost)
  }

  let rate = null
  if (raw.rateFormula || hasManualNumericValue(raw, "rate")) {
    rate = resolveNumericField(rawRows, resolvedGrid, rowIndex, "rate")
  } else {
    rate = calculateDailyRate(totalCost, production)
  }

  resolvedGrid[rowIndex] = {
    fuelAllocated,
    fuelPrice,
    plantHire,
    laborCost,
    production: roundMaterialAmount(production) ?? 0,
    fuelCost: roundMaterialAmount(fuelCost) ?? 0,
    totalCost: roundMaterialAmount(totalCost) ?? 0,
    rate: roundMaterialAmount(rate),
  }
}

export function normalizeMaterialScheduleRows(rawRows) {
  const migratedRows = rawRows.map(migrateLegacyRow)
  const resolvedGrid = buildResolvedNumericGrid(migratedRows, computeDerivedValues)

  return migratedRows.map((raw, rowIndex) => {
    const resolved = resolvedGrid[rowIndex] ?? {}

    return {
      id: raw.id ?? createMaterialRow().id,
      date: raw.date ?? "",
      activityDescription: normalizeActivityDescription(raw),
      plantName: raw.plantName ?? "",
      unit: raw.unit ?? "",
      fuelAllocated: raw.fuelAllocated ?? "",
      fuelPrice: raw.fuelPrice ?? "",
      fuelCostInput: raw.fuelCost ?? "",
      plantHire: raw.plantHire ?? "",
      laborCost: raw.laborCost ?? "",
      totalCostInput: raw.totalCost ?? "",
      production: raw.production ?? "",
      rateInput: raw.rate ?? "",
      fuelCost: resolved.fuelCost ?? 0,
      totalCost: resolved.totalCost ?? 0,
      rate: resolved.rate,
      resolvedProduction: resolved.production ?? 0,
    }
  })
}

export function normalizeMaterialRow(row, rowIndex = 0, allRawRows = null) {
  const rawRows = allRawRows ?? [row]
  return normalizeMaterialScheduleRows(rawRows)[rowIndex] ?? normalizeMaterialScheduleRows([row])[0]
}

function serializeMaterialRow(row) {
  const migrated = migrateLegacyRow(row)

  return {
    id: migrated.id ?? createMaterialRow().id,
    date: migrated.date ?? "",
    activityDescription: migrated.activityDescription ?? "",
    plantName: migrated.plantName ?? "",
    fuelAllocated: migrated.fuelAllocated ?? "",
    fuelPrice: migrated.fuelPrice ?? "",
    fuelCost: migrated.fuelCost ?? "",
    plantHire: migrated.plantHire ?? "",
    laborCost: migrated.laborCost ?? "",
    totalCost: migrated.totalCost ?? "",
    unit: migrated.unit ?? "",
    production: migrated.production ?? "",
    rate: migrated.rate ?? "",
    fuelAllocatedFormula: migrated.fuelAllocatedFormula ?? "",
    fuelPriceFormula: migrated.fuelPriceFormula ?? "",
    fuelCostFormula: migrated.fuelCostFormula ?? "",
    plantHireFormula: migrated.plantHireFormula ?? "",
    laborCostFormula: migrated.laborCostFormula ?? "",
    totalCostFormula: migrated.totalCostFormula ?? "",
    productionFormula: migrated.productionFormula ?? "",
    rateFormula: migrated.rateFormula ?? "",
  }
}

export function readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType) {
  const store = readStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  const rows = store[key]

  if (!Array.isArray(rows) || rows.length === 0) {
    return []
  }

  return filterRowsForDay(rows, dayId).map(migrateLegacyRow)
}

export function readMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType) {
  if (typeof window === "undefined") return null

  const store = readDraftStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)

  if (!Object.prototype.hasOwnProperty.call(store, key)) {
    return null
  }

  const rows = store[key]
  if (!Array.isArray(rows)) {
    return null
  }

  return filterRowsForDay(rows, dayId).map(migrateLegacyRow)
}

export function writeMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType, rows) {
  if (typeof window === "undefined") return

  const store = readDraftStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  store[key] = serializeDraftRows(rows, dayId)
  writeDraftStore(store)
}

export function clearMaterialScheduleDraft(projectId, dayId, slotId, scheduleType) {
  if (typeof window === "undefined") return

  const store = readDraftStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)

  if (!Object.prototype.hasOwnProperty.call(store, key)) {
    return
  }

  delete store[key]
  writeDraftStore(store)
}

export function readMaterialScheduleEditorRows(projectId, dayId, slotId, scheduleType) {
  const draft = readMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType)
  if (draft !== null) {
    return draft
  }

  return readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
}

export function getMaterialScheduleRows(projectId, dayId, slotId, scheduleType) {
  return normalizeMaterialScheduleRows(
    readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
  )
}

export function saveMaterialScheduleRows(projectId, dayId, slotId, scheduleType, rows) {
  const store = readStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  const defaultDate = formatMaterialScheduleDate(dayId)

  store[key] = rows.map((row) =>
    serializeMaterialRow({
      ...row,
      date: rowBelongsToDay(row, dayId)
        ? row.date?.trim() || defaultDate
        : defaultDate,
    })
  )
  writeStore(store)
  clearMaterialScheduleDraft(projectId, dayId, slotId, scheduleType)

  const normalized = normalizeMaterialScheduleRows(store[key])
  rememberMaterialScheduleDescriptions(
    projectId,
    normalized.map((row) => row.activityDescription).filter(Boolean)
  )
}

export function hasScheduleTypeData(projectId, dayId, slotId, scheduleType) {
  return getMaterialScheduleRows(projectId, dayId, slotId, scheduleType).some((row) => {
    const production = row.resolvedProduction ?? parsePlantCostAmount(row.production) ?? 0
    const totalCost = row.totalCost ?? 0

    return (
      row.activityDescription.trim() ||
      row.plantName?.trim() ||
      totalCost > 0 ||
      production > 0
    )
  })
}

export function hasMaterialScheduleDataForSlot(projectId, dayId, slotId) {
  return Object.keys(MATERIAL_SCHEDULE_TYPES).some((scheduleType) =>
    hasScheduleTypeData(projectId, dayId, slotId, scheduleType)
  )
}

export function getTotalCostByActivityDescription(
  projectId,
  dayId,
  slotId,
  scheduleType,
  activityDescription
) {
  const key = normalizeDescription(activityDescription)
  if (!key) return 0

  return getMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
    .filter((row) => normalizeDescription(row.activityDescription) === key)
    .reduce((sum, row) => sum + (row.totalCost ?? 0), 0)
}

export function getProductionByActivityDescription(
  projectId,
  dayId,
  slotId,
  scheduleType,
  activityDescription
) {
  const key = normalizeDescription(activityDescription)
  if (!key) return 0

  return getMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
    .filter((row) => normalizeDescription(row.activityDescription) === key)
    .reduce((sum, row) => {
      const production = row.resolvedProduction ?? parsePlantCostAmount(row.production) ?? 0
      return Math.round((sum + production) * 100) / 100
    }, 0)
}

export function getActivityDescriptionsForSlot(projectId, dayId, slotId) {
  const descriptions = new Map()

  for (const scheduleType of Object.keys(MATERIAL_SCHEDULE_TYPES)) {
    for (const row of getMaterialScheduleRows(projectId, dayId, slotId, scheduleType)) {
      const trimmed = row.activityDescription.trim()
      if (trimmed) {
        descriptions.set(normalizeDescription(trimmed), trimmed)
      }
    }
  }

  if (descriptions.size === 0) {
    return []
  }

  return [...descriptions.values()]
}

export function syncActivitiesFromMaterialSchedules(projectId, dayId, slot) {
  if (!hasMaterialScheduleDataForSlot(projectId, dayId, slot.id)) {
    return []
  }

  const useActual = hasScheduleTypeData(projectId, dayId, slot.id, ACTUAL_COST_SCHEDULE_TYPE)
  const descriptions = getActivityDescriptionsForSlot(projectId, dayId, slot.id)

  return descriptions
    .map((activityDescription) => {
      const valueEarned = useActual
        ? getTotalCostByActivityDescription(
            projectId,
            dayId,
            slot.id,
            ACTUAL_COST_SCHEDULE_TYPE,
            activityDescription
          )
        : 0
      const production = useActual
        ? getProductionByActivityDescription(
            projectId,
            dayId,
            slot.id,
            ACTUAL_COST_SCHEDULE_TYPE,
            activityDescription
          )
        : 0

      return {
        id: descriptionToId(activityDescription),
        description: activityDescription,
        valueEarned,
        production,
      }
    })
    .filter(
      (activity) =>
        (parsePlantCostAmount(activity.valueEarned) ?? 0) > 0 ||
        (parsePlantCostAmount(activity.production) ?? 0) > 0
    )
}

export function getMaterialScheduleTableHeaders() {
  return MATERIAL_SCHEDULE_COLUMNS.map((column) => column.label)
}

export function getMaterialCellAddress(columnKey, rowIndex) {
  const columnLetter = MATERIAL_SCHEDULE_COLUMNS.find((column) => column.key === columnKey)?.columnLetter
  if (!columnLetter) return ""
  return `${columnLetter}${rowIndex + 1}`
}

export function getMaterialRawFieldKey(columnKey) {
  if (columnKey === "fuelCost") return "fuelCost"
  if (columnKey === "totalCost") return "totalCost"
  if (columnKey === "rate") return "rate"
  return columnKey
}

export function formatMaterialScheduleDisplayValue(columnKey, value) {
  const numeric = parsePlantCostAmount(value)
  if (numeric === null) {
    return String(value ?? "")
  }

  if (columnKey === "production" || columnKey === "fuelAllocated") {
    return formatMaterialAmount(numeric)
  }

  if (
    columnKey === "fuelCost" ||
    columnKey === "totalCost" ||
    columnKey === "rate" ||
    columnKey === "fuelPrice" ||
    columnKey === "plantHire" ||
    columnKey === "laborCost"
  ) {
    return formatMaterialCurrencyAmount(numeric)
  }

  return formatMaterialAmount(numeric)
}

export function formatMaterialScheduleResolvedValue(row, key) {
  if (key === "rate") {
    return formatMaterialRate(row.rate)
  }

  if (key === "fuelCost") {
    return formatMaterialCurrencyAmount(row.fuelCost ?? 0)
  }

  if (key === "totalCost") {
    return formatMaterialCurrencyAmount(row.totalCost ?? 0)
  }

  if (key === "production") {
    const value = row.resolvedProduction ?? parsePlantCostAmount(row.production)
    if (value === null || value === undefined) return "—"
    return formatMaterialAmount(value)
  }

  return "—"
}

export function formatMaterialScheduleComputedValue(row, key) {
  return formatMaterialScheduleResolvedValue(row, key)
}

export { isNumericMaterialColumn } from "@/lib/materialScheduleFormulas"