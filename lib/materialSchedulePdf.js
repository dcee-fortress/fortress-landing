import autoTable from "jspdf-autotable"

import { createLandscapePdf } from "@/lib/earnedValuePdf"
import {
  MATERIAL_SCHEDULE_COLUMNS,
  formatMaterialScheduleResolvedValue,
} from "@/lib/materialSchedule"
import { formatMaterialAmount, formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_FOOTNOTE_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  PDF_TOTAL_ROW_FILL,
  createBodyRowStyle,
  createHeadColumnAlignment,
  mergePdfCellHandlers,
} from "@/lib/pdfTable"

const LEFT_COLUMN_INDEXES = [0, 1, 2, 9]

const MATERIAL_SCHEDULE_COLUMN_STYLES = {
  0: { halign: "left", cellWidth: 18 },
  1: { halign: "left", cellWidth: 42 },
  2: { halign: "left", cellWidth: 24 },
  3: { halign: "right", cellWidth: 18 },
  4: { halign: "right", cellWidth: 18 },
  5: { halign: "right", cellWidth: 18 },
  6: { halign: "right", cellWidth: 18 },
  7: { halign: "right", cellWidth: 18 },
  8: { halign: "right", cellWidth: 20 },
  9: { halign: "left", cellWidth: 14 },
  10: { halign: "right", cellWidth: 18 },
  11: { halign: "right", cellWidth: 17 },
}

function sanitizePdfFilename(value, fallback = "material-schedule") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || fallback
}

function buildMaterialSchedulePdfRow(row) {
  return MATERIAL_SCHEDULE_COLUMNS.map((column) => {
    if (column.key === "date") return row.date ?? ""
    if (column.key === "activityDescription") return row.activityDescription ?? ""
    if (column.key === "plantName") return row.plantName ?? ""
    if (column.key === "unit") return row.unit ?? ""

    const resolved = formatMaterialScheduleResolvedValue(row, column.key)
    return resolved === "—" ? "" : resolved
  })
}

function buildMaterialScheduleTotalsRow(scheduleLabel, grandTotal, productionTotal) {
  return [
    {
      content: `Grand Total (${scheduleLabel})`,
      colSpan: 8,
      styles: { halign: "left", fontStyle: "bold" },
    },
    formatMaterialCurrencyAmount(grandTotal),
    "",
    formatMaterialAmount(productionTotal),
    "",
  ]
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

export function exportMaterialSchedulePdf({
  projectName,
  dayLabel,
  slotLabel,
  scheduleLabel,
  dayId,
  slotId,
  rows,
  grandTotal,
  productionTotal,
}) {
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, {
    title: "Material Schedule",
    details: [
      `Project: ${projectName}`,
      `Day: ${dayLabel}`,
      `Hourly dashboard: ${slotLabel}`,
      `Schedule: ${scheduleLabel}`,
    ],
  })

  const body = rows.map(buildMaterialSchedulePdfRow)
  const totalRow = buildMaterialScheduleTotalsRow(scheduleLabel, grandTotal, productionTotal)
  const totalRowIndex = body.length

  autoTable(doc, {
    startY,
    head: [MATERIAL_SCHEDULE_COLUMNS.map((column) => column.label)],
    body: [...body, totalRow],
    foot: [[
      {
        content: "Values roll up to the hourly dashboard. Rate = total cost ÷ production.",
        colSpan: MATERIAL_SCHEDULE_COLUMNS.length,
      },
    ]],
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: 7, cellPadding: 2.5, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    footStyles: PDF_FOOTNOTE_STYLES,
    columnStyles: MATERIAL_SCHEDULE_COLUMN_STYLES,
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment(LEFT_COLUMN_INDEXES),
      createBodyRowStyle(totalRowIndex, {
        fontStyle: "bold",
        fillColor: PDF_TOTAL_ROW_FILL,
        textColor: [24, 24, 27],
      })
    ),
  })

  const filename = [
    sanitizePdfFilename(projectName, "project"),
    sanitizePdfFilename(dayId, "day"),
    sanitizePdfFilename(slotId, "slot"),
    "material-schedule",
  ].join("-")

  doc.save(`${filename}.pdf`)
}
