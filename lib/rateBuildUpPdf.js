import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { RATE_BUILD_UP_COLUMNS, resolveActualCostAnalysisRow } from "@/lib/actualCostAnalysis"
import {
  formatMaterialAmount,
  formatMaterialCurrencyAmount,
  formatMaterialRate,
  parsePlantCostAmount,
} from "@/lib/plantCostCalculations"
import { PDF_DARK_HEAD_STYLES, PDF_PAGE_MARGIN, createHeadColumnAlignment } from "@/lib/pdfTable"

const MONEY_KEYS = new Set([
  "fuelPrice",
  "fuelCost",
  "plantHire",
  "plantCost",
  "laborCost",
  "unitPrice",
  "materialCost",
  "totalCost",
])

const RATE_KEYS = new Set(["rate", "billRate", "allowableRate"])

const LEFT_KEYS = new Set([
  "billNo",
  "activityDescription",
  "plantName",
  "materialDescription",
  "materialUnit",
  "unit",
])

function pdfCell(row, resolved, column) {
  if (column.percent) {
    const text = String(row[column.key] ?? "").trim().replace("%", "")
    return text ? `${text}%` : "—"
  }

  if (column.computed || RATE_KEYS.has(column.key) || MONEY_KEYS.has(column.key)) {
    const value = column.computed ? resolved[column.key] : parsePlantCostAmount(row[column.key])
    if (value == null || value === "") return "—"
    if (RATE_KEYS.has(column.key)) return formatMaterialRate(value)
    if (MONEY_KEYS.has(column.key)) return formatMaterialCurrencyAmount(value)
  }

  if (column.numeric) {
    const value = parsePlantCostAmount(row[column.key])
    return value == null ? "—" : formatMaterialAmount(value)
  }

  const text = String(row[column.key] ?? "").trim()
  return text || "—"
}

export function exportRateBuildUpPdf({ projectName, rows }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" })
  const columns = RATE_BUILD_UP_COLUMNS
  const leftIndexes = columns.map((column, index) => (LEFT_KEYS.has(column.key) ? index : -1)).filter((index) => index >= 0)

  doc.setFontSize(16)
  doc.text("Rate build up", PDF_PAGE_MARGIN, 14)
  doc.setFontSize(11)
  doc.setTextColor(80)
  doc.text(String(projectName || "Project"), PDF_PAGE_MARGIN, 21)
  doc.setTextColor(0)

  const body = (rows ?? []).map((row) => {
    const resolved = resolveActualCostAnalysisRow(row)
    return columns.map((column) => pdfCell(row, resolved, column))
  })

  autoTable(doc, {
    startY: 28,
    head: [columns.map((column) => column.label)],
    body: body.length ? body : [["No BOQ rows yet."]],
    margin: { left: 8, right: 8 },
    styles: { fontSize: 7, cellPadding: 1.2, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    didParseCell: createHeadColumnAlignment(leftIndexes),
  })

  const safeName = String(projectName || "rate-build-up")
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  doc.save(`${safeName || "rate-build-up"}-rate-build-up.pdf`)
}
