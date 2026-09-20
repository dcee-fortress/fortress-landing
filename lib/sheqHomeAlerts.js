import { createLocalStorageCache } from "@/lib/storageCache"

export const SHEQ_HOME_ALERTS_STORAGE_KEY = "grove-sheq-home-alerts"
export const SHEQ_ALERT_KIND_INSPECTION = "inspection"
export const SHEQ_ALERT_KIND_INCIDENT = "incident"
/** Site inspection home alerts per ISO week. */
export const SHEQ_ALERTS_PER_WEEK_LIMIT = 5
/** Incident report home alerts per ISO week. */
export const SHEQ_INCIDENT_ALERTS_PER_WEEK_LIMIT = 6
export const SHEQ_ALERT_TTL_MS = 24 * 60 * 60 * 1000
export const SHEQ_HOME_BANNER_VISIBLE_MS = 3000
export const SHEQ_HOME_BANNER_STAGGER_MS = 1000

const alertsStore = createLocalStorageCache(SHEQ_HOME_ALERTS_STORAGE_KEY, {
  alerts: [],
  weekUsage: {},
})

/** ISO week key: YYYY-Www (Monday-based). */
export function getIsoWeekKey(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((target - yearStart) / 86400000 + 1) / 7)
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`
}

function normalizeKind(kind) {
  return kind === SHEQ_ALERT_KIND_INCIDENT
    ? SHEQ_ALERT_KIND_INCIDENT
    : SHEQ_ALERT_KIND_INSPECTION
}

export function getSheqAlertWeekLimit(kind = SHEQ_ALERT_KIND_INSPECTION) {
  return normalizeKind(kind) === SHEQ_ALERT_KIND_INCIDENT
    ? SHEQ_INCIDENT_ALERTS_PER_WEEK_LIMIT
    : SHEQ_ALERTS_PER_WEEK_LIMIT
}

function usageKey(projectId, weekKey = getIsoWeekKey(), kind = SHEQ_ALERT_KIND_INSPECTION) {
  const safeKind = normalizeKind(kind)
  return `${projectId}::${weekKey}::${safeKind}`
}

/** Legacy key before per-kind quotas (counts as inspection). */
function legacyUsageKey(projectId, weekKey = getIsoWeekKey()) {
  return `${projectId}::${weekKey}`
}

function readStore() {
  const raw = alertsStore.read()
  return {
    alerts: Array.isArray(raw?.alerts) ? raw.alerts : [],
    weekUsage: raw?.weekUsage && typeof raw.weekUsage === "object" ? raw.weekUsage : {},
  }
}

function writeStore(next) {
  return alertsStore.write({
    alerts: next.alerts,
    weekUsage: next.weekUsage,
  })
}

export function isSheqHomeAlertExpired(alert, now = Date.now()) {
  if (!alert) return true
  if (alert.expiresAt) {
    const expires = new Date(alert.expiresAt).getTime()
    if (Number.isFinite(expires)) return expires <= now
  }
  if (alert.createdAt) {
    const created = new Date(alert.createdAt).getTime()
    if (Number.isFinite(created)) return created + SHEQ_ALERT_TTL_MS <= now
  }
  return true
}

function purgeExpiredAlerts(store, now = Date.now()) {
  const kept = store.alerts.filter((alert) => !isSheqHomeAlertExpired(alert, now))
  if (kept.length === store.alerts.length) return store
  return { ...store, alerts: kept }
}

function alertKind(alert) {
  return normalizeKind(alert?.kind)
}

export function getSheqHomeAlerts(projectId, kind = null) {
  if (typeof window === "undefined" || !projectId) return []
  const now = Date.now()
  const before = readStore()
  const store = purgeExpiredAlerts(before, now)
  if (store.alerts.length !== before.alerts.length) {
    void writeStore(store)
  }
  return store.alerts
    .filter((alert) => {
      if (alert?.projectId !== projectId || alert.dismissed || isSheqHomeAlertExpired(alert, now)) {
        return false
      }
      if (!kind) return true
      return alertKind(alert) === normalizeKind(kind)
    })
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
}

function readUsed(weekUsage, projectId, weekKey, kind) {
  const key = usageKey(projectId, weekKey, kind)
  if (Object.prototype.hasOwnProperty.call(weekUsage, key)) {
    const used = Number(weekUsage[key] || 0)
    return Number.isFinite(used) ? Math.max(0, used) : 0
  }
  // Migrate pre-kind counters (inspection only).
  if (normalizeKind(kind) === SHEQ_ALERT_KIND_INSPECTION) {
    const legacy = Number(weekUsage[legacyUsageKey(projectId, weekKey)] || 0)
    return Number.isFinite(legacy) ? Math.max(0, legacy) : 0
  }
  return 0
}

function writeUsed(weekUsage, projectId, weekKey, kind, used) {
  const key = usageKey(projectId, weekKey, kind)
  const next = {
    ...weekUsage,
    [key]: Math.max(0, used),
  }
  if (normalizeKind(kind) === SHEQ_ALERT_KIND_INSPECTION) {
    delete next[legacyUsageKey(projectId, weekKey)]
  }
  return next
}

export function getSheqAlertWeekUsage(projectId, kind = SHEQ_ALERT_KIND_INSPECTION) {
  const limit = getSheqAlertWeekLimit(kind)
  if (typeof window === "undefined" || !projectId) {
    return { used: 0, remaining: limit, limit, kind: normalizeKind(kind) }
  }
  const used = readUsed(readStore().weekUsage, projectId, getIsoWeekKey(), kind)
  return {
    used,
    remaining: Math.max(0, limit - used),
    limit,
    kind: normalizeKind(kind),
  }
}

export function canTriggerSheqHomeAlert(projectId, kind = SHEQ_ALERT_KIND_INSPECTION) {
  return getSheqAlertWeekUsage(projectId, kind).remaining > 0
}

export async function triggerSheqHomeAlert({
  projectId,
  projectName,
  period,
  periodId,
  periodLabel,
  row,
  location,
  date,
  kind = SHEQ_ALERT_KIND_INSPECTION,
  message,
  dayId,
  hrefKind,
}) {
  if (typeof window === "undefined" || !projectId) {
    return { ok: false, message: "Alerts are only available in the browser." }
  }

  const alertKindValue = normalizeKind(kind)
  const limit = getSheqAlertWeekLimit(alertKindValue)
  const usage = getSheqAlertWeekUsage(projectId, alertKindValue)
  if (usage.remaining <= 0) {
    return {
      ok: false,
      message: `Alert limit reached (${limit} per week). Try again next week.`,
    }
  }

  const store = purgeExpiredAlerts(readStore())
  const weekKey = getIsoWeekKey()
  const alertId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? `alert-${crypto.randomUUID()}`
      : `alert-${Date.now()}`

  const createdAt = new Date()
  let resolvedMessage = (message || "").trim()

  if (!resolvedMessage && alertKindValue === SHEQ_ALERT_KIND_INCIDENT) {
    const name = (row?.injuredName || "").trim() || "Unnamed person"
    const type = (row?.incidentType || "").trim() || "incident"
    const loc = (location || row?.locationOnSite || "").trim()
    resolvedMessage = `${name} · ${type}${loc ? ` @ ${loc}` : ""}`
  }

  if (!resolvedMessage) {
    const itemLabel = row?.item ? `Item ${row.item}` : "Inspection item"
    const observation = (row?.observation || "").trim() || "No observation entered"
    const category = (row?.category || "").trim()
    resolvedMessage = `${itemLabel}${category ? ` · ${category}` : ""}: ${observation}`
  }

  const alert = {
    id: alertId,
    kind: alertKindValue,
    projectId,
    projectName: projectName || "Project",
    period: period || (alertKindValue === SHEQ_ALERT_KIND_INCIDENT ? "daily" : period),
    periodId: periodId || dayId || "",
    periodLabel: periodLabel || periodId || dayId || "",
    dayId: dayId || (period === "daily" ? periodId : "") || "",
    location: location || "",
    date: date || "",
    rowId: row?.id || "",
    item: row?.item || "",
    category: row?.category || "",
    observation: row?.observation || "",
    recommendation: row?.recommendation || "",
    responsibility: row?.responsibility || "",
    injuredName: row?.injuredName || "",
    incidentType: row?.incidentType || "",
    message: resolvedMessage,
    hrefKind: hrefKind || alertKindValue,
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + SHEQ_ALERT_TTL_MS).toISOString(),
    weekKey,
    dismissed: false,
  }

  store.alerts = [alert, ...store.alerts].slice(0, 100)
  store.weekUsage = writeUsed(store.weekUsage, projectId, weekKey, alertKindValue, usage.used + 1)

  await writeStore(store)
  window.dispatchEvent(new Event("grove-shared-storage-change"))
  window.dispatchEvent(new CustomEvent("sheq-home-alert", { detail: alert }))

  return {
    ok: true,
    alert,
    remaining: Math.max(0, limit - (usage.used + 1)),
  }
}

export async function dismissSheqHomeAlert(alertId) {
  if (typeof window === "undefined" || !alertId) {
    return { ok: false }
  }
  const store = readStore()
  store.alerts = store.alerts.map((alert) =>
    alert.id === alertId ? { ...alert, dismissed: true } : alert
  )
  await writeStore(store)
  window.dispatchEvent(new Event("grove-shared-storage-change"))
  return { ok: true }
}

/**
 * When an inspection row that raised alerts is deleted, remove those alerts and
 * restore one week-quota slot per alert that still counted against usage.
 */
export async function releaseSheqAlertQuotaForDeletedRow(projectId, rowId) {
  if (typeof window === "undefined" || !projectId || !rowId) {
    return { ok: false, restored: 0 }
  }

  return releaseSheqAlertsByKind(
    projectId,
    SHEQ_ALERT_KIND_INSPECTION,
    (alert) => String(alert?.rowId || "") === String(rowId)
  )
}

/**
 * When a whole inspection file is deleted, restore quota for every alert from that file.
 */
export async function releaseSheqAlertQuotaForInspectionFile(projectId, period, periodId) {
  if (typeof window === "undefined" || !projectId || !period || !periodId) {
    return { ok: false, restored: 0 }
  }

  return releaseSheqAlertsByKind(
    projectId,
    SHEQ_ALERT_KIND_INSPECTION,
    (alert) =>
      String(alert?.period || "") === String(period) &&
      String(alert?.periodId || alert?.dayId || "") === String(periodId)
  )
}

/**
 * When an incident daily file is deleted, restore quota for alerts from that day.
 */
export async function releaseSheqAlertQuotaForIncidentDay(projectId, dayId) {
  if (typeof window === "undefined" || !projectId || !dayId) {
    return { ok: false, restored: 0 }
  }

  return releaseSheqAlertsByKind(
    projectId,
    SHEQ_ALERT_KIND_INCIDENT,
    (alert) =>
      String(alert?.dayId || alert?.periodId || "") === String(dayId) ||
      String(alert?.rowId || "") === `incident-${projectId}-${dayId}`
  )
}

async function releaseSheqAlertsByKind(projectId, kind, matchFn) {
  const safeKind = normalizeKind(kind)
  const store = purgeExpiredAlerts(readStore())
  let weekUsage = { ...store.weekUsage }
  const kept = []
  let restored = 0

  for (const alert of store.alerts) {
    const matches =
      alert?.projectId === projectId &&
      alertKind(alert) === safeKind &&
      !alert?.quotaReleased &&
      matchFn(alert)

    if (!matches) {
      kept.push(alert)
      continue
    }

    const weekKey = alert.weekKey || getIsoWeekKey()
    const used = readUsed(weekUsage, projectId, weekKey, safeKind)
    if (used > 0) {
      weekUsage = writeUsed(weekUsage, projectId, weekKey, safeKind, used - 1)
      restored += 1
    }
  }

  if (kept.length === store.alerts.length && restored === 0) {
    return { ok: true, restored: 0 }
  }

  await writeStore({ alerts: kept, weekUsage })
  window.dispatchEvent(new Event("grove-shared-storage-change"))
  return { ok: true, restored }
}
