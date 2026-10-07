import autoTable from "jspdf-autotable"

import { addReportHeader, createLandscapePdf, sanitizePdfFilename } from "@/lib/earnedValuePdf"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_FOOTNOTE_STYLES,
  PDF_TABLE_MARGINS,
  PDF_TOTAL_ROW_FILL,
  createBodyRowStyle,
  createHeadColumnAlignment,
  mergePdfCellHandlers,
} from "@/lib/pdfTable"
import { formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"

const TABLE_STYLES = { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" }

const TOTAL_ROW_STYLES = {
  fontStyle: "bold",
  fillColor: PDF_TOTAL_ROW_FILL,
  textColor: [24, 24, 27],
}

function addTable(doc, { startY, head, body, foot, columnStyles, leftColumns = [0], totalRowIndex }) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    foot: foot ? [[{ content: foot, colSpan: head.length }]] : undefined,
    margin: PDF_TABLE_MARGINS,
    styles: TABLE_STYLES,
    headStyles: PDF_DARK_HEAD_STYLES,
    footStyles: PDF_FOOTNOTE_STYLES,
    columnStyles,
    didParseCell: mergePdfCellHandlers(
      createHeadColumnAlignment(leftColumns),
      totalRowIndex === undefined ? null : createBodyRowStyle(totalRowIndex, TOTAL_ROW_STYLES)
    ),
  })

  return doc.lastAutoTable.finalY
}

export function exportCashBookProjectToDatePdf({
  projectName,
  title,
  bookLabel,
  reportDate,
  totals,
  lines,
  dayCount,
}) {
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, {
    title,
    details: [
      `Project: ${projectName}`,
      `${bookLabel} · Project to date · ${dayCount} daily file${dayCount === 1 ? "" : "s"}`,
      `Report date: ${reportDate}`,
    ],
  })

  const totalsEndY = addTable(doc, {
    startY,
    head: ["Cash received", "Amount paid", "Cash balance"],
    body: [
      [
        formatMaterialCurrencyAmount(totals.cashReceived),
        formatMaterialCurrencyAmount(totals.amountPaid),
        formatMaterialCurrencyAmount(totals.closingBalance),
      ],
    ],
    columnStyles: { 0: { halign: "right" }, 1: { halign: "right" }, 2: { halign: "right" } },
    leftColumns: [],
  })

  const sum = (field) => lines.reduce((total, line) => total + (Number(line[field]) || 0), 0)
  const body = [
    ...lines.map((line) => [
      line.description,
      formatMaterialCurrencyAmount(line.cashReceived),
      formatMaterialCurrencyAmount(line.amountPaid),
      formatMaterialCurrencyAmount(line.cashBalance),
    ]),
    [
      "Total",
      formatMaterialCurrencyAmount(sum("cashReceived")),
      formatMaterialCurrencyAmount(sum("amountPaid")),
      formatMaterialCurrencyAmount(sum("cashBalance")),
    ],
  ]

  addTable(doc, {
    startY: totalsEndY + 8,
    head: ["Description of transaction", "Cash received", "Amount paid", "Cash balance"],
    body,
    foot: "Rolled up from the daily files. Same descriptions add up; cash balance is the sum of each day's balance.",
    columnStyles: {
      0: { halign: "left", cellWidth: 129 },
      1: { halign: "right", cellWidth: 46 },
      2: { halign: "right", cellWidth: 46 },
      3: { halign: "right", cellWidth: 48 },
    },
    totalRowIndex: body.length - 1,
  })

  doc.save(
    `${sanitizePdfFilename(projectName, "project")}-${sanitizePdfFilename(bookLabel, "cash-book")}-project-to-date.pdf`
  )
}

export function exportWorkersPdf({ projectName, reportDate, headCounts }) {
  const doc = createLandscapePdf()
  const startY = addReportHeader(doc, {
    title: "Total number of workers",
    details: [
      `Project: ${projectName}`,
      `Month: ${headCounts.monthName}`,
      `Report date: ${reportDate}`,
    ],
  })

  const summaryBody = [
    ["Induction register", String(headCounts.induction)],
    ["Admin members (Site Staff register)", String(headCounts.admin)],
    ["Operator register", String(headCounts.operators)],
    ["Total workers on site", String(headCounts.workersOnSite)],
  ]

  const summaryEndY = addTable(doc, {
    startY,
    head: ["Register", "People"],
    body: summaryBody,
    foot: "A name listed in more than one register is counted once in the total.",
    columnStyles: { 0: { halign: "left" }, 1: { halign: "right", cellWidth: 50 } },
    totalRowIndex: summaryBody.length - 1,
  })

  addTable(doc, {
    startY: summaryEndY + 8,
    head: ["#", "Name", "Registers"],
    body: headCounts.people.map((person, index) => [
      String(index + 1),
      person.name,
      person.registers.join(", "),
    ]),
    columnStyles: {
      0: { halign: "right", cellWidth: 14 },
      1: { halign: "left" },
      2: { halign: "left" },
    },
    leftColumns: [1, 2],
  })

  doc.save(`${sanitizePdfFilename(projectName, "project")}-workers-${sanitizePdfFilename(headCounts.monthName, "month")}.pdf`)
}
