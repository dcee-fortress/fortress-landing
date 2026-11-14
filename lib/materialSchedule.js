import { removeGroveItem } from "@/lib/groveClientStore"
import { SITE_ACTIVITIES } from "@/lib/activities"
import { rememberMaterialScheduleDescriptions } from "@/lib/boqDescriptionMemory"
import {
  ACTUAL_COST_ON_SITE_LABEL,
} from "@/lib/earnedValueTable"
import { addDays, dayIdFromDate, parseDayId } from "@/lib/dailyFiles"
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
import { markSharedStorageLocalWrite } from "@/lib/sharedStorageGuard"

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
  { key: "details", label: "Details", align: "left", editable: true, columnLetter: "C" },
  { key: "plantName", label: "Plant name", align: "left", editable: true, columnLetter: "D" },
  {
    key: "fuelAllocated",
    label: "Fuel allocated",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "E",
  },
  {
    key: "fuelPrice",
    label: "Fuel price",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "F",
  },
  {
    key: "fuelCost",
    label: "Fuel cost",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "G",
  },
  {
    key: "plantHire",
    label: "Plant hire",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "H",
  },
  {
    key: "laborCost",
    label: "Labor cost",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "I",
  },
  {
    key: "totalCost",
    label: "Total cost",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "J",
  },
  { key: "unit", label: "Unit", align: "left", editable: true, columnLetter: "K" },
  {
    key: "production",
    label: "Production",
    align: "right",
    editable: true,
    numeric: true,
    columnLetter: "L",
  },
  {
    key: "rate",
    label: "Rate",
    align: "right",
    editable: true,
    numeric: true,
    computed: true,
    columnLetter: "M",
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
  const pending = materialScheduleStore.write(store)
  markSharedStorageLocalWrite(MATERIAL_SCHEDULE_STORAGE_KEY)
  if (typeof window !== "undefined") {
    const notify = () => window.dispatchEvent(new Event("grove-shared-storage-change"))
    if (pending && typeof pending.then === "function") pending.then(notify, notify)
    else notify()
  }
  return pending
}

function readDraftStore() {
  return materialScheduleDraftStore.read()
}

function writeDraftStore(store) {
  materialScheduleDraftStore.write(store)
  markSharedStorageLocalWrite(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY)
}

