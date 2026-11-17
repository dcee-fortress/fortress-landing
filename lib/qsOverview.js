import { getRateBuildUpRates } from "@/lib/actualCostAnalysis"
import { findBoqItemForDescription, normalizeBoqDescription } from "@/lib/boqData"
import {
  formatMaterialCurrencyAmount,
  formatMaterialRate,
  roundMaterialAmount,
} from "@/lib/plantCostCalculations"
import {
  ACTUAL_COST_SCHEDULE_TYPE,
  formatMaterialScheduleDate,
  getMaterialScheduleRows,
  getMaterialScheduleSlotIdsForDay,
} from "@/lib/materialSchedule"
import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { getDailyFiles } from "@/lib/projectFiles"
import { getQsEngineeringHref } from "@/lib/projectRoutes"
import { getEffectiveActualRate } from "@/lib/valuationVariations"

export const QS_OVERVIEW_COLUMNS = [
  { key: "date", label: "Date", align: "left" },
  { key: "activityDescription", label: "Activity description", align: "left" },
  { key: "unit", label: "Unit", align: "left" },
  { key: "production", label: "Production", align: "right", numeric: true },
  { key: "allowableRate", label: "Allowable rate", align: "right", numeric: true },
  { key: "allowableCost", label: "Allowable cost", align: "right", numeric: true },
  { key: "billRate", label: "Bill rate", align: "right", numeric: true },
  { key: "billCost", label: "Bill cost", align: "right", numeric: true },
  { key: "actualCost", label: "Actual cost", align: "right", numeric: true },
  { key: "actualRate", label: "Actual rate", align: "right", numeric: true },
  { key: "margin", label: "Margin", align: "right", numeric: true },
]

/** Project-to-date margin dashboards only include valuations from this day onward. */
export const QS_MARGIN_PROJECT_TO_DATE_START_DAY_ID = "2026-11-13"

export const QS_OVERVIEW_PERIODS = [
  {
    period: "daily",
    label: "Daily",
    description: "QS overview for each daily valuations entry",
    icon: "clock",
  },
  {
    period: "weekly",
    label: "Weekly",
    description: "Rolled weekly QS overview from valuations entry",
    icon: "calendar-range",
  },
  {
    period: "monthly",
    label: "Monthly",
    description: "Rolled monthly QS overview from valuations entry",
    icon: "calendar-days",
  },
  {
    period: "project-to-date",
    label: "Project to date",
    description: "Cumulative margin from 13 November onward",
    icon: "hard-hat",
  },
]

export function getQsOverviewHref(projectId) {
  return `/project/${projectId}/dashboard/qs-overview`
}

export function getQsOverviewPeriodHref(projectId, period) {
  if (period === "project-to-date") return `${getQsOverviewHref(projectId)}/project-to-date`
  return `${getQsOverviewHref(projectId)}/${period}`
}

export function getQsOverviewFileHref(projectId, period, fileId) {
  if (period === "project-to-date") return getQsOverviewPeriodHref(projectId, period)
  return `${getQsOverviewPeriodHref(projectId, period)}/${fileId}`
}

export function getQsOverviewBackHref(projectId) {
  return getQsEngineeringHref(projectId)
}

function buildRowFromValuation(projectId, dayId, row) {
  const description = String(row?.activityDescription ?? "").trim()
  if (!description) return null

  const boq = findBoqItemForDescription(projectId, description)
  if (!boq) return null

  const production = Number(row?.resolvedProduction ?? row?.production ?? 0) || 0
  const built = getRateBuildUpRates(projectId, description)
  const allowableRate = built?.allowableRate ?? null
  const billRate = built?.billRate ?? null
  const actualRate = getEffectiveActualRate(projectId, dayId, description) ?? built?.actualRate ?? null

  const allowableCost =
    production && allowableRate != null ? roundMaterialAmount(production * allowableRate) : null
  const billCost = production && billRate != null ? roundMaterialAmount(production * billRate) : null
  const actualCost =
    production && actualRate != null ? roundMaterialAmount(production * actualRate) : null
  const margin =
    billCost != null && actualCost != null ? roundMaterialAmount(billCost - actualCost) : null

  return {
    id: row.id || `${dayId}-${normalizeBoqDescription(description)}`,
    dayId,
    date: row.date || formatMaterialScheduleDate(dayId),
    activityDescription: description,
    unit: String(row.unit || boq?.unit || "").trim(),
    production: roundMaterialAmount(production) ?? 0,
    allowableRate: allowableRate != null ? roundMaterialAmount(allowableRate) : null,
    allowableCost,
    billRate: billRate != null ? roundMaterialAmount(billRate) : null,
    billCost,
    actualCost,
    actualRate: actualRate != null ? roundMaterialAmount(actualRate) : null,
    margin,
  }
}

/** All QS overview lines for one day from saved valuations entry. */
export function getQsOverviewRowsForDay(projectId, dayId) {
  if (!projectId || !dayId || typeof window === "undefined") return []

  const slots = getMaterialScheduleSlotIdsForDay(projectId, dayId)
  return slots.flatMap((slotId) =>
    getMaterialScheduleRows(projectId, dayId, slotId, ACTUAL_COST_SCHEDULE_TYPE)
      .map((row) => buildRowFromValuation(projectId, dayId, row))
      .filter(Boolean)
  )
}

