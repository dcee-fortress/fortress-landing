import { getEquipmentInUseForDay, getEquipmentInUseForMonth, getEquipmentInUseForWeek } from "@/lib/equipmentInUse"
import { getGoodsReceivedDashboardLinesForDayIds } from "@/lib/goodsReceived"
import { getMaterialOnSiteRows } from "@/lib/materialOnSite"
import { formatOperatingHours } from "@/lib/plantHoursData"
import { formatMaterialAmount, formatMaterialUnitPriceAmount } from "@/lib/plantCostCalculations"
import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { buildDailyValuationProgressContent } from "@/lib/progressReportDemo"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  getSheqIncidentDailyFiles,
  getSheqIncidentDescriptionText,
  getSheqIncidentReport,
} from "@/lib/sheqIncident"

const NOTES_KEY = "grove-site-report-notes"
const NOTES_MARKER_ID = "site-report-notes-start"

const CELL = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; vertical-align:top;"'
const CELL_RIGHT = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; vertical-align:top;"'
const HEAD = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; background:#f4f4f5;"'
const HEAD_RIGHT = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;"'
const FOOT = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; font-weight:600;"'
const FOOT_RIGHT = 'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; font-weight:600;"'

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function notesStorageKey(projectId, period, fileId) {
  return `${projectId}::${period}::${fileId}`
}

function readNotesBlob() {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}")
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export function getSiteReportNotes(projectId, period, fileId) {
  if (!projectId || !period || !fileId) return ""
  const value = readNotesBlob()[notesStorageKey(projectId, period, fileId)]
  return typeof value === "string" ? value : ""
}

export function saveSiteReportNotes(projectId, period, fileId, notesHtml) {
  if (typeof window === "undefined" || !projectId || !period || !fileId) return
  const blob = readNotesBlob()
  blob[notesStorageKey(projectId, period, fileId)] = String(notesHtml || "")
  localStorage.setItem(NOTES_KEY, JSON.stringify(blob))
}

export function extractSiteReportNotes(html) {
  const text = String(html || "")
  const match = text.match(
    new RegExp(`<p[^>]*id=["']${NOTES_MARKER_ID}["'][^>]*>[\\s\\S]*?<\\/p>([\\s\\S]*)$`, "i")
  )
  return match ? match[1] : null
}

export function composeSiteReportDocument(bodyHtml, notesHtml) {
  const notes = String(notesHtml || "").trim() ? notesHtml : "<p><br></p>"
  return `${bodyHtml}<p id="${NOTES_MARKER_ID}"><strong>Notes</strong></p>${notes}`
}

export function getSiteReportDayIds(projectId, period, fileId) {
  if (period === "weekly") return getDayIdsInWeek(projectId, fileId)
  if (period === "monthly") return getDayIdsInMonth(projectId, fileId)
  return /^\d{4}-\d{2}-\d{2}$/.test(String(fileId || "")) ? [fileId] : []
}

function periodLabel(period) {
  if (period === "weekly") return "Weekly"
  if (period === "monthly") return "Monthly"
  return "Daily"
}

function emptyRow(columns, message) {
  return `<tr><td ${CELL} colspan="${columns}">${escapeHtml(message)}</td></tr>`
}

function sectionTable({ title, footer, headers, rowsHtml, columnCount, emptyMessage }) {
  const body = rowsHtml || emptyRow(columnCount, emptyMessage)
  const head = headers
    .map((header) => `<th ${header.align === "right" ? HEAD_RIGHT : HEAD}>${escapeHtml(header.label)}</th>`)
    .join("")

  return `
    <p><strong>${escapeHtml(title)}</strong></p>
    <table style="width:100%; min-width:720px; border-collapse:collapse; margin:12px 0;">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <p>${escapeHtml(footer)}</p>`
}

function quantityText(amount, unit) {
  const formatted = formatMaterialAmount(amount)
  return unit ? `${formatted} ${unit}` : formatted
}

