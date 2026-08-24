import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatBoqRate } from "@/lib/boqData"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  createHeadColumnAlignment,
} from "@/lib/pdfTable"

const TABLE_OPTIONS = {
  margin: PDF_TABLE_MARGINS,
  styles: { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" },
  headStyles: { fillColor: [6, 95, 70], textColor: 255, fontStyle: "bold" },
  columnStyles: {
    0: { halign: "left", cellWidth: 120 },
    1: { halign: "right", cellWidth: 50 },
  },
  didParseCell: createHeadColumnAlignment([0]),
}

function addBoqHeader(doc, { title, projectName, lines }) {
  doc.setFontSize(18)
  doc.setTextColor(0)
  doc.text(title, PDF_PAGE_MARGIN, 18)
  doc.setFontSize(11)
  doc.setTextColor(80)
  doc.text(projectName, PDF_PAGE_MARGIN, 26)

  lines.forEach((line, index) => {
    doc.text(line, PDF_PAGE_MARGIN, 34 + index * 6)
  })

  doc.setTextColor(0)
  return 34 + lines.length * 6 + 6
}

function buildBoqBody(items) {
  return items.map((item) => [item.itemName || "—", formatBoqRate(item.rate)])
}

function buildRateAnalysisBody(rows) {
  return rows.map((row) => [
    row.boqItemName !== "—"
      ? `${row.activityDescription}\n(BOQ: ${row.boqItemName})`
      : row.activityDescription,
    formatBoqRate(row.actualRate),
    formatBoqRate(row.boqRate),
    row.variance === null ? "—" : formatBoqRate(row.variance),
  ])
}

function createBoqPdf({ projectName, boq }) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const lines = [
    boq.fileName ? `Source file: ${boq.fileName}` : "Source: uploaded BOQ",
    `Items: ${boq.items.length}`,
    boq.uploadedAt ? `Uploaded: ${new Date(boq.uploadedAt).toLocaleString()}` : "",
  ].filter(Boolean)

  const startY = addBoqHeader(doc, {
    title: boq.name || "Bill of Quantities",
    projectName,
    lines,
  })

  if (!boq.items.length) {
    doc.setFontSize(11)
    doc.text("No BOQ items found.", PDF_PAGE_MARGIN, startY)
    return doc
  }

  autoTable(doc, {
    startY,
    head: [["Description", "BOQ rate"]],
    body: buildBoqBody(boq.items),
    ...TABLE_OPTIONS,
  })

  return doc
}

function createRateAnalysisPdf({ projectName, boq, periodLabel, fileLabel, rows }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const startY = addBoqHeader(doc, {
    title: `${boq.name} — Rate Analysis`,
    projectName,
    lines: [
      `Period: ${fileLabel} (${periodLabel})`,
      boq.fileName ? `Reference BOQ: ${boq.fileName}` : `Reference BOQ: ${boq.name}`,
      `Rows: ${rows.length}`,
    ],
  })

  if (!rows.length) {
    doc.setFontSize(11)
    doc.text("No rate analysis rows for this period.", PDF_PAGE_MARGIN, startY)
    return doc
  }

  autoTable(doc, {
    startY,
    head: [["Activity description", "ACTUAL RATE", "BOQ rate", "Variance"]],
    body: buildRateAnalysisBody(rows),
    margin: PDF_TABLE_MARGINS,
    styles: { fontSize: 9, cellPadding: 3, valign: "middle", overflow: "linebreak" },
    headStyles: PDF_DARK_HEAD_STYLES,
    columnStyles: {
      0: { halign: "left", cellWidth: 110 },
      1: { halign: "right", cellWidth: 35 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
    didParseCell: createHeadColumnAlignment([0]),
  })

  return doc
}

export function exportBoqPdf({ projectName, boq }) {
  const doc = createBoqPdf({ projectName, boq })
  const safeName = (boq.name || "boq").replace(/[^\w\-]+/g, "-").toLowerCase()
  doc.save(`${safeName}.pdf`)
}

export function openBoqPdf({ projectName, boq }) {
  const doc = createBoqPdf({ projectName, boq })
  window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer")
}

export function exportRateAnalysisPdf({ projectName, boq, periodLabel, fileLabel, rows }) {
  const doc = createRateAnalysisPdf({ projectName, boq, periodLabel, fileLabel, rows })
  const safeName = (boq.name || "rate-analysis").replace(/[^\w\-]+/g, "-").toLowerCase()
  doc.save(`${safeName}-rate-analysis.pdf`)
}

export function openRateAnalysisPdf({ projectName, boq, periodLabel, fileLabel, rows }) {
  const doc = createRateAnalysisPdf({ projectName, boq, periodLabel, fileLabel, rows })
  window.open(doc.output("bloburl"), "_blank", "noopener,noreferrer")
}
