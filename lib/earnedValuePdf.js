import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

import { summarizeEarnedValueActivities } from "@/lib/activities"
import {
  ACTUAL_COST_ON_SITE_LABEL,
  EARNED_VALUE_TABLE_HEADERS,
  PRODUCTION_LABEL,
  RATE_LABEL,
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueRowRate,
  resolveEarnedValueTotalRate,
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

function sanitizePdfFilename(value, fallback = "report") {
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
    row.description,
    formatCurrency(row.valueEarned),
    formatEarnedValueProduction(row.production),
    formatEarnedValueRate(resolveEarnedValueRowRate(row)),
  ])
}

export function buildEarnedValueTotalsRow(summary, label = "Total") {
  return [
    label,
    formatCurrency(summary.totals.valueEarned),
    formatEarnedValueProduction(summary.totals.production),
    formatEarnedValueRate(resolveEarnedValueTotalRate(summary.totals)),
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
            content:
              "Actual cost on site and production roll up from the material schedule. Rate = cost ÷ production.",
            colSpan: 4,
          },
        ]]
      : undefined,
    ...TABLE_OPTIONS,
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment([0]),
      createBodyRowStyle(totalRowIndex, {
        fontStyle: "bold",
        fillColor: PDF_TOTAL_ROW_FILL,
        textColor: [24, 24, 27],
      })
    ),
  })

  return doc.lastAutoTable.finalY
}

function addReportHeader(doc, lines) {
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

export function exportEarnedValueTablePdf({
  title,
  details = [],
  summary,
  filename,
  totalsLabel = "Total",
}) {
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, { title, details })
  addEarnedValueTable(doc, summary, startY, { totalsLabel })
  doc.save(filename)
}

export function addProjectToDateTotalsTable(doc, summary, startY) {
  autoTable(doc, {
    startY,
    head: [[ACTUAL_COST_ON_SITE_LABEL, PRODUCTION_LABEL, RATE_LABEL]],
    body: [[
      formatCurrency(summary.totals.valueEarned),
      formatEarnedValueProduction(summary.totals.production),
      formatEarnedValueRate(resolveEarnedValueTotalRate(summary.totals)),
    ]],
    foot: [[
      {
        content: "Grand total cumulative from all hourly dashboards saved to date. Rate = cost ÷ production.",
        colSpan: 3,
      },
    ]],
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    footStyles: PDF_FOOTNOTE_STYLES,
    columnStyles: PROJECT_TO_DATE_COLUMN_STYLES,
    didParseCell: createHeadColumnAlignment([]),
  })

  return doc.lastAutoTable.finalY
}

export function exportProjectToDatePdf({ projectName, dashboard, summary, reportDate }) {
  const doc = createLandscapePdf()

  const startY = addReportHeader(doc, {
    title: "Project to Date Report",
    details: [
      `Project: ${projectName}`,
      `Report date: ${reportDate}`,
      `Status: ${dashboard.mainActivity.status}`,
    ],
  })

  doc.setFontSize(10)
  const descriptionLines = doc.splitTextToSize(
    `${dashboard.mainActivity.title} — ${dashboard.mainActivity.description}`,
    269
  )
  doc.text(descriptionLines, PDF_PAGE_MARGIN, startY)

  addProjectToDateTotalsTable(doc, summary, startY + descriptionLines.length * 5 + 4)

  doc.save(`${sanitizePdfFilename(projectName, "project")}-project-to-date-report.pdf`)
}

export function exportMonthlyReportPdf({ projectName, file, summary }) {
  exportEarnedValueTablePdf({
    title: "Monthly cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "month")}-monthly-report.pdf`,
  })
}

export function exportWeeklyReportPdf({ projectName, file, summary }) {
  exportEarnedValueTablePdf({
    title: "Weekly cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "week")}-weekly-report.pdf`,
  })
}

export function exportDailyTotalPdf({ projectName, file, summary }) {
  exportEarnedValueTablePdf({
    title: "Daily cost",
    details: [
      `Project: ${projectName}`,
      `Period: ${file.label}`,
      `File completed: ${file.completedAt}`,
    ],
    summary,
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(file.id, "day")}-daily-total.pdf`,
    totalsLabel: "Total (cumulative)",
  })
}

export function exportHourlyDashboardPdf({ projectName, dayLabel, dayId, slot, summary }) {
  exportEarnedValueTablePdf({
    title: "Hourly dashboard",
    details: [
      `Project: ${projectName}`,
      `Day: ${dayLabel}`,
      `Period: ${slot.startTime} – ${slot.endTime}`,
    ],
    summary: summary ?? summarizeEarnedValueActivities(slot.activities),
    filename: `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(dayId, "day")}-hourly-${sanitizePdfFilename(slot.id, "slot")}.pdf`,
  })
}