function serializeDraftRows(rows, dayId) {
  const defaultDate = formatMaterialScheduleDate(dayId)

  return dedupeRowsById(
    rows.map((row) =>
      serializeMaterialRow({
        ...row,
        date: rowBelongsToDay(row, dayId) ? row.date?.trim() || defaultDate : defaultDate,
      })
    )
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

export function invalidateMaterialScheduleCaches() {
  materialScheduleStore.invalidate()
  materialScheduleDraftStore.invalidate()
}

export function clearAllMaterialSchedules() {
  if (typeof window === "undefined") return
  removeGroveItem(MATERIAL_SCHEDULE_STORAGE_KEY)
  removeGroveItem(MATERIAL_SCHEDULE_DRAFTS_STORAGE_KEY)
  invalidateMaterialScheduleCaches()
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

function dedupeRowsById(rows) {
  const byId = new Map()

  for (const row of rows ?? []) {
    if (!row || typeof row !== "object") continue
    const id = typeof row.id === "string" && row.id ? row.id : `mat-anon-${byId.size}`
    byId.set(id, { ...row, id })
  }

  return [...byId.values()]
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

export const DEFAULT_VALUATION_FUEL_PRICE = "1.96"

/** Carry-forward templates begin on Thursday 5 Nov 2026 (from Wednesday’s rows) and every day after. */
export const VALUATION_CARRY_FORWARD_START_DAY_ID = "2026-11-05"

export function createMaterialRow(activityDescription = "", dayId = null) {
  return {
    id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: formatMaterialScheduleDate(dayId),
    activityDescription,
    details: "",
    plantName: "",
    fuelAllocated: "",
    fuelPrice: DEFAULT_VALUATION_FUEL_PRICE,
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

/** True when a row has cost/production entry values that should roll to dashboards. */
export function rowHasValuationEntryData(row) {
  const raw = migrateLegacyRow(row)

  for (const key of ["fuelAllocated", "fuelCost", "plantHire", "laborCost", "production", "rate"]) {
    if (String(raw[getMaterialFormulaFieldKey(key)] ?? "").trim()) return true
    if (String(raw[key] ?? "").trim() !== "") return true
  }

  return false
}

/** Any valuations-entry row that should copy onto the next day, including text-only rows. */
function rowHasTemplateContent(row) {
  const raw = migrateLegacyRow(row)
  if (String(raw.activityDescription ?? "").trim()) return true
  if (String(raw.details ?? "").trim()) return true
  if (String(raw.plantName ?? "").trim()) return true
  if (String(raw.unit ?? "").trim()) return true

  for (const key of ["fuelAllocated", "fuelCost", "plantHire", "laborCost", "totalCost", "production", "rate"]) {
    if (String(raw[getMaterialFormulaFieldKey(key)] ?? "").trim()) return true
    if (String(raw[key] ?? "").trim() !== "") return true
  }

  if (String(raw.fuelPriceFormula ?? "").trim()) return true
  const price = String(raw.fuelPrice ?? "").trim()
  return Boolean(price) && price !== DEFAULT_VALUATION_FUEL_PRICE
}

export function dayUsesValuationCarryForward(dayId) {
  return Boolean(dayId) && String(dayId) >= VALUATION_CARRY_FORWARD_START_DAY_ID
}

function previousCalendarDayId(dayId) {
  const date = parseDayId(dayId)
  if (Number.isNaN(date.getTime())) return null
  return dayIdFromDate(addDays(date, -1))
}

function nextCalendarDayId(dayId) {
  const date = parseDayId(dayId)
  if (Number.isNaN(date.getTime())) return null
  return dayIdFromDate(addDays(date, 1))
}

function valuationDayIsUserOwned(projectId, dayId, slotId, scheduleType) {
  if (readCarryMeta(projectId, dayId, slotId, scheduleType)?.edited) return true
  return rowsHaveTemplateContent(readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType))
}

function valuationRollHorizonDayId() {
  return nextCalendarDayId(dayIdFromDate(new Date()))
}

/**
 * Copy this exact entry onto each later day the user has not edited or saved.
 * Those copies stay in the entry draft. Dashboards keep reading the saved store.
 */
function rollSavedValuationForward(projectId, dayId, slotId, scheduleType, savedRows) {
  if (scheduleType !== ACTUAL_COST_SCHEDULE_TYPE || typeof window === "undefined") return
  const horizon = valuationRollHorizonDayId()
  const draftStore = { ...readDraftStore() }
  let sourceRows = savedRows
  let cursor = nextCalendarDayId(dayId)
  let changed = false

  for (let step = 0; cursor && cursor <= horizon && step < 90; step += 1) {
    if (!dayUsesValuationCarryForward(cursor)) break
    if (valuationDayIsUserOwned(projectId, cursor, slotId, scheduleType)) break

    const key = scheduleKey(projectId, cursor, slotId, scheduleType)
    const metaKey = carryMetaKey(projectId, cursor, slotId, scheduleType)
    const templateRows = reuseCarryRowIds(
      buildCarryForwardValuationRows(sourceRows, cursor),
      draftStore[key]
    )
    const sameContent =
      Array.isArray(draftStore[key]) &&
      draftStore[metaKey]?.edited === false &&
      valuationContentFingerprint(draftStore[key]) === valuationContentFingerprint(templateRows)

    if (!sameContent) {
      draftStore[key] = serializeDraftRows(templateRows, cursor)
      draftStore[metaKey] = { edited: false }
      changed = true
    }

    sourceRows = templateRows
    cursor = nextCalendarDayId(cursor)
  }

  if (changed) writeDraftStore(draftStore)
}

function listValuationSlotIds(projectId) {
  const ids = new Set()
  const prefix = `${projectId}::`

  for (const store of [readStore(), readDraftStore()]) {
    for (const key of Object.keys(store ?? {})) {
      if (!key.startsWith(prefix) || key.endsWith("::meta")) continue
      const parsed = parseScheduleStoreKey(key)
      if (parsed?.scheduleType !== ACTUAL_COST_SCHEDULE_TYPE || !parsed.slotId) continue
      ids.add(parsed.slotId)
    }
  }

  return [...ids]
}

let rollingUneditedValuations = false

/** Fill every unedited day through tomorrow from the last edited or saved entry. */
export function ensureUneditedValuationsRolled(projectId) {
  if (typeof window === "undefined" || !projectId || rollingUneditedValuations) return
  rollingUneditedValuations = true
  try {
    const horizon = valuationRollHorizonDayId()
    const slotIds = listValuationSlotIds(projectId)
    const start =
      previousCalendarDayId(VALUATION_CARRY_FORWARD_START_DAY_ID) ||
      VALUATION_CARRY_FORWARD_START_DAY_ID

    for (const slotId of slotIds) {
      let cursor = start
      for (let step = 0; cursor && cursor <= horizon && step < 120; step += 1) {
        if (valuationDayIsUserOwned(projectId, cursor, slotId, ACTUAL_COST_SCHEDULE_TYPE)) {
          rollSavedValuationForward(
            projectId,
            cursor,
            slotId,
            ACTUAL_COST_SCHEDULE_TYPE,
            latestValuationRows(projectId, cursor, slotId, ACTUAL_COST_SCHEDULE_TYPE)
          )
        }
        cursor = nextCalendarDayId(cursor)
      }
    }
  } finally {
    rollingUneditedValuations = false
  }
}

function rowsHaveTemplateContent(rows) {
  return (Array.isArray(rows) ? rows : []).some((row) => rowHasTemplateContent(row))
}

function rowsHaveValuationDescriptions(rows) {
  return (Array.isArray(rows) ? rows : []).some((row) =>
    String(row?.activityDescription ?? "").trim()
  )
}

function rowsHaveValuationEntryValues(rows) {
  return (Array.isArray(rows) ? rows : []).some((row) => rowHasValuationEntryData(row))
}

function valuationDescriptionFingerprint(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) =>
      String(row?.activityDescription ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .sort()
    .join("|")
}

function carryMetaKey(projectId, dayId, slotId, scheduleType) {
  return `${scheduleKey(projectId, dayId, slotId, scheduleType)}::meta`
}

function readCarryMeta(projectId, dayId, slotId, scheduleType) {
  const meta = readDraftStore()?.[carryMetaKey(projectId, dayId, slotId, scheduleType)]
  return meta && typeof meta === "object" ? meta : null
}

function valuationContentFingerprint(rows) {
  const keys = [
    "activityDescription",
    "details",
    "plantName",
    "unit",
    "fuelAllocated",
    "fuelPrice",
    "fuelCost",
    "plantHire",
    "laborCost",
    "totalCost",
    "production",
    "rate",
  ]

  return (Array.isArray(rows) ? rows : [])
    .map(migrateLegacyRow)
    .filter(rowHasTemplateContent)
    .map((row) =>
      keys
        .map((key) => {
          const formula = String(row[getMaterialFormulaFieldKey(key)] ?? "").trim()
          return `${key}:${formula || String(row[key] ?? "").trim()}`
        })
        .join(",")
    )
    .join("|")
}

function hasSavedMaterialSchedule(projectId, dayId, slotId, scheduleType) {
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  return Array.isArray(readStore()?.[key])
}

function latestValuationRows(projectId, dayId, slotId, scheduleType) {
  const draftRows = readMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType)
  const meta = readCarryMeta(projectId, dayId, slotId, scheduleType)
  const rawRows = readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)

  if (draftRows !== null && meta?.edited) return collapseDuplicatedCarry(draftRows)

  if (hasSavedMaterialSchedule(projectId, dayId, slotId, scheduleType)) {
    if (
      draftRows !== null &&
      meta == null &&
      rowsHaveTemplateContent(draftRows) &&
      valuationContentFingerprint(draftRows) !== valuationContentFingerprint(rawRows)
    ) {
      return collapseDuplicatedCarry(draftRows)
    }
    return rawRows
  }

  if (draftRows !== null && meta == null && rowsHaveTemplateContent(draftRows)) {
    return collapseDuplicatedCarry(draftRows)
  }
  return rowsHaveTemplateContent(rawRows) ? rawRows : collapseDuplicatedCarry(draftRows ?? rawRows)
}

/**
 * Nearest earlier day whose valuations entry should be copied.
 * An edited day wins over an older saved day, so Friday follows Thursday's edits.
 */
function findPreviousValuationTemplateDayId(projectId, dayId, slotId, scheduleType) {
  let cursor = previousCalendarDayId(dayId)

  for (let step = 0; cursor && step < 120; step += 1) {
    const meta = readCarryMeta(projectId, cursor, slotId, scheduleType)
    const rawRows = readRawMaterialScheduleRows(projectId, cursor, slotId, scheduleType)

    if (meta?.edited) return cursor
    if (rowsHaveTemplateContent(rawRows)) return cursor

    // An unsaved copy is only a placeholder. Keep walking to the day that was edited or saved.
    cursor = previousCalendarDayId(cursor)
  }

  return null
}

function slotIdsWithValuationTemplate(projectId, dayId) {
  const prefix = `${projectId}::${dayId}::`
  const ids = new Set()

  for (const store of [readDraftStore(), readStore()]) {
    for (const [key, rows] of Object.entries(store ?? {})) {
      if (!key.startsWith(prefix) || key.endsWith("::meta")) continue
      const parsed = parseScheduleStoreKey(key)
      if (!parsed?.slotId || parsed.dayId !== dayId) continue
      if (!Array.isArray(rows) || !rows.some((row) => rowHasTemplateContent(row))) continue
      ids.add(parsed.slotId)
    }
  }

  return [...ids]
}

/** Slot ids from the nearest earlier day that has valuations entries. */
export function getPreviousValuationSlotIds(projectId, dayId) {
  if (!projectId || !dayId) return []
  let cursor = previousCalendarDayId(dayId)

  for (let step = 0; cursor && step < 120; step += 1) {
    const ids = slotIdsWithValuationTemplate(projectId, cursor)
    if (ids.length > 0) return ids
    cursor = previousCalendarDayId(cursor)
  }

  return []
}

function carriedFuelPrice(row) {
  const formula = String(row?.[getMaterialFormulaFieldKey("fuelPrice")] ?? "").trim()
  const price = String(row?.fuelPrice ?? "").trim()
  return {
    fuelPrice: price || (formula ? "" : DEFAULT_VALUATION_FUEL_PRICE),
    fuelPriceFormula: formula,
  }
}

function copyCarriedField(row, key) {
  const formulaKey = getMaterialFormulaFieldKey(key)
  return {
    [key]: String(row?.[key] ?? "").trim(),
    [formulaKey]: String(row?.[formulaKey] ?? "").trim(),
  }
}

function collapseDuplicatedCarry(rows) {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length % 2 !== 0) return rows
  const half = rows.length / 2
  const label = (row) => String(row?.activityDescription ?? "").trim()
  const left = rows.slice(0, half)
  const right = rows.slice(half)
  if (!left.every((row, index) => label(row) === label(right[index]))) return rows
  return left
}

function reuseCarryRowIds(templateRows, existingRows) {
  return templateRows.map((row, index) => {
    const existingId = existingRows?.[index]?.id
    return existingId ? { ...row, id: existingId } : row
  })
}

/** Full previous-day valuations row → next-day template (new ids/date). */
export function buildCarryForwardValuationRows(sourceRows, dayId) {
  return (Array.isArray(sourceRows) ? sourceRows : [])
    .map(migrateLegacyRow)
    .filter((row) => rowHasTemplateContent(row))
    .map((row) => {
      const fuel = carriedFuelPrice(row)
      return {
        ...createMaterialRow("", dayId),
        activityDescription: String(row.activityDescription ?? "").trim(),
        details: String(row.details ?? "").trim(),
        plantName: String(row.plantName ?? "").trim(),
        unit: String(row.unit ?? "").trim(),
        ...copyCarriedField(row, "fuelAllocated"),
        fuelPrice: fuel.fuelPrice,
        fuelPriceFormula: fuel.fuelPriceFormula,
        ...copyCarriedField(row, "fuelCost"),
        ...copyCarriedField(row, "plantHire"),
        ...copyCarriedField(row, "laborCost"),
        ...copyCarriedField(row, "totalCost"),
        ...copyCarriedField(row, "production"),
        ...copyCarriedField(row, "rate"),
      }
    })
}

function readMaterialScheduleEditorRowsWithoutCarry(projectId, dayId, slotId, scheduleType) {
  const draft = readMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType)
  if (draft !== null) {
    return draft
  }

  return readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
}

export function applyValuationCarryForward(projectId, dayId, slotId, scheduleType, currentRows = []) {
  if (!dayUsesValuationCarryForward(dayId)) return currentRows

  const rawRows = readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
  const storedDraftRows = readMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType)
  const draftRows = collapseDuplicatedCarry(storedDraftRows)
  const meta = readCarryMeta(projectId, dayId, slotId, scheduleType)

  // A saved day with real entries keeps those entries. A blank saved row still rolls forward.
  // Later edits in the draft become the next day's template.
  if (rowsHaveTemplateContent(rawRows)) {
    if (draftRows !== null && meta?.edited) return draftRows
    if (
      draftRows !== null &&
      meta == null &&
      rowsHaveTemplateContent(draftRows) &&
      valuationContentFingerprint(draftRows) !== valuationContentFingerprint(rawRows)
    ) {
      return draftRows
    }
    return rawRows
  }

  const previousDayId = findPreviousValuationTemplateDayId(projectId, dayId, slotId, scheduleType)
  const previousRows = previousDayId
    ? latestValuationRows(projectId, previousDayId, slotId, scheduleType)
    : []
  const templateRows = reuseCarryRowIds(
    buildCarryForwardValuationRows(previousRows, dayId),
    draftRows
  )

  // Only an edit made on this day stays. An older unsaved page is replaced by the previous day.
  const keepsOwnDraft = draftRows !== null && meta?.edited === true

  if (keepsOwnDraft) return draftRows

  if (typeof window !== "undefined" && previousDayId) {
    const unchanged =
      storedDraftRows !== null &&
      storedDraftRows.length === templateRows.length &&
      valuationContentFingerprint(draftRows) === valuationContentFingerprint(templateRows)
    if (!unchanged || !meta) {
      writeMaterialScheduleDraftRows(projectId, dayId, slotId, scheduleType, templateRows, {
        edited: false,
      })
    }
  }

  return templateRows.length > 0 ? templateRows : currentRows
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
      details: raw.details ?? "",
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
    details: migrated.details ?? "",
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

  return dedupeRowsById(filterRowsForDay(rows, dayId).map(migrateLegacyRow))
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

  return dedupeRowsById(filterRowsForDay(rows, dayId).map(migrateLegacyRow))
}