function buildMaterialsSection(rows) {
  const rowsHtml = (rows || [])
    .map((row) => {
      return `
        <tr>
          <td ${CELL}>${escapeHtml(row.description || "—")}</td>
          <td ${CELL_RIGHT}>${escapeHtml(quantityText(row.goodsOnSite, row.unit))}</td>
          <td ${CELL_RIGHT}>${escapeHtml(quantityText(row.goodsUsed, row.unit))}</td>
          <td ${CELL}>${escapeHtml(row.location || "—")}</td>
          <td ${CELL_RIGHT}>${escapeHtml(quantityText(row.goodsLeft, row.unit))}</td>
        </tr>`
    })
    .join("")

  return sectionTable({
    title: "Materials on site",
    footer: "These figures are copied from materials on site and update automatically.",
    headers: [
      { label: "Description of good" },
      { label: "Goods on site", align: "right" },
      { label: "Goods used on site", align: "right" },
      { label: "Location used" },
      { label: "Goods left on site", align: "right" },
    ],
    rowsHtml,
    columnCount: 5,
    emptyMessage: "No materials on site for this period.",
  })
}

function equipmentName(item) {
  const plant = String(item?.plant || "").trim() || "Equipment"
  const number = String(item?.plantNumber || "").trim()
  return number ? `${plant} (${number})` : plant
}

function buildEquipmentSection(report) {
  const equipment = report?.equipment || []
  const rowsHtml = equipment
    .map((item) => {
      const hours = formatOperatingHours(item?.hoursOperating)
      const hoursLabel = hours === "—" ? "—" : `${hours} hrs`
      return `
        <tr>
          <td ${CELL}>${escapeHtml(equipmentName(item))}</td>
          <td ${CELL}>${escapeHtml(item?.operatorName || "—")}</td>
          <td ${CELL_RIGHT}>${escapeHtml(hoursLabel)}</td>
        </tr>`
    })
    .join("")

  const totalHours = formatOperatingHours(report?.totalHours)
  const totalLabel = totalHours === "—" ? "—" : `${totalHours} hrs`
  const foot = equipment.length
    ? `<tr>
        <td ${FOOT}>Total</td>
        <td ${FOOT}></td>
        <td ${FOOT_RIGHT}>${escapeHtml(totalLabel)}</td>
      </tr>`
    : ""

  return `
    <p><strong>Equipment in use</strong></p>
    <table style="width:100%; min-width:720px; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Equipment</th>
          <th ${HEAD}>Operator</th>
          <th ${HEAD_RIGHT}>Hours</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || emptyRow(3, "No equipment in use for this period.")}</tbody>
      ${foot ? `<tfoot>${foot}</tfoot>` : ""}
    </table>
    <p>These figures are copied from daily equipment in use and update automatically.</p>`
}

function buildFuelSection(lines) {
  const rows = Array.isArray(lines) ? lines : []
  const rowsHtml = rows
    .map((row) => {
      return `
        <tr>
          <td ${CELL}>${escapeHtml(row.description || "—")}</td>
          <td ${CELL}>${escapeHtml(row.unit || "—")}</td>
          <td ${CELL_RIGHT}>${escapeHtml(formatMaterialAmount(row.quantity))}</td>
          <td ${CELL_RIGHT}>${escapeHtml(formatMaterialUnitPriceAmount(row.totalCost))}</td>
        </tr>`
    })
    .join("")

  const totalQuantity = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  const totalCost = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0)
  const foot = rows.length
    ? `<tr>
        <td ${FOOT}>Total</td>
        <td ${FOOT}></td>
        <td ${FOOT_RIGHT}>${escapeHtml(formatMaterialAmount(totalQuantity))}</td>
        <td ${FOOT_RIGHT}>${escapeHtml(formatMaterialUnitPriceAmount(totalCost))}</td>
      </tr>`
    : ""

  return `
    <p><strong>Fuel allocations</strong></p>
    <table style="width:100%; min-width:720px; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Fuel name</th>
          <th ${HEAD}>Unit</th>
          <th ${HEAD_RIGHT}>Quantity of fuel consumed</th>
          <th ${HEAD_RIGHT}>Total cost</th>
        </tr>
      </thead>
      <tbody>${rowsHtml || emptyRow(4, "No fuel consumed for this period.")}</tbody>
      ${foot ? `<tfoot>${foot}</tfoot>` : ""}
    </table>
    <p>These figures are copied from the fuel consumed entry and update automatically.</p>`
}

