import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { sanitizePdfFilename } from "@/lib/earnedValuePdf"

const MARGIN = 14

function sectionStart(doc, startY) {
  if (startY > 175) {
    doc.addPage()
    return 16
  }
  return startY
}

function addHeading(doc, y, title, note) {
  doc.setFont("times", "bold")
  doc.setFontSize(13)
  doc.setTextColor(24, 24, 27)
  doc.text(title, MARGIN, y)
  let next = y + 5
  if (note) {
    doc.setFont("times", "normal")
    doc.setFontSize(9)
    doc.setTextColor(82, 82, 91)
    const lines = doc.splitTextToSize(note, 269)
    doc.text(lines, MARGIN, next)
    next += lines.length * 4 + 1
  }
  return next
}

function addTable(doc, startY, headers, rows, empty) {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.length ? rows : [[{ content: empty, colSpan: headers.length }]],
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 2.2,
      overflow: "linebreak",
      valign: "top",
      textColor: [24, 24, 27],
    },
    headStyles: {
      fillColor: [24, 24, 27],
      textColor: 255,
      fontStyle: "bold",
      font: "times",
    },
    theme: "grid",
  })
  return doc.lastAutoTable.finalY + 8
}

function addSection(doc, startY, section) {
  const y = addHeading(doc, sectionStart(doc, startY), section.title, section.note)
  return addTable(doc, y, section.headers, section.rows, section.empty)
}

/**
 * One landscape PDF of the site report already on screen.
 * Daily reports include the weather lines and, when present, the working-hour rows.
 */
export function buildSiteReportPdf({
  projectName,
  periodLabel,
  fileLabel,
  intro,
  weatherLines = [],
  weatherHours = [],
  sections = [],
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  doc.setFont("times", "bold")
  doc.setFontSize(18)
  doc.setTextColor(24, 24, 27)
  doc.text(String(fileLabel || "Site report"), MARGIN, 16)

  doc.setFont("times", "normal")
  doc.setFontSize(11)
  doc.setTextColor(82, 82, 91)
  const details = [`${projectName} · ${periodLabel} site report`, intro].filter(Boolean)
  details.forEach((line, index) => {
    doc.text(String(line), MARGIN, 24 + index * 6)
  })

  let y = 24 + details.length * 6 + 6

  if (weatherLines.length || weatherHours.length) {
    y = addHeading(doc, sectionStart(doc, y), "Weather", weatherLines.join("\n") || "Weather is unavailable.")
    if (weatherHours.length) {
      y = addTable(
        doc,
        y,
        ["Time", "Temperature", "Conditions"],
        weatherHours.map((hour) => [hour.time || "—", hour.temperature || "—", hour.label || "—"]),
        "No working-hour forecast.",
      )
    } else {
      y += 4
    }
  }

  for (const section of sections) {
    y = addSection(doc, y, section)
  }

  return doc
}

export function exportSiteReportPdf(options) {
  const doc = buildSiteReportPdf(options)
  const name = sanitizePdfFilename(options.projectName, "project")
  const file = sanitizePdfFilename(options.fileId || options.fileLabel, "site-report")
  doc.save(`${name}-${file}-site-report.pdf`)
}