export function writeMaterialScheduleDraftRows(
  projectId,
  dayId,
  slotId,
  scheduleType,
  rows,
  { edited = true } = {}
) {
  if (typeof window === "undefined") return

  const store = readDraftStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  store[key] = serializeDraftRows(rows, dayId)
  store[carryMetaKey(projectId, dayId, slotId, scheduleType)] = { edited: Boolean(edited) }
  writeDraftStore(store)

  if (edited) {
    rollSavedValuationForward(projectId, dayId, slotId, scheduleType, rows)
  }
}

export function clearMaterialScheduleDraft(projectId, dayId, slotId, scheduleType) {
  if (typeof window === "undefined") return

  const store = readDraftStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  const metaKey = carryMetaKey(projectId, dayId, slotId, scheduleType)

  if (!Object.prototype.hasOwnProperty.call(store, key) && !Object.prototype.hasOwnProperty.call(store, metaKey)) {
    return
  }

  delete store[key]
  delete store[metaKey]
  writeDraftStore(store)
}

export function readMaterialScheduleEditorRows(projectId, dayId, slotId, scheduleType) {
  if (typeof window === "undefined") {
    return readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
  }

  const current = readMaterialScheduleEditorRowsWithoutCarry(projectId, dayId, slotId, scheduleType)
  // The rolled template stays in the entry draft. Dashboards update only after Save.
  return applyValuationCarryForward(projectId, dayId, slotId, scheduleType, current)
}

