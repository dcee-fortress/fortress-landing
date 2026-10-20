import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  formatMaterialAmount,
  formatMaterialUnitPriceAmount,
} from "@/lib/plantCostCalculations"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  PDF_TOTAL_ROW_FILL,
  createBodyRowStyle,
  createHeadColumnAlignment,
  mergePdfCellHandlers,
} from "@/lib/pdfTable"

const QUANTITY_FORMAT = "#,##0.00"
const MONEY_FORMAT = "$#,##0.00######"

export function sanitizeExportFilename(value, fallback = "table") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || fallback
}

export function columnKind(column) {
  if (column?.kind) return column.kind
  if (column?.computed || column?.key === "totalCost") return "computed"
  if (column?.key === "unitPrice") return "money"
  if (column?.numeric || column?.key === "quantity") return "number"
  if (column?.key === "date") return "date"
  return "text"
}

function isTotalColumn(column) {
  const kind = columnKind(column)
  if (column?.total === false) return false
  return kind === "number" || kind === "computed"
}

function numericValue(value) {
  if (value === null || value === undefined || value === "") return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function displayValue(column, row) {
  const kind = columnKind(column)
  const value = row?.[column.key]
  if (kind === "date") return formatDayLabelFromId(value) || value || ""
  if (kind === "number") {
    const numeric = numericValue(value)
    return numeric === null ? "" : formatMaterialAmount(numeric)
  }
  if (kind === "money" || kind === "computed") {
    const numeric = numericValue(value)
    return numeric === null ? "" : formatMaterialUnitPriceAmount(numeric)
  }
  const text = String(value ?? "").trim()
  return text === "—" ? "" : text
}

function rowHasContent(row, columns) {
  return columns.some((column) => {
    const kind = columnKind(column)
    const value = row?.[column.key]
    if (kind === "computed") return false
    if (kind === "number" || kind === "money") {
      return value !== "" && value !== null && value !== undefined && numericValue(value) !== null
    }
    const text = String(value ?? "").trim()
    return text !== "" && text !== "—"
  })
}

export function exportableRows(rows, columns) {
  const list = Array.isArray(rows) ? rows : []
  return list.filter((row) => rowHasContent(row, columns))
}

function columnLetter(index) {
  let n = index + 1
  let letters = ""
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

function excelCell(column, row) {
  const kind = columnKind(column)
  const value = row?.[column.key]
  if (kind === "number" || kind === "money" || kind === "computed") {
    const numeric = numericValue(value)
    if (numeric === null) return ""
    return {
      t: "n",
      v: numeric,
      z: kind === "number" ? QUANTITY_FORMAT : MONEY_FORMAT,
    }
  }
  return displayValue(column, row)
}

function sheetName(title) {
  const name = String(title || "Table").replace(/[\\/?*[\]:]/g, " ").trim()
  return (name || "Table").slice(0, 31)
}

export function buildExcelTable(options) {
  const columns = Array.isArray(options.columns) ? options.columns : []
  const rows = exportableRows(options.rows, columns)
  const showTotal = options.showTotal !== false && columns.some(isTotalColumn)
  const headerRow = 4
  const firstDataRow = headerRow + 1
  const lastDataRow = headerRow + Math.max(rows.length, 1)

  const aoa = [
    [options.title || "Table"],
    [`Project: ${options.projectName || "Project"}`],
    [],
    columns.map((column) => column.label),
  ]

  if (rows.length === 0) {
    aoa.push(columns.map(() => ""))
  } else {
    for (const row of rows) {
      aoa.push(columns.map((column) => excelCell(column, row)))
    }
  }

  if (showTotal && rows.length > 0) {
    aoa.push(
      columns.map((column, index) => {
        if (index === 0) return "Total"
        if (!isTotalColumn(column)) return ""
        const letter = columnLetter(index)
        const kind = columnKind(column)
        const total = rows.reduce((sum, row) => sum + (numericValue(row?.[column.key]) || 0), 0)
        return {
          t: "n",
          v: total,
          f: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`,
          z: kind === "number" ? QUANTITY_FORMAT : MONEY_FORMAT,
        }
      })
    )
  }

  return {
    aoa,
    sheetName: sheetName(options.title),
    columns,
    headerRow,
    lastDataRow: rows.length > 0 ? lastDataRow : headerRow,
    hasData: rows.length > 0,
  }
}

export async function exportTableExcel(options) {
  const XLSX = await import("xlsx")
  const built = buildExcelTable(options)
  const sheet = XLSX.utils.aoa_to_sheet(built.aoa)
  sheet["!cols"] = built.columns.map((column) => ({
    wch: Math.min(42, Math.max(14, String(column.label || "").length + 2)),
  }))
  if (built.hasData) {
    const lastColumn = columnLetter(built.columns.length - 1)
    sheet["!autofilter"] = {
      ref: `A${built.headerRow}:${lastColumn}${built.lastDataRow}`,
    }
  }

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, built.sheetName)
  const filename = [
    sanitizeExportFilename(options.projectName, "project"),
    sanitizeExportFilename(options.filename || options.title, "table"),
  ].join("-")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

function pdfRows(columns, rows) {
  return rows.map((row) => columns.map((column) => displayValue(column, row)))
}

export async function exportTablePdf(options) {
  const { jsPDF } = await import("jspdf")
  const autoTableModule = await import("jspdf-autotable")
  const autoTable = autoTableModule.default
  const columns = Array.isArray(options.columns) ? options.columns : []
  const rows = exportableRows(options.rows, columns)
  const showTotal = options.showTotal !== false && columns.some(isTotalColumn)
  const wide = columns.length > 6
  const doc = new jsPDF({
    orientation: wide ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  })

  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(options.title || "Table", PDF_PAGE_MARGIN, 16)
  doc.setFontSize(11)
  doc.setTextColor(80)
  doc.text(`Project: ${options.projectName || "Project"}`, PDF_PAGE_MARGIN, 23)
  doc.setTextColor(0)

  const body = pdfRows(columns, rows)
  let totalRowIndex = -1
  if (showTotal) {
    totalRowIndex = body.length
    body.push(
      columns.map((column, index) => {
        if (index === 0) return "Total"
        if (!isTotalColumn(column)) return ""
        const kind = columnKind(column)
        const total = rows.reduce((sum, row) => sum + (numericValue(row?.[column.key]) || 0), 0)
        return kind === "number" ? formatMaterialAmount(total) : formatMaterialUnitPriceAmount(total)
      })
    )
  }

  const leftColumns = columns
    .map((column, index) => (column.align === "right" || columnKind(column) !== "text" && columnKind(column) !== "date" ? -1 : index))
    .filter((index) => index >= 0)

  autoTable(doc, {
    startY: 28,
    head: [columns.map((column) => column.label)],
    body: body.length > 0 ? body : [columns.map(() => "")],
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: wide ? 8 : 9, cellPadding: 2.2, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    columnStyles: Object.fromEntries(
      columns.map((column, index) => [
        index,
        {
          halign:
            column.align === "right" ||
            columnKind(column) === "number" ||
            columnKind(column) === "money" ||
            columnKind(column) === "computed"
              ? "right"
              : "left",
        },
      ])
    ),
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment(leftColumns.length > 0 ? leftColumns : [0]),
      totalRowIndex >= 0
        ? createBodyRowStyle(totalRowIndex, {
            fontStyle: "bold",
            fillColor: PDF_TOTAL_ROW_FILL,
            textColor: [24, 24, 27],
          })
        : null
    ),
  })

  const filename = [
    sanitizeExportFilename(options.projectName, "project"),
    sanitizeExportFilename(options.filename || options.title, "table"),
  ].join("-")
  doc.save(`${filename}.pdf`)
}
