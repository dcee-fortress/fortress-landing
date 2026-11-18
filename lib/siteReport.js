import { getEquipmentInUseForDay, getEquipmentInUseForMonth, getEquipmentInUseForWeek } from "@/lib/equipmentInUse"
import { getGoodsReceivedDashboardLinesForDayIds } from "@/lib/goodsReceived"
import {
  getMaterialSiteDashboardLines,
  getMaterialSiteProjectLines,
} from "@/lib/materialSiteStock"
import { formatOperatingHours } from "@/lib/plantHoursData"
import { formatMaterialAmount, formatMaterialUnitPriceAmount } from "@/lib/plantCostCalculations"
import { getDayIdsInMonth, getDayIdsInWeek } from "@/lib/projectData"
import { buildDailyValuationProgressContent } from "@/lib/progressReportDemo"
import {
  formatDayLabelFromId,
  formatWeekRange,
  getWeekDateRange,
} from "@/lib/progressReportGenerator"
import {
  getSheqIncidentDailyFiles,
  getSheqIncidentDescriptionText,
  getSheqIncidentReport,
} from "@/lib/sheqIncident"
import {
  resolveWeatherCardTone,
  summarizeWeekForecast,
  weatherTonePalette,
} from "@/lib/siteWeather"

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

function weatherRangeForReport(period, fileId) {
  if (period === "monthly" && /^\d{4}-\d{2}$/.test(String(fileId || ""))) {
    const [year, month] = fileId.split("-").map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    return {
      start: `${fileId}-01`,
      end: `${fileId}-${String(lastDay).padStart(2, "0")}`,
    }
  }

  if (period === "weekly" && fileId) {
    const { startDate, endDate } = getWeekDateRange(fileId)
    const pad = (value) => String(value).padStart(2, "0")
    const toId = (date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    return { start: toId(startDate), end: toId(endDate) }
  }

  return { start: fileId, end: fileId }
}

function formatWeatherDayHeading(dayId) {
  if (!dayId) return ""
  return new Date(`${dayId}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

async function buildSiteReportWeatherHtml({ projectName, period, fileId }) {
  if (!fileId) return ""

  const range = weatherRangeForReport(period, fileId)
  if (!range.start || !range.end) return ""

  try {
    const params = new URLSearchParams({
      start: range.start,
      end: range.end,
      site: projectName || "",
    })
    const response = await fetch(`/api/site-weather?${params.toString()}`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return `<p style="margin:0 0 16px;padding:10px 12px;border:1px solid #fecdd3;border-radius:10px;background:#fff1f2;color:#9f1239;font-size:13px;">${escapeHtml(payload?.error || "Weather forecast is unavailable.")}</p>`
    }

    const isRange = period === "weekly" || period === "monthly"
    const days = Array.isArray(payload?.days) ? payload.days : []
    const selectedDay = days.find((day) => day.dayId === fileId) || days[0]
    const weekSummary = summarizeWeekForecast(days)
    const headingCondition = isRange ? weekSummary?.condition : selectedDay?.condition
    const high = isRange ? weekSummary?.high : selectedDay?.high
    const low = isRange ? weekSummary?.low : selectedDay?.low
    const rain = isRange ? weekSummary?.peakRainChance ?? 0 : selectedDay?.peakRainChance ?? 0
    const tone = weatherTonePalette(resolveWeatherCardTone(headingCondition?.tone, high))
    const locationName = payload?.location?.name || projectName || "Site"
    const rangeLabel =
      period === "weekly"
        ? formatWeekRange(fileId)
        : period === "monthly"
          ? new Date(`${fileId}-01T00:00:00`).toLocaleDateString("en-GB", {
              month: "long",
              year: "numeric",
            })
          : formatDayLabelFromId(selectedDay?.dayId || fileId)

    const slotsHtml = isRange
      ? (days || [])
          .map((day) => {
            return `
              <div style="flex:1 1 70px;min-width:70px;border-radius:12px;padding:10px 6px;text-align:center;background:rgba(255,255,255,0.16);color:#ffffff;">
                <div style="font-size:10px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${tone.muted};">${escapeHtml(formatWeatherDayHeading(day.dayId))}</div>
                <div style="margin-top:8px;font-size:18px;font-weight:700;">${day.high != null ? `${escapeHtml(day.high)}°` : "—"}</div>
                <div style="margin-top:4px;font-size:11px;color:${tone.muted};">${escapeHtml(day.condition?.label || "Forecast")}</div>
              </div>`
          })
          .join("")
      : (selectedDay?.hours || [])
          .map((hour) => {
            return `
              <div style="flex:1 1 64px;min-width:64px;border-radius:12px;padding:10px 6px;text-align:center;background:rgba(255,255,255,0.16);color:#ffffff;">
                <div style="font-size:11px;font-weight:700;color:${tone.muted};">${escapeHtml(hour.time)}</div>
                <div style="margin-top:8px;font-size:18px;font-weight:700;">${hour.temperature != null ? `${Math.round(hour.temperature)}°` : "—"}</div>
                <div style="margin-top:4px;font-size:10px;line-height:1.2;color:${tone.muted};">${escapeHtml(hour.label || "")}</div>
              </div>`
          })
          .join("")

    return `
      <section style="margin:0 0 22px;overflow:hidden;border-radius:16px;background:${tone.bg};color:${tone.text};">
        <div style="display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px;padding:18px 18px 10px;">
          <div style="min-width:0;flex:1 1 220px;">
            <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${tone.muted};">
              ${isRange ? (period === "monthly" ? "Monthly site weather" : "Weekly site weather") : "Site weather"}
            </div>
            <div style="margin-top:8px;font-size:24px;font-weight:700;line-height:1.2;">${escapeHtml(headingCondition?.label || "Forecast")}</div>
            <div style="margin-top:4px;font-size:13px;color:${tone.muted};">
              ${escapeHtml([locationName, payload?.location?.country, rangeLabel, "07:00 – 17:00"].filter(Boolean).join(" · "))}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:36px;font-weight:700;line-height:1;">${high != null ? `${escapeHtml(high)}°` : "—"}</div>
            <div style="margin-top:4px;font-size:13px;color:${tone.muted};">Low ${low != null ? `${escapeHtml(low)}°C` : "—"} · ${escapeHtml(rain)}% rain</div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding:8px 14px 16px;">
          ${slotsHtml || `<div style="padding:12px;color:${tone.muted};font-size:13px;">No hourly forecast for this period.</div>`}
        </div>
      </section>`
  } catch (error) {
    return `<p style="margin:0 0 16px;padding:10px 12px;border:1px solid #fecdd3;border-radius:10px;background:#fff1f2;color:#9f1239;font-size:13px;">${escapeHtml(error instanceof Error ? error.message : "Weather forecast is unavailable.")}</p>`
  }
}

function removeStuckSiteReportPdfHosts() {
  if (typeof document === "undefined") return
  document.querySelectorAll("[data-site-report-pdf]").forEach((node) => {
    try {
      node.remove()
    } catch {
      // Ignore cleanup failures for leftover capture hosts.
    }
  })
}

/**
 * Export the site report as PDF via a hidden iframe print dialog.
 * Weather is drawn with inline styles (no on-page capture host), so nothing sticks on screen.
 */
export async function exportSiteReportPdf({
  projectName,
  period,
  fileLabel,
  fileId,
  documentHtml,
}) {
  if (typeof window === "undefined" || typeof document === "undefined") return

  removeStuckSiteReportPdfHosts()

  const title = [
    period === "weekly" ? "Weekly site report" : period === "monthly" ? "Monthly site report" : "Daily site report",
    fileLabel,
  ]
    .filter(Boolean)
    .join(" — ")

  const weatherHtml = await buildSiteReportWeatherHtml({
    projectName,
    period,
    fileId: fileId || "",
  })

  const iframe = document.createElement("iframe")
  iframe.setAttribute("title", title)
  iframe.setAttribute("data-site-report-pdf", "true")
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none"
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  const frameDoc = frameWindow?.document
  if (!frameDoc) {
    iframe.remove()
    throw new Error("Could not open the print dialog. Try Export PDF again.")
  }

  frameDoc.open()
  frameDoc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 14mm; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; color: #18181b; line-height: 1.45; background: #ffffff; }
    .sheet { max-width: 920px; margin: 0 auto; padding: 8px 4px 24px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .meta { color: #52525b; font-size: 13px; margin: 0 0 18px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 18px; font-size: 12px; }
    th, td { border: 1px solid #d4d4d8; padding: 8px 10px; vertical-align: top; }
    th { background: #f4f4f5; text-align: left; }
    img { max-width: 100%; height: auto; }
    @media print {
      body { background: white; }
      .sheet { max-width: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;">Site report</p>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta">${escapeHtml(projectName || "Project")}</p>
    ${weatherHtml}
    ${String(documentHtml || "<p>No site report content yet.</p>")}
  </div>
</body>
</html>`)
  frameDoc.close()

  await new Promise((resolve) => window.setTimeout(resolve, 350))

  try {
    frameWindow.focus()
    frameWindow.print()
  } catch {
    throw new Error("Print failed. Check browser print permissions, then try Export PDF again.")
  } finally {
    window.setTimeout(() => {
      try {
        iframe.remove()
      } catch {
        // Ignore cleanup failures after print.
      }
      removeStuckSiteReportPdfHosts()
    }, 1200)
  }
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

function buildMaterialsSection(rows) {
  const rowsHtml = (rows || [])
    .map((row) => {
      return `
        <tr>
          <td ${CELL}>${escapeHtml(row.description || "—")}</td>
          <td ${CELL_RIGHT}>${escapeHtml(formatMaterialAmount(row.broughtOnSite))}</td>
          <td ${CELL_RIGHT}>${escapeHtml(formatMaterialAmount(row.materialUsed))}</td>
          <td ${CELL_RIGHT}>${escapeHtml(formatMaterialAmount(row.materialLeft))}</td>
        </tr>`
    })
    .join("")

  return sectionTable({
    title: "Material on site",
    footer: "These figures roll from the daily material on site dashboard and update automatically.",
    headers: [
      { label: "Description" },
      { label: "Material brought on site", align: "right" },
      { label: "Material used", align: "right" },
      { label: "Material left in storeroom", align: "right" },
    ],
    rowsHtml,
    columnCount: 4,
    emptyMessage: "No material on site for this period.",
  })
}

function getMaterialSiteRowsForReport(projectId, period, fileId, dayIds) {
  if (typeof window === "undefined") return []
  if (period === "daily") return getMaterialSiteDashboardLines(projectId, fileId)
  if (period === "project-to-date" || dayIds.length > 1) {
    // Prefer day-by-day merge so weekly/monthly match the daily dashboard rollup.
    const byDescription = new Map()
    for (const dayId of dayIds) {
      for (const line of getMaterialSiteDashboardLines(projectId, dayId)) {
        const key = String(line.description || "").trim().toLowerCase()
        if (!key) continue
        const current = byDescription.get(key) || {
          description: line.description,
          broughtOnSite: 0,
          materialUsed: 0,
          materialLeft: 0,
        }
        current.broughtOnSite += Number(line.broughtOnSite) || 0
        current.materialUsed += Number(line.materialUsed) || 0
        current.materialLeft += Number(line.materialLeft) || 0
        byDescription.set(key, current)
      }
    }
    if (byDescription.size > 0) return [...byDescription.values()]
    return getMaterialSiteProjectLines(projectId)
  }
  return []
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
    <p><strong>Fuel consumed</strong></p>
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
  const valuationHtml =
    buildDailyValuationProgressContent(summary, label) ||
    `
    <p><strong>${escapeHtml(label)}</strong></p>
    <p>No valuation entries for this period.</p>
    <p>These figures are copied from the valuations dashboard and update automatically.</p>`

  const materials = getMaterialSiteRowsForReport(projectId, period, fileId, dayIds)
  const equipment = typeof window === "undefined" ? { equipment: [] } : getEquipmentReport(projectId, period, fileId)
  const fuel =
    typeof window === "undefined" ? [] : getGoodsReceivedDashboardLinesForDayIds(projectId, dayIds)
  const incidents = listIncidents(projectId, dayIds)

  return [
    valuationHtml,
    buildEquipmentSection(equipment),
    buildMaterialsSection(materials),
    buildFuelSection(fuel),
    buildIncidentsSection(incidents),
  ].join("")
}