/** Every saved and draft row in the project's material schedules, for entry suggestions. */
export function getMaterialScheduleHistoryRows(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const prefix = `${projectId}::`
  const rows = []
  for (const store of [readStore(), readDraftStore()]) {
    for (const [key, list] of Object.entries(store ?? {})) {
      if (!key.startsWith(prefix) || !Array.isArray(list)) continue
      for (const row of list) {
        if (row && typeof row === "object") rows.push(migrateLegacyRow(row))
      }
    }
  }
  return rows
}

export function getMaterialScheduleRows(projectId, dayId, slotId, scheduleType) {
  return normalizeMaterialScheduleRows(
    readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType)
  )
}

export function saveMaterialScheduleRows(projectId, dayId, slotId, scheduleType, rows, { rememberDescriptions = true } = {}) {
  const store = readStore()
  const key = scheduleKey(projectId, dayId, slotId, scheduleType)
  const defaultDate = formatMaterialScheduleDate(dayId)

  store[key] = dedupeRowsById(
    rows.map((row) =>
      serializeMaterialRow({
        ...row,
        date: rowBelongsToDay(row, dayId)
          ? row.date?.trim() || defaultDate
          : defaultDate,
      })
    )
  )
  clearMaterialScheduleDraft(projectId, dayId, slotId, scheduleType)
  rollSavedValuationForward(projectId, dayId, slotId, scheduleType, store[key])

  if (rememberDescriptions) {
    rememberMaterialScheduleDescriptions(
      projectId,
      normalizeMaterialScheduleRows(store[key]).map((row) => row.activityDescription).filter(Boolean)
    )
  }
  return writeStore(store)
}

