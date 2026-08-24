export const PDF_PAGE_MARGIN = 14

export const PDF_TABLE_MARGINS = {
  left: PDF_PAGE_MARGIN,
  right: PDF_PAGE_MARGIN,
}

export const PDF_DARK_HEAD_STYLES = {
  fillColor: [24, 24, 27],
  textColor: 255,
  fontStyle: "bold",
}

export const PDF_FOOTNOTE_STYLES = {
  fillColor: [244, 244, 245],
  textColor: [63, 63, 70],
  fontStyle: "italic",
  halign: "left",
}

export const PDF_TOTAL_ROW_FILL = [244, 244, 245]

export function createHeadColumnAlignment(leftColumnIndexes = [0]) {
  const leftColumns = new Set(leftColumnIndexes)

  return (data) => {
    if (data.section !== "head") return

    data.cell.styles.halign = leftColumns.has(data.column.index) ? "left" : "right"
    data.cell.styles.valign = "middle"
  }
}

export function createBodyRowStyle(rowIndex, styles) {
  return (data) => {
    if (data.section !== "body" || data.row.index !== rowIndex) return

    Object.assign(data.cell.styles, styles)
  }
}

export function mergePdfCellHandlers(...handlers) {
  return (data) => {
    for (const handler of handlers) {
      handler?.(data)
    }
  }
}

export const EARNED_VALUE_LANDSCAPE_COLUMN_STYLES = {
  0: { halign: "left", cellWidth: 129 },
  1: { halign: "right", cellWidth: 50 },
  2: { halign: "right", cellWidth: 45 },
  3: { halign: "right", cellWidth: 45 },
}

export const PROJECT_TO_DATE_COLUMN_STYLES = {
  0: { halign: "right", cellWidth: 89 },
  1: { halign: "right", cellWidth: 90 },
  2: { halign: "right", cellWidth: 90 },
}
