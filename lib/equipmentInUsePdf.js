import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatOperatingHours } from "@/lib/equipmentHoursData"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  createHeadColumnAlignment,
} from "@/lib/pdfTable"

const DAILY_LEFT_COLUMNS = [0, 1, 2, 3]
const PERIOD_LEFT_COLUMNS = [0, 1, 2, 3]

const TABLE_OPTIONS = {
  margin: PDF_TABLE_MARGINS,
  styles: { fontSize: 10, cellPadding: 4, valign: "middle", overflow: "linebreak" },
  headStyles: PDF_DARK_HEAD_STYLES,
}

function addHeader(doc, { title, projectName, lines }) {
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
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
  const isDaily = period === "daily"
  const title = "Equipment in Use on Site"
  const lines = isDaily
    ? [
        `Date: ${report.dateLabel}`,
        `Equipment count: ${report.totalCount}`,
        `Total hours: ${formatOperatingHours(report.totalHours)}`,
      ]
    : [
        `Period: ${report.periodLabel}`,
        `Unique equipment: ${report.totalCount}`,
        `Days with register ticks: ${report.daysWithEquipment ?? 0}`,
        `Total hours: ${formatOperatingHours(report.totalHours)}`,
      ]

  const startY = addHeader(doc, { title, projectName, lines })

  if (report.equipment.length === 0) {
    doc.setFontSize(11)
    doc.text("No equipment marked present in the operator register for this period.", PDF_PAGE_MARGIN, startY)
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
      ...TABLE_OPTIONS,
      columnStyles: {
        0: { halign: "left", cellWidth: 28 },
        1: { halign: "left", cellWidth: 28 },
        2: { halign: "left", cellWidth: 28 },
        3: { halign: "left", cellWidth: 40 },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "right", cellWidth: 28 },
        6: { halign: "right", cellWidth: 32 },
      },
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
      ...TABLE_OPTIONS,
      columnStyles: {
        0: { halign: "left", cellWidth: 32 },
        1: { halign: "left", cellWidth: 32 },
        2: { halign: "left", cellWidth: 32 },
        3: { halign: "left", cellWidth: 48 },
        4: { halign: "right", cellWidth: 32 },
        5: { halign: "right", cellWidth: 36 },
      },
      didParseCell: createHeadColumnAlignment(PERIOD_LEFT_COLUMNS),
    })
  }
  const filename = isDaily
    ? `equipment-in-use-${report.fileId}.pdf`
    : `equipment-in-use-${period}-${report.fileId}.pdf`

  doc.save(filename)
}