export function hasScheduleTypeData(projectId, dayId, slotId, scheduleType) {
  return readRawMaterialScheduleRows(projectId, dayId, slotId, scheduleType).some((row) =>
    rowHasValuationEntryData(row)
  )
}

export function hasMaterialScheduleDataForSlot(projectId, dayId, slotId) {
  return Object.keys(MATERIAL_SCHEDULE_TYPES).some((scheduleType) =>
    hasScheduleTypeData(projectId, dayId, slotId, scheduleType)
  )
}

/** True when this day has saved valuations entry values (not template-only rows). */
export function hasMaterialScheduleDataForDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return false
  const store = readStore()
  const prefix = `${projectId}::${dayId}::`
  return Object.keys(store).some((key) => {
    if (!key.startsWith(prefix)) return false
    const rows = store[key]
    return Array.isArray(rows) && rows.some((row) => rowHasValuationEntryData(row))
  })
}

/**
 * Fast day total for list rollups — sums actual-cost schedules without
 * rebuilding hourly activities for every day.
 */
export function getActualCostTotalForDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) return 0
  const store = readStore()
  const prefix = `${projectId}::${dayId}::`
  const typeSuffix = `::${ACTUAL_COST_SCHEDULE_TYPE}`
  let total = 0

  for (const key of Object.keys(store)) {
    if (!key.startsWith(prefix) || !key.endsWith(typeSuffix)) continue
    const parts = key.split("::")
    if (parts.length < 4) continue
    const slotId = parts[parts.length - 2]
    const rows = getMaterialScheduleRows(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE)
    for (const row of rows) {
      total += row.totalCost ?? 0
    }
  }

  return Math.round(total * 100) / 100
}