function incidentHasContent(report) {
  return Boolean(
    String(report?.injuredName || "").trim() ||
      String(report?.incidentType || "").trim() ||
      String(report?.locationOnSite || "").trim() ||
      String(report?.activityAtIncident || "").trim() ||
      getSheqIncidentDescriptionText(report)
  )
}

function buildIncidentsSection(incidents) {
  const rowsHtml = (incidents || [])
    .map(({ file, report }) => {
      const description =
        getSheqIncidentDescriptionText(report) || String(report?.activityAtIncident || "").trim() || "—"
      return `
        <tr>
          <td ${CELL}>${escapeHtml(formatDayLabelFromId(file.dayId) || file.dayId || "—")}</td>
          <td ${CELL}>${escapeHtml(report?.injuredName || "—")}</td>
          <td ${CELL}>${escapeHtml(report?.incidentType || "—")}</td>
          <td ${CELL}>${escapeHtml(report?.locationOnSite || "—")}</td>
          <td ${CELL}>${escapeHtml(description)}</td>
        </tr>`
    })
    .join("")

  return sectionTable({
    title: "Incidents",
    footer: "These entries are copied from the SHEQ incident report and update automatically.",
    headers: [
      { label: "Date" },
      { label: "Person" },
      { label: "Incident type" },
      { label: "Location" },
      { label: "What happened" },
    ],
    rowsHtml,
    columnCount: 5,
    emptyMessage: "No incidents for this period.",
  })
}

function listIncidents(projectId, dayIds) {
  const allowed = new Set(dayIds)
  if (allowed.size === 0 || typeof window === "undefined") return []

  return getSheqIncidentDailyFiles(projectId)
    .filter((file) => allowed.has(file.dayId))
    .map((file) => ({
      file,
      report: getSheqIncidentReport(projectId, file.id),
    }))
    .filter(({ report }) => incidentHasContent(report))
    .sort((left, right) => String(left.file.dayId).localeCompare(String(right.file.dayId)))
}

function getEquipmentReport(projectId, period, fileId) {
  if (period === "weekly") return getEquipmentInUseForWeek(projectId, fileId)
  if (period === "monthly") return getEquipmentInUseForMonth(projectId, fileId)
  return getEquipmentInUseForDay(projectId, fileId)
}

export function buildSiteReportBody(projectId, period, fileId, summary) {
  const dayIds = getSiteReportDayIds(projectId, period, fileId)
  const label = `${periodLabel(period)} valuations`
  const valuationHtml = buildDailyValuationProgressContent(summary, label) || `
    <p><strong>${escapeHtml(label)}</strong></p>
    <p>No valuation entries for this period.</p>
    <p>These figures are copied from the valuations dashboard and update automatically.</p>`

  const materials = typeof window === "undefined" ? [] : getMaterialOnSiteRows(projectId, dayIds)
  const equipment = typeof window === "undefined" ? { equipment: [] } : getEquipmentReport(projectId, period, fileId)
  const fuel =
    typeof window === "undefined" ? [] : getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds)
  const incidents = listIncidents(projectId, dayIds)

  return [
    valuationHtml,
    buildMaterialsSection(materials),
    buildEquipmentSection(equipment),
    buildFuelSection(fuel),
    buildIncidentsSection(incidents),
  ].join("")
}