export function getQsOverviewRowsForDayIds(projectId, dayIds) {
  const ids = Array.isArray(dayIds) ? dayIds : []
  return ids
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b)))
    .flatMap((dayId) => getQsOverviewRowsForDay(projectId, dayId))
}

export function summarizeQsOverviewRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  let production = 0
  let allowableCost = 0
  let billCost = 0
  let actualCost = 0

  for (const row of list) {
    production += Number(row.production) || 0
    allowableCost += Number(row.allowableCost) || 0
    billCost += Number(row.billCost) || 0
    actualCost += Number(row.actualCost) || 0
  }

  return {
    production: roundMaterialAmount(production) ?? 0,
    allowableCost: roundMaterialAmount(allowableCost) ?? 0,
    billCost: roundMaterialAmount(billCost) ?? 0,
    actualCost: roundMaterialAmount(actualCost) ?? 0,
    plannedMargin: roundMaterialAmount(billCost - allowableCost),
    actualMargin: roundMaterialAmount(billCost - actualCost),
  }
}

export function getQsOverviewRowsForPeriod(projectId, period, fileId) {
  if (period === "daily") return getQsOverviewRowsForDay(projectId, fileId)
  if (period === "weekly") {
    return getQsOverviewRowsForDayIds(projectId, getDayIdsInWeek(projectId, fileId))
  }
  if (period === "monthly") {
    return getQsOverviewRowsForDayIds(projectId, getDayIdsInMonth(projectId, fileId))
  }
  if (period === "project-to-date") {
    return getQsOverviewRowsForDayIds(
      projectId,
      getDailyFiles(projectId)
        .map((file) => file.id)
        .filter((dayId) => String(dayId) >= QS_MARGIN_PROJECT_TO_DATE_START_DAY_ID)
    )
  }
  return []
}

export function marginToneClass(value) {
  if (value == null || Number.isNaN(Number(value))) return "text-zinc-700"
  if (Number(value) > 0) return "text-emerald-700"
  if (Number(value) < 0) return "text-red-700"
  return "text-zinc-700"
}

export function formatQsOverviewCell(key, value) {
  if (value == null || value === "") return "—"
  if (
    key === "allowableCost" ||
    key === "billCost" ||
    key === "actualCost" ||
    key === "margin" ||
    key === "plannedMargin" ||
    key === "actualMargin"
  ) {
    return formatMaterialCurrencyAmount(value)
  }
  if (key === "allowableRate" || key === "billRate" || key === "actualRate") {
    return formatMaterialRate(value)
  }
  if (key === "production") return String(value)
  return String(value)
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function buildQsOverviewSiteReportHtml(projectId, period, fileId, label) {
  const rows = getQsOverviewRowsForPeriod(projectId, period, fileId)
  const totals = summarizeQsOverviewRows(rows)
  if (!rows.length) {
    return `
      <p><strong>${escapeHtml(label)}</strong></p>
      <p>No valuation entries for this period.</p>
      <p>These figures roll from the valuations entry and update automatically after Save.</p>`
  }

  const body = rows
    .map((row) => {
      const marginClass =
        row.margin != null && Number(row.margin) < 0
          ? "color:#b91c1c;"
          : row.margin != null && Number(row.margin) > 0
            ? "color:#047857;"
            : ""
      return `<tr>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;">${escapeHtml(row.date)}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;">${escapeHtml(row.activityDescription)}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;">${escapeHtml(row.unit || "—")}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("production", row.production))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("allowableRate", row.allowableRate))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("allowableCost", row.allowableCost))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("billRate", row.billRate))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("billCost", row.billCost))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("actualCost", row.actualCost))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;">${escapeHtml(formatQsOverviewCell("actualRate", row.actualRate))}</td>
        <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;${marginClass}">${escapeHtml(formatQsOverviewCell("margin", row.margin))}</td>
      </tr>`
    })
    .join("")

  const footerMarginClass =
    Number(totals.actualMargin) < 0
      ? "color:#b91c1c;"
      : Number(totals.actualMargin) > 0
        ? "color:#047857;"
        : ""

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%;min-width:1100px;border-collapse:collapse;margin:12px 0;">
      <thead>
        <tr>
          ${QS_OVERVIEW_COLUMNS.map(
            (col) =>
              `<th style="border:1px solid #d4d4d8;padding:8px 10px;text-align:${col.align === "left" ? "left" : "right"};background:#f4f4f5;">${escapeHtml(col.label)}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>${body}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="border:1px solid #d4d4d8;padding:8px 10px;font-weight:600;">Totals</td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;font-weight:600;">${escapeHtml(formatQsOverviewCell("production", totals.production))}</td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;"></td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;font-weight:600;">${escapeHtml(formatQsOverviewCell("allowableCost", totals.allowableCost))}</td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;"></td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;font-weight:600;">${escapeHtml(formatQsOverviewCell("billCost", totals.billCost))}</td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;font-weight:600;">${escapeHtml(formatQsOverviewCell("actualCost", totals.actualCost))}</td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;"></td>
          <td style="border:1px solid #d4d4d8;padding:8px 10px;text-align:right;font-weight:600;${footerMarginClass}">${escapeHtml(formatQsOverviewCell("margin", totals.actualMargin))}</td>
        </tr>
      </tfoot>
    </table>
    <p>Rolled from valuations entry. Rates come from Rate build up. Allowable cost, bill cost, and actual cost each use daily valuations production × that rate. Margin = bill cost − actual cost.</p>`
}