/**
 * Every actual-cost schedule row for the given days, oldest day first, as
 * `{ description, valueEarned, production }`. Sums to the same total as
 * `getActualCostTotalForDay` across those days.
 */
export function getActualCostActivitiesForDays(projectId, dayIds) {
  if (typeof window === "undefined" || !projectId) return []
  const store = readStore()
  const wantedDayIds = new Set(dayIds)
  const prefix = `${projectId}::`
  const typeSuffix = `::${ACTUAL_COST_SCHEDULE_TYPE}`
  const scheduleKeys = []

  for (const key of Object.keys(store)) {
    if (!key.startsWith(prefix) || !key.endsWith(typeSuffix)) continue
    const parts = key.split("::")
    if (parts.length < 4) continue
    const dayId = parts[parts.length - 3]
    if (!wantedDayIds.has(dayId)) continue
    scheduleKeys.push({ dayId, slotId: parts[parts.length - 2] })
  }

  scheduleKeys.sort((a, b) => a.dayId.localeCompare(b.dayId) || a.slotId.localeCompare(b.slotId))

  return scheduleKeys.flatMap(({ dayId, slotId }) =>
    getMaterialScheduleRows(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE).map((row) => ({
      description: row.activityDescription?.trim() ?? "",
      valueEarned: row.totalCost ?? 0,
      production: row.resolvedProduction ?? parsePlantCostAmount(row.production) ?? 0,
    }))
  )
}

/** Day ids that have at least one material schedule entry. */
export function getMaterialScheduleDayIds(projectId) {
  if (typeof window === "undefined" || !projectId) return []
  const store = readStore()
  const prefix = `${projectId}::`
  const dayIds = new Set()

  for (const key of Object.keys(store)) {
    if (!key.startsWith(prefix)) continue
    const rows = store[key]
    if (!Array.isArray(rows) || rows.length === 0) continue
    const parts = key.split("::")
    if (parts.length < 4) continue
    const dayId = parts[1]
    if (/^\d{4}-\d{2}-\d{2}$/.test(dayId)) dayIds.add(dayId)
  }

  return [...dayIds]
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
  if (isFormula(value)) {
    return String(value)
  }

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