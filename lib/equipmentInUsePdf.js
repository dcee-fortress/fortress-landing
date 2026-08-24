import autoTable from "jspdf-autotable"
import { createLandscapePdf } from "@/lib/earnedValuePdf"
import { formatOperatingHours } from "@/lib/equipmentHoursData"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_FOOTNOTE_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  createHeadColumnAlignment,
} from "@/lib/pdfTable"

const LANDSCAPE_TABLE_WIDTH = 297 - PDF_PAGE_MARGIN * 2

const DAILY_LEFT_COLUMNS = [0, 1, 2, 3]
const PERIOD_LEFT_COLUMNS = [0, 1, 2, 3]

const TABLE_OPTIONS = {
  margin: PDF_TABLE_MARGINS,
  styles: { fontSize: 9, cellPadding: 3, valign: "middle", overflow: "linebreak" },
  headStyles: PDF_DARK_HEAD_STYLES,
  showHead: "everyPage",
  rowPageBreak: "auto",
  tableWidth: LANDSCAPE_TABLE_WIDTH,
}

const DAILY_COLUMN_STYLES = {
  0: { halign: "left", cellWidth: 38 },
  1: { halign: "left", cellWidth: 42 },
  2: { halign: "left", cellWidth: 32 },
  3: { halign: "left", cellWidth: 52 },
  4: { halign: "right", cellWidth: 30 },
  5: { halign: "right", cellWidth: 30 },
  6: { halign: "right", cellWidth: 45 },
}

const PERIOD_COLUMN_STYLES = {
  0: { halign: "left", cellWidth: 42 },
  1: { halign: "left", cellWidth: 48 },
  2: { halign: "left", cellWidth: 36 },
  3: { halign: "left", cellWidth: 58 },
  4: { halign: "right", cellWidth: 35 },
  5: { halign: "right", cellWidth: 50 },
}

function addHeader(doc, { title, projectName, lines }) {
  doc.setFontSize(18)
  doc.setTextColor(0)
  doc.text(title, PDF_PAGE_MARGIN, 18)
  doc.setFontSize(11)
  doc.setTextColor(80)
  doc.text(`Project: ${projectName}`, PDF_PAGE_MARGIN, 26)

  lines.forEach((line, index) => {
    doc.text(line, PDF_PAGE_MARGIN, 34 + index * 6)
  })

  doc.setTextColor(0)
  return 34 + lines.length * 6 + 6
}

function buildDailyBody(equipment) {
  return equipment.map((item) => [
    item.supplier || "—",
    item.plant || "—",
    item.plantNumber || "—",
    item.operatorName || "—",
    item.startHours || "—",
    item.finishHours || "—",
    formatOperatingHours(item.hoursOperating),
  ])
}

function buildPeriodBody(equipment) {
  return equipment.map((item) => [
    item.supplier || "—",
    item.plant || "—",
    item.plantNumber || "—",
    item.operatorName || "—",
    String(item.dayCount ?? 0),
    formatOperatingHours(item.hoursOperating),
  ])
}

export function exportEquipmentInUsePdf({ projectName, report, period }) {
  const doc = createLandscapePdf()
  const isDaily = period === "daily"
  const title = "Equipment in Use on Site"
  const lines = isDaily
    ? [
        `Date: ${report.dateLabel}`,
        `Equipment count: ${report.totalCount}`,
      ]
    : [
        `Period: ${report.periodLabel}`,
        `Unique equipment: ${report.totalCount}`,
        `Days with register ticks: ${report.daysWithEquipment ?? 0}`,
      ]

  const startY = addHeader(doc, { title, projectName, lines })

  if (report.equipment.length === 0) {
    doc.setFontSize(11)
    doc.text(
      "No equipment marked present in the operator register for this period.",
      PDF_PAGE_MARGIN,
      startY
    )
  } else if (isDaily) {
    autoTable(doc, {
      startY,
      head: [[
        "Supplier",
        "Plant",
        "Plant number",
        "Operator's name",
        "Start hours",
        "Finish hours",
        "Hours operating",
      ]],
      body: buildDailyBody(report.equipment),
      foot: [[
        {
          content:
            "Equipment listed from the operator register when marked present. Enter start and finish hours, or type hours operating directly.",
          colSpan: 7,
        },
      ]],
      ...TABLE_OPTIONS,
      footStyles: PDF_FOOTNOTE_STYLES,
      columnStyles: DAILY_COLUMN_STYLES,
      didParseCell: createHeadColumnAlignment(DAILY_LEFT_COLUMNS),
    })
  } else {
    autoTable(doc, {
      startY,
      head: [[
        "Supplier",
        "Plant",
        "Plant number",
        "Operator's name",
        "Days in use",
        "Hours operating",
      ]],
      body: buildPeriodBody(report.equipment),
      foot: [[
        {
          content:
            "Weekly and monthly hours cumulate from daily start and finish hour entries.",
          colSpan: 6,
        },
      ]],
      ...TABLE_OPTIONS,
      footStyles: PDF_FOOTNOTE_STYLES,
      columnStyles: PERIOD_COLUMN_STYLES,
      didParseCell: createHeadColumnAlignment(PERIOD_LEFT_COLUMNS),
    })
  }

  const filename = isDaily
    ? `equipment-in-use-${report.fileId}.pdf`
    : `equipment-in-use-${period}-${report.fileId}.pdf`

  doc.save(filename)
}
