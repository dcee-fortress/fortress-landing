import autoTable from "jspdf-autotable"

import { createLandscapePdf } from "@/lib/earnedValuePdf"
import {
  formatMaterialScheduleResolvedValue,
  getMaterialScheduleColumns,
  usesSimplifiedValuationEntry,
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

function buildMaterialSchedulePdfRow(row, columns) {
  return columns.map((column) => {
    if (column.key === "date") return row.date ?? ""
    if (column.key === "activityDescription") return row.activityDescription ?? ""
    if (column.key === "details") return row.details ?? ""
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
  const simplified = usesSimplifiedValuationEntry(dayId)
  const columns = getMaterialScheduleColumns(dayId)
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, {
    title: "Valuations entry",
    details: [
      `Project: ${projectName}`,
      `Day: ${dayLabel}`,
      `Hourly dashboard: ${slotLabel}`,
      `Schedule: ${scheduleLabel}`,
    ],
  })

  const body = rows.map((row) => buildMaterialSchedulePdfRow(row, columns))
  const allowableCostTotal = rows.reduce((sum, row) => sum + (row.allowableCost ?? 0), 0)
  const billCostTotal = rows.reduce((sum, row) => sum + (row.billCost ?? 0), 0)
  const actualCostTotal = rows.reduce((sum, row) => sum + (row.actualCost ?? 0), 0)
  const totalRow = simplified
    ? [
        {
          content: `Grand Total (${scheduleLabel})`,
          colSpan: 4,
          styles: { halign: "left", fontStyle: "bold" },
        },
        formatMaterialAmount(productionTotal),
        formatMaterialCurrencyAmount(grandTotal),
        "",
        "",
        formatMaterialCurrencyAmount(allowableCostTotal),
        formatMaterialCurrencyAmount(billCostTotal),
        formatMaterialCurrencyAmount(actualCostTotal),
      ]
    : buildMaterialScheduleTotalsRow(scheduleLabel, grandTotal, productionTotal)
  const totalRowIndex = body.length

  autoTable(doc, {
    startY,
    head: [columns.map((column) => column.label)],
    body: [...body, totalRow],
    foot: [[
      {
        content: simplified
          ? "Actual cost, bill cost, and allowable cost use daily production × the actual rate, bill rate, and allowable rate from Rate build up."
          : "Values roll up to the hourly dashboard. Rate = total cost ÷ production.",
        colSpan: columns.length,
      },
    ]],
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: 7, cellPadding: 2.5, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    footStyles: PDF_FOOTNOTE_STYLES,
    columnStyles: simplified
      ? {
          0: { halign: "left", cellWidth: 22 },
          1: { halign: "left", cellWidth: 40 },
          2: { halign: "left", cellWidth: 28 },
          3: { halign: "left", cellWidth: 14 },
          4: { halign: "right", cellWidth: 22 },
          5: { halign: "right", cellWidth: 22 },
          6: { halign: "right", cellWidth: 24 },
          7: { halign: "right", cellWidth: 22 },
          8: { halign: "right", cellWidth: 24 },
          9: { halign: "right", cellWidth: 22 },
          10: { halign: "right", cellWidth: 24 },
        }
      : MATERIAL_SCHEDULE_COLUMN_STYLES,
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment(simplified ? [0, 1, 2, 3] : LEFT_COLUMN_INDEXES),
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
