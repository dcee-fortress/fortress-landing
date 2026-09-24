import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import {
  PDF_DARK_HEAD_STYLES,
  PDF_PAGE_MARGIN,
  PDF_TABLE_MARGINS,
  PDF_TOTAL_ROW_FILL,
} from "@/lib/pdfTable"
import { formatMaterialAmount, formatMaterialCurrencyAmount } from "@/lib/plantCostCalculations"
import {
  SHEQ_INCIDENT_TYPES,
  SHEQ_INCIDENT_YES_NO,
  getSheqIncidentReport,
} from "@/lib/sheqIncident"
import {
  SHEQ_SITE_INSPECTION_COLUMNS,
  getSheqSiteInspectionReport,
} from "@/lib/sheqSiteInspection"
import {
  SHEQ_WEEKLY_TRAINING_COLUMNS,
  getSheqWeeklyIncidentSummaryLines,
  getSheqWeeklyReport,
} from "@/lib/sheqWeeklyReport"
import { getSiteStaffRegisterData } from "@/lib/siteStaffRegisterData"
import { getInductionRegisterData } from "@/lib/inductionRegisterData"

function sanitizePdfFilename(value, fallback = "report") {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return normalized || fallback
}

function openPdf(doc, filename) {
  const blob = doc.output("blob")
  const url = URL.createObjectURL(blob)
  const preview = window.open(url, "_blank", "noopener,noreferrer")
  if (!preview) {
    doc.save(filename)
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function addReportHeader(doc, title, details = []) {
  doc.setFontSize(16)
  doc.setTextColor(0)
  doc.text(String(title || "Report"), PDF_PAGE_MARGIN, 16)
  doc.setFontSize(10)
  doc.setTextColor(80)
  details.forEach((line, index) => {
    doc.text(String(line || ""), PDF_PAGE_MARGIN, 23 + index * 5)
  })
  doc.setTextColor(0)
  return 23 + details.length * 5 + 6
}

/**
 * Shared multi-table PDF exporter for Safety / SHEQ / PPE / register pages.
 * @param {{
 *   filename: string,
 *   title: string,
 *   details?: string[],
 *   orientation?: "portrait" | "landscape",
 *   tables?: Array<{ title?: string, head: string[], body: any[][], foot?: any[][] }>
 * }} options
 */
export function exportSafetyReportPdf({
  filename,
  title,
  details = [],
  orientation = "landscape",
  tables = [],
}) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4" })
  let startY = addReportHeader(doc, title, details)

  for (const table of tables) {
    if (table.title) {
      if (startY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage()
        startY = PDF_PAGE_MARGIN
      }
      doc.setFontSize(11)
      doc.setFont(undefined, "bold")
      doc.text(String(table.title), PDF_PAGE_MARGIN, startY)
      doc.setFont(undefined, "normal")
      startY += 5
    }

    autoTable(doc, {
      startY,
      head: [table.head],
      body: table.body.length > 0 ? table.body : [["—"]],
      foot: table.foot,
      margin: PDF_TABLE_MARGINS,
      styles: { fontSize: 8, cellPadding: 2.5, valign: "middle", overflow: "linebreak" },
      headStyles: PDF_DARK_HEAD_STYLES,
      footStyles: {
        fillColor: PDF_TOTAL_ROW_FILL,
        textColor: [24, 24, 27],
        fontStyle: "bold",
      },
    })
    startY = doc.lastAutoTable.finalY + 10
  }

  openPdf(doc, sanitizePdfFilename(filename, "safety-report") + ".pdf")
}

function labelFromOptions(options, value) {
  const match = (options || []).find((item) => item.value === value)
  return match?.label || String(value || "—")
}

export function exportSheqSiteInspectionPdf({
  projectId,
  projectName,
  period,
  periodId,
  periodLabel,
}) {
  const report = getSheqSiteInspectionReport(projectId, period, periodId, { projectName })
  const head = SHEQ_SITE_INSPECTION_COLUMNS.map((column) => column.label)
  const body = (report.rows || []).map((row) =>
    SHEQ_SITE_INSPECTION_COLUMNS.map((column) => String(row[column.field] ?? ""))
  )

  exportSafetyReportPdf({
    filename: `sheq-site-inspection-${period}-${periodId}`,
    title: "SHEQ Site Inspection Report",
    details: [
      `Project: ${report.projectName || projectName || "—"}`,
      `Period: ${periodLabel || periodId}`,
      `Date: ${report.date || "—"}`,
      `Location: ${report.location || "—"}`,
    ],
    tables: [
      {
        title: "Findings",
        head,
        body: body.length > 0 ? body : [["", "", "No findings entered", "", ""]],
      },
    ],
  })
}

export function exportSheqIncidentPdf({ projectId, projectName, fileId, dayLabel }) {
  const report = getSheqIncidentReport(projectId, fileId)
  const fields = [
    ["Injured / involved name", report.injuredName],
    ["Location on site", report.locationOnSite],
    ["Incident type", labelFromOptions(SHEQ_INCIDENT_TYPES, report.incidentType)],
    ["Description", report.description],
    ["Witness names", report.witnessNames],
    ["Body part / symptoms", report.bodyPartOrSymptoms],
    ["First aid given", labelFromOptions(SHEQ_INCIDENT_YES_NO, report.firstAidGiven)],
    ["Hospital referral", report.hospitalReferral],
    ["Reported by", report.reportedBy],
    ["Photos attached", String((report.photos || []).length)],
  ]

  exportSafetyReportPdf({
    filename: `sheq-incident-${fileId}`,
    title: "SHEQ Incident Report",
    details: [
      `Project: ${projectName || "—"}`,
      `File: ${dayLabel || fileId}`,
    ],
    orientation: "portrait",
    tables: [
      {
        title: "Incident details",
        head: ["Field", "Value"],
        body: fields.map(([field, value]) => [field, String(value || "—")]),
      },
    ],
  })
}

export function exportSheqWeeklyReportPdf({
  projectId,
  projectName,
  weekId,
  weekLabel,
  variant = "actual",
}) {
  const report = getSheqWeeklyReport(projectId, weekId, { projectName, variant })
  const isTarget = variant === "target"

  let documentPlain = ""
  if (typeof document !== "undefined") {
    const temp = document.createElement("div")
    temp.innerHTML = report.documentHtml || ""
    documentPlain = String(temp.textContent || "").trim()
  } else {
    documentPlain = String(report.documentHtml || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  const tables = []

  if (!isTarget) {
    const trainingHead = SHEQ_WEEKLY_TRAINING_COLUMNS.map((column) => column.label)
    const trainingBody = (report.trainingRows || []).map((row) =>
      SHEQ_WEEKLY_TRAINING_COLUMNS.map((column) => String(row[column.field] ?? ""))
    )
    const incidentLines = getSheqWeeklyIncidentSummaryLines(
      projectId,
      weekId,
      report.incidentSummary
    )
    tables.push(
      {
        title: "Training Conducted Workforce",
        head: trainingHead,
        body: trainingBody,
      },
      {
        title: "Incident summary",
        head: ["Description", "Number of cases"],
        body: incidentLines.map((line) => [line.description, String(line.cases)]),
      }
    )
  }

  if (documentPlain) {
    tables.push({
      title: isTarget ? "Target SHEQ document" : "SHEQ document",
      head: ["Notes"],
      body: [[documentPlain]],
    })
  }

  exportSafetyReportPdf({
    filename: isTarget
      ? `target-weekly-sheq-report-${weekId}`
      : `actual-sheq-weekly-report-${weekId}`,
    title: isTarget ? "Target Weekly SHEQ Report" : "Actual Progress Report",
    details: [
      `Project: ${report.projectName || projectName || "—"}`,
      `Week: ${weekLabel || weekId}`,
    ],
    tables,
  })
}

export function exportSiteStaffAttendancePdf({ projectId, projectName, monthId, monthLabel }) {
  const register = getSiteStaffRegisterData(projectId, monthId)
  const days = Array.from({ length: register.daysInMonth || 31 }, (_, index) => index + 1)
  const head = ["Name", "Role", ...days.map(String)]
  const body = (register.rows || [])
    .filter((row) => String(row.name || "").trim() || String(row.role || "").trim())
    .map((row) => [
      String(row.name || ""),
      String(row.role || ""),
      ...days.map((day) => {
        const value = row.attendance?.[String(day)]
        if (value === "present") return "P"
        if (value === "absent") return "X"
        return ""
      }),
    ])

  exportSafetyReportPdf({
    filename: `site-staff-attendance-${monthId}`,
    title: "Monthly Site Staff Attendance Register",
    details: [
      `Project: ${projectName || "—"}`,
      `Month: ${monthLabel || register.monthName || monthId}`,
      "P = present · X = absent",
    ],
    tables: [
      {
        head,
        body: body.length > 0 ? body : [["No staff rows entered", "", ...days.map(() => "")]],
      },
    ],
  })
}

export function exportInductionRegisterPdf({ projectId, projectName, monthId, monthLabel }) {
  const register = getInductionRegisterData(projectId, monthId)
  const body = (register.rows || [])
    .filter(
      (row) =>
        String(row.name || "").trim() ||
        String(row.idNumber || "").trim() ||
        String(row.phoneNumber || "").trim() ||
        String(row.position || "").trim() ||
        String(row.companyName || "").trim()
    )
    .map((row) => [
      String(row.name || ""),
      String(row.idNumber || ""),
      String(row.phoneNumber || ""),
      String(row.position || ""),
      String(row.companyName || ""),
    ])

  exportSafetyReportPdf({
    filename: `induction-register-${monthId}`,
    title: "Monthly Induction Register",
    details: [
      `Project: ${projectName || "—"}`,
      `Month: ${monthLabel || register.monthName || monthId}`,
    ],
    tables: [
      {
        head: ["Name", "ID Number", "Phone number", "Position", "Company name"],
        body: body.length > 0 ? body : [["No induction rows entered", "", "", "", ""]],
      },
    ],
  })
}

function buildPpeDashboardTable(lines, descriptionLabel) {
  const rows = Array.isArray(lines) ? lines : []
  const totalQuantity = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)
  const totalCost = rows.reduce((sum, row) => sum + (Number(row.totalCost) || 0), 0)
  return {
    head: [descriptionLabel, "Quantities", "Total cost"],
    body:
      rows.length > 0
        ? rows.map((row) => [
            String(row.description || "—"),
            formatMaterialAmount(row.quantity),
            formatMaterialCurrencyAmount(row.totalCost),
          ])
        : [["No entries yet", "—", "—"]],
    foot: [
      [
        "Total",
        formatMaterialAmount(totalQuantity),
        formatMaterialCurrencyAmount(totalCost),
      ],
    ],
  }
}

export function exportPpeReceivedDashboardPdf({
  projectName,
  title,
  periodLabel,
  lines,
}) {
  exportSafetyReportPdf({
    filename: `ppe-received-${sanitizePdfFilename(periodLabel || title || "dashboard")}`,
    title: title || "PPE received dashboard",
    details: [
      `Project: ${projectName || "—"}`,
      periodLabel ? `Period: ${periodLabel}` : "",
    ].filter(Boolean),
    orientation: "portrait",
    tables: [buildPpeDashboardTable(lines, "PPE received")],
  })
}

export function exportPpeIssuedDashboardPdf({
  projectName,
  title,
  periodLabel,
  lines,
}) {
  exportSafetyReportPdf({
    filename: `ppe-issued-${sanitizePdfFilename(periodLabel || title || "dashboard")}`,
    title: title || "PPE issued dashboard",
    details: [
      `Project: ${projectName || "—"}`,
      periodLabel ? `Period: ${periodLabel}` : "",
    ].filter(Boolean),
    orientation: "portrait",
    tables: [buildPpeDashboardTable(lines, "PPE issued")],
  })
}
