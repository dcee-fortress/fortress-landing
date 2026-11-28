import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { summarizeEarnedValueActivities } from "@/lib/activities"
import {
  EARNED_VALUE_TABLE_HEADERS,
  formatEarnedValueDate,
  formatEarnedValueProduction,
} from "@/lib/earnedValueTable"
import {
  EARNED_VALUE_LANDSCAPE_COLUMN_STYLES,
  PDF_DARK_HEAD_STYLES,
  PDF_FOOTNOTE_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  PDF_TOTAL_ROW_FILL,
  PROJECT_TO_DATE_COLUMN_STYLES,
  createBodyRowStyle,
  createHeadColumnAlignment,
  mergePdfCellHandlers,
} from "@/lib/pdfTable"
import { formatCurrency } from "@/lib/projects"

export function sanitizePdfFilename(value, fallback = "report") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || fallback
}

export const EARNED_VALUE_PDF_HEADERS = EARNED_VALUE_TABLE_HEADERS

const TABLE_OPTIONS = {
  margin: PDF_TABLE_MARGINS,
  styles: { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" },
  headStyles: PDF_DARK_HEAD_STYLES,
  footStyles: PDF_FOOTNOTE_STYLES,
  columnStyles: EARNED_VALUE_LANDSCAPE_COLUMN_STYLES,
}

export function createLandscapePdf() {
  return new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
}

export function buildEarnedValuePdfRows(summary) {
  return summary.rows.map((row) => [
    formatEarnedValueDate(row.date),
    row.description,
    formatEarnedValueProduction(row.production),
  ])
}

export function buildEarnedValueTotalsRow(summary, label = "Total") {
  return [
    { content: label, colSpan: 2 },
    formatEarnedValueProduction(summary.totals.production),
  ]
}

export function addEarnedValueTable(doc, summary, startY, { totalsLabel = "Total", includeFootnote = true } = {}) {
  const body = [...buildEarnedValuePdfRows(summary), buildEarnedValueTotalsRow(summary, totalsLabel)]
  const totalRowIndex = body.length - 1

  autoTable(doc, {
    startY,
    head: [EARNED_VALUE_PDF_HEADERS],
    body,
    foot: includeFootnote
      ? [[
          {
            content: "Date, activity description, and production roll up from valuations entry.",
            colSpan: 3,
          },
        ]]
      : undefined,
    ...TABLE_OPTIONS,
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment([0, 1]),
      createBodyRowStyle(totalRowIndex, {
        fontStyle: "bold",
        fillColor: PDF_TOTAL_ROW_FILL,
        textColor: [24, 24, 27],
      })
    ),
  })

  return doc.lastAutoTable.finalY
}

export function addReportHeader(doc, lines) {
  doc.setFontSize(18)
  doc.setTextColor(0)
  doc.text(lines.title, PDF_PAGE_MARGIN, 18)
  doc.setFontSize(11)
  doc.setTextColor(80)

  lines.details.forEach((line, index) => {
    doc.text(line, PDF_PAGE_MARGIN, 26 + index * 6)
  })

  doc.setTextColor(0)
  return 26 + lines.details.length * 6 + 6
}

export async function exportEarnedValueTablePdf({
  title,
  details = [],
  summary,
  filename,
  totalsLabel = "Total",
  mode = "download",
}) {
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, { title, details })
  addEarnedValueTable(doc, summary, startY, { totalsLabel })
  const { saveOrShareJsPdf } = await import("@/lib/pdfShare")
  await saveOrShareJsPdf(
    doc,
    filename,
    mode === "whatsapp" ? "whatsapp" : "download",
    `${title || "Rodcroft report"}`
  )
}

export function addProjectToDateCostTable(doc, summary, startY) {
  autoTable(doc, {
    startY,
    head: [["Project to date cost incurred"]],
    body: [[formatCurrency(summary.totals.valueEarned ?? 0)]],
    foot: [["Cumulative cost — sum of all costs for the project from the daily valuations."]],
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    footStyles: PDF_FOOTNOTE_STYLES,
    columnStyles: PROJECT_TO_DATE_COLUMN_STYLES,
    didParseCell: createHeadColumnAlignment([]),
  })

  return doc.lastAutoTable.finalY
}

export async function exportProjectToDatePdf({ projectName, summary, reportDate, mode = "download" }) {
  const doc = createLandscapePdf()

  const startY = addReportHeader(doc, {
    title: "Project to Date Report",
    details: [`Project: ${projectName}`, `Report date: ${reportDate}`],
  })

  const costTableEndY = addProjectToDateCostTable(doc, summary, startY)
  addEarnedValueTable(doc, summary, costTableEndY + 8)

  const { saveOrShareJsPdf } = await import("@/lib/pdfShare")
  await saveOrShareJsPdf(
    doc,
    `${sanitizePdfFilename(projectName, "project")}-project-to-date-report.pdf`,
    mode === "whatsapp" ? "whatsapp" : "download",
    `Project to date — ${projectName || "Rodcroft"}`
  )
}

export async function exportMonthlyReportPdf({ projectName, file, summary, mode = "download" }) {
  await exportEarnedValueTablePdf({
    title: "Monthly cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "month")}-monthly-report.pdf`,
    mode,
  })
}

export async function exportWeeklyReportPdf({ projectName, file, summary, mode = "download" }) {
  await exportEarnedValueTablePdf({
    title: "Weekly cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "week")}-weekly-report.pdf`,
    mode,
  })
}

export async function exportDailyTotalPdf({ projectName, file, summary, mode = "download" }) {
  await exportEarnedValueTablePdf({
    title: "Daily cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "day")}-daily-total.pdf`,
    totalsLabel: "Total (cumulative)",
    mode,
  })
}

export async function exportHourlyDashboardPdf({ projectName, dayLabel, dayId, slot, summary, mode = "download" }) {
  await exportEarnedValueTablePdf({
    title: "Hourly dashboard",
    details: [
      `Project: ${projectName}`,
      `Day: ${dayLabel}`,
      `Period: ${slot.startTime} – ${slot.endTime}`,
    ],
    summary: summary ?? summarizeEarnedValueActivities(slot.activities),
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(dayId, "day")}-hourly-${sanitizePdfFilename(slot.id, "slot")}.pdf`,
    mode,
  })
}
