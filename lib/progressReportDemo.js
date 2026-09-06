import { formatOperatingHours } from "@/lib/equipmentHoursData"
import { formatCurrency } from "@/lib/formatCurrency"
import {
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueRowRate,
  resolveEarnedValueTotalRate,
} from "@/lib/earnedValueTable"

const TARGET_ACTIVITIES = [
  "Complete formation grading on Chainage 0+000 to 0+500",
  "Place and compact sub-base Layer 1 across the main carriageway",
  "Install edge restraint and kerb lines on the eastern verge",
  "Coordinate surfacing crew mobilisation for the northern section",
  "Complete ducting and drainage tie-ins at Interchange A",
  "Progress reduced levels for the service road embankment",
  "Undertake QA testing on compacted sub-base material",
  "Set out pavement layers for the roundabout approach",
]

const ACTUAL_MILESTONES = [
  "Formation grading achieved 92% of planned chainage",
  "Sub-base compaction completed on 1.2 km of main carriageway",
  "Edge restraint installed on 680 m of eastern verge",
  "Surfacing crew mobilised — tack coat applied on northern section",
  "Drainage tie-ins at Interchange A completed ahead of schedule",
  "Service road embankment reduced levels at 78% completion",
  "QA tests passed for Lot 3 sub-base — CBR values within spec",
  "Roundabout approach set-out verified by survey team",
]

const CONSTRAINTS = [
  "Minor delay from afternoon rain on Wednesday — recovered Thursday",
  "Material delivery rescheduled; no impact on critical path",
  "Additional survey check required at CH 0+320 — resolved same day",
  "One lane closure extended by 2 hours for safety inspection",
]

export function buildDemoTargetPlan({ weekNumber, weekRange }) {
  const activityA = TARGET_ACTIVITIES[(weekNumber - 1) % TARGET_ACTIVITIES.length]
  const activityB = TARGET_ACTIVITIES[weekNumber % TARGET_ACTIVITIES.length]
  const constraint = CONSTRAINTS[(weekNumber - 1) % CONSTRAINTS.length]

  return `<p><strong>Target Plan — Week ${weekNumber} (${weekRange})</strong></p>
<p>The programme target for this week focuses on maintaining momentum on the Roads main carriageway works while coordinating surfacing and drainage activities.</p>
<p><strong>Key objectives</strong></p>
<ul>
<li>${activityA}</li>
<li>${activityB}</li>
<li>Hold daily coordination meetings with subcontractors at 07:30</li>
<li>Submit updated look-ahead schedule to the client by Friday</li>
</ul>
<p><strong>Resources planned</strong></p>
<ul>
<li>2 × 20t excavators, 1 × grader, 2 × rollers on formation works</li>
<li>Paving crew (12 operatives) on standby for surfacing window</li>
<li>Survey team available Tuesday–Thursday for set-out checks</li>
</ul>
<p><strong>Constraints / assumptions</strong></p>
<p>${constraint}</p>`
}

export function buildDemoActualProgressUpdate({ weekNumber, weekRange }) {
  const milestone = ACTUAL_MILESTONES[(weekNumber - 1) % ACTUAL_MILESTONES.length]
  const milestoneB = ACTUAL_MILESTONES[weekNumber % ACTUAL_MILESTONES.length]
  const constraint = CONSTRAINTS[weekNumber % CONSTRAINTS.length]

  return `<p><strong>Actual Progress Update — Week ${weekNumber} (${weekRange})</strong></p>
<p>Site progress this week remained broadly aligned with the target plan. The main carriageway team maintained output despite ${constraint.toLowerCase()}.</p>
<p><strong>Achievements</strong></p>
<ul>
<li>${milestone}</li>
<li>${milestoneB}</li>
<li>Health &amp; safety: zero reportable incidents this week</li>
</ul>
<p><strong>Look-ahead</strong></p>
<p>Next week the team will continue formation and sub-base works while preparing the surfacing sequence for the northern section. Client progress meeting scheduled for Monday 09:00.</p>`
}

export function buildInitialDemoTargetPlan({ weekRange }) {
  return buildDemoTargetPlan({ weekNumber: 1, weekRange })
}

export function buildInitialDemoActualProgressUpdate({ weekRange }) {
  return buildDemoActualProgressUpdate({ weekNumber: 1, weekRange })
}

export function isProgressUpdateEmpty(report) {
  const updateText = (report.progressUpdate?.content || "").replace(/<[^>]*>/g, "").trim()
  return !updateText
}

export function isProgressReportContentEmpty(report) {
  const summaryText = (report.progressSummary || "").replace(/<[^>]*>/g, "").trim()
  return !summaryText && isProgressUpdateEmpty(report)
}

export function isTargetPlanEmpty(report) {
  const summaryText = (report.progressSummary || "").replace(/<[^>]*>/g, "").trim()
  return !summaryText
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const VALUATION_NOTES_HEADING = "NOTES"
const VALUATION_NOTES_FOOTER =
  "These figures are copied from the valuations dashboard and update automatically."
const EQUIPMENT_NOTES_HEADING = "EQUIPMENT IN USE"
const EQUIPMENT_NOTES_FOOTER =
  "These figures are copied from the equipment in use dashboard and update automatically."
const OPERATOR_REGISTER_HEADING = "OPERATOR REGISTER"
const OPERATOR_REGISTER_FOOTER =
  "These figures are copied from the operator register and update automatically."

const CELL =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left;"'
const CELL_RIGHT =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right;"'
const HEAD =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; background:#f4f4f5;"'
const HEAD_RIGHT =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;"'
const FOOT =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; font-weight:600;"'
const FOOT_RIGHT =
  'style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; font-weight:600;"'

function isEmptyHtml(html) {
  return !html || !String(html).replace(/<[^>]*>/g, "").trim()
}

export function isLinkedValuationNotes(html) {
  if (isEmptyHtml(html)) {
    return true
  }

  const hasLinkedHeading =
    /<(?:p|h[1-3])[^>]*>\s*<strong>\s*(NOTES|Daily Valuation Progress Report)\s*<\/strong>/i.test(html)
  const hasTable = /<table/i.test(html)
  const hasDescription = /Description/i.test(html)
  const hasCost = /(?:Actual Cost on Site|\bCost\b)/i.test(html)
  const hasProduction = /Production/i.test(html)
  const hasRate = /Rate/i.test(html)

  return hasLinkedHeading && hasTable && hasDescription && hasCost && hasProduction && hasRate
}

export function isLinkedEquipmentNotes(html) {
  if (isEmptyHtml(html)) {
    return true
  }

  const hasLinkedHeading =
    /<(?:p|h[1-3])[^>]*>\s*<strong>\s*EQUIPMENT IN USE\s*<\/strong>/i.test(html)
  const hasTable = /<table/i.test(html)
  const hasSupplier = /Supplier/i.test(html)
  const hasPlant = /Plant/i.test(html)
  const hasHours = /Hours operating/i.test(html)

  return hasLinkedHeading && hasTable && hasSupplier && hasPlant && hasHours
}

export function isLinkedOperatorRegisterNotes(html) {
  if (isEmptyHtml(html)) {
    return true
  }

  const hasLinkedHeading =
    /<(?:p|h[1-3])[^>]*>\s*<strong>\s*OPERATOR REGISTER\s*<\/strong>/i.test(html)
  const hasTable = /<table/i.test(html)
  const hasSupplier = /Supplier/i.test(html)
  const hasAttendance = /Attendance|Days present/i.test(html)

  return hasLinkedHeading && hasTable && hasSupplier && hasAttendance
}

function hasExistingProgressTables(html) {
  if (isEmptyHtml(html)) return false

  return (
    isLinkedValuationNotes(html) ||
    isLinkedEquipmentNotes(html) ||
    isLinkedOperatorRegisterNotes(html)
  )
}

export function isLinkedAutoProgressContent(html) {
  return (
    isLinkedValuationNotes(html) ||
    isLinkedEquipmentNotes(html) ||
    isLinkedOperatorRegisterNotes(html)
  )
}

function stripMatchingTables(html, headerPattern) {
  return String(html).replace(/<table[\s\S]*?<\/table>/gi, (table) =>
    headerPattern.test(table) ? "" : table
  )
}

export function extractValuationNotesCommentary(html) {
  if (!html) return ""

  const rest = stripMatchingTables(
    stripMatchingTables(
      String(html)
        .replace(
          /<(?:p|h[1-3])[^>]*>\s*<strong>\s*(NOTES|Daily Valuation Progress Report)\s*<\/strong>\s*<\/(?:p|h[1-3])>/gi,
          ""
        )
        .replace(
          /<(?:p|h[1-3])[^>]*>\s*<strong>\s*EQUIPMENT IN USE\s*<\/strong>\s*<\/(?:p|h[1-3])>/gi,
          ""
        )
        .replace(
          /<(?:p|h[1-3])[^>]*>\s*<strong>\s*OPERATOR REGISTER\s*<\/strong>\s*<\/(?:p|h[1-3])>/gi,
          ""
        )
        .replace(/<p[^>]*>These figures are copied from the[\s\S]*?<\/p>/gi, ""),
      /Description[\s\S]*?(?:Cost|Production|Rate)/i
    ),
    /Supplier[\s\S]*?(?:Plant|Hours operating|Attendance)/i
  ).trim()

  return rest.replace(/<[^>]*>/g, "").trim() ? rest : ""
}

export function buildDailyValuationProgressContent(summary, label = VALUATION_NOTES_HEADING) {
  if (!summary || !Array.isArray(summary.rows) || summary.rows.length === 0) {
    return ""
  }

  const rowsHtml = summary.rows
    .map((row) => {
      const description = escapeHtml(row?.description || "Description")
      const cost = escapeHtml(formatCurrency(row?.valueEarned ?? 0))
      const production = escapeHtml(formatEarnedValueProduction(row?.production ?? 0))
      const rate = escapeHtml(formatEarnedValueRate(resolveEarnedValueRowRate(row)))

      return `
        <tr>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left;">${description}</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right;">${cost}</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right;">${production}</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right;">${rate}</td>
        </tr>`
    })
    .join("")

  const totals = summary.totals ?? {}
  const totalRate = resolveEarnedValueTotalRate(totals)

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; background:#f4f4f5;">Description</th>
          <th style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;">Cost</th>
          <th style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;">Production</th>
          <th style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;">Rate</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:left; font-weight:600;">Total</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; font-weight:600;">${escapeHtml(formatCurrency(totals.valueEarned ?? 0))}</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; font-weight:600;">${escapeHtml(formatEarnedValueProduction(totals.production ?? 0))}</td>
          <td style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; font-weight:600;">${escapeHtml(formatEarnedValueRate(totalRate))}</td>
        </tr>
      </tfoot>
    </table>
    <p>${VALUATION_NOTES_FOOTER}</p>`
}

export function buildWeeklyEquipmentProgressContent(equipmentReport, label = EQUIPMENT_NOTES_HEADING) {
  if (!equipmentReport || !Array.isArray(equipmentReport.equipment) || equipmentReport.equipment.length === 0) {
    return ""
  }

  const rowsHtml = equipmentReport.equipment
    .map((item) => {
      const supplier = escapeHtml(item?.supplier || "—")
      const plant = escapeHtml(item?.plant || "—")
      const plantNumber = escapeHtml(item?.plantNumber || "—")
      const operatorName = escapeHtml(item?.operatorName || "—")
      const daysInUse = escapeHtml(String(item?.dayCount ?? 0))
      const hoursOperating = escapeHtml(formatOperatingHours(item?.hoursOperating))

      return `
        <tr>
          <td ${CELL}>${supplier}</td>
          <td ${CELL}>${plant}</td>
          <td ${CELL}>${plantNumber}</td>
          <td ${CELL}>${operatorName}</td>
          <td ${CELL_RIGHT}>${daysInUse}</td>
          <td ${CELL_RIGHT}>${hoursOperating}</td>
        </tr>`
    })
    .join("")

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Supplier</th>
          <th ${HEAD}>Plant</th>
          <th ${HEAD}>Plant number</th>
          <th ${HEAD}>Operator's name</th>
          <th ${HEAD_RIGHT}>Days in use</th>
          <th ${HEAD_RIGHT}>Hours operating</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td ${FOOT}>Total</td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT_RIGHT}>${escapeHtml(String(equipmentReport.daysWithEquipment ?? 0))} days</td>
          <td ${FOOT_RIGHT}>${escapeHtml(formatOperatingHours(equipmentReport.totalHours))}</td>
        </tr>
      </tfoot>
    </table>
    <p>${EQUIPMENT_NOTES_FOOTER}</p>`
}

export function buildEquipmentProgressContent(equipmentReport, label = EQUIPMENT_NOTES_HEADING) {
  if (equipmentReport?.period === "weekly" || equipmentReport?.period === "monthly") {
    return buildWeeklyEquipmentProgressContent(equipmentReport, label)
  }

  return buildDailyEquipmentProgressContent(equipmentReport, label)
}

export function buildDailyEquipmentProgressContent(equipmentReport, label = EQUIPMENT_NOTES_HEADING) {
  if (!equipmentReport || !Array.isArray(equipmentReport.equipment) || equipmentReport.equipment.length === 0) {
    return ""
  }

  const rowsHtml = equipmentReport.equipment
    .map((item) => {
      const supplier = escapeHtml(item?.supplier || "—")
      const plant = escapeHtml(item?.plant || "—")
      const plantNumber = escapeHtml(item?.plantNumber || "—")
      const operatorName = escapeHtml(item?.operatorName || "—")
      const startHours = escapeHtml(item?.startHours || "—")
      const finishHours = escapeHtml(item?.finishHours || "—")
      const hoursOperating = escapeHtml(formatOperatingHours(item?.hoursOperating))

      return `
        <tr>
          <td ${CELL}>${supplier}</td>
          <td ${CELL}>${plant}</td>
          <td ${CELL}>${plantNumber}</td>
          <td ${CELL}>${operatorName}</td>
          <td ${CELL_RIGHT}>${startHours}</td>
          <td ${CELL_RIGHT}>${finishHours}</td>
          <td ${CELL_RIGHT}>${hoursOperating}</td>
        </tr>`
    })
    .join("")

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Supplier</th>
          <th ${HEAD}>Plant</th>
          <th ${HEAD}>Plant number</th>
          <th ${HEAD}>Operator's name</th>
          <th ${HEAD_RIGHT}>Start hours</th>
          <th ${HEAD_RIGHT}>Finish hours</th>
          <th ${HEAD_RIGHT}>Hours operating</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td ${FOOT}>Total</td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT_RIGHT}></td>
          <td ${FOOT_RIGHT}></td>
          <td ${FOOT_RIGHT}>${escapeHtml(formatOperatingHours(equipmentReport.totalHours))}</td>
        </tr>
      </tfoot>
    </table>
    <p>${EQUIPMENT_NOTES_FOOTER}</p>`
}

function formatAttendance(value) {
  if (value === "present") return "Present"
  if (value === "absent") return "Absent"
  return "Not marked"
}

export function buildWeeklyOperatorRegisterProgressContent(
  operatorRegister,
  label = OPERATOR_REGISTER_HEADING
) {
  if (!operatorRegister || !Array.isArray(operatorRegister.operators) || operatorRegister.operators.length === 0) {
    return ""
  }

  const rowsHtml = operatorRegister.operators
    .map((item) => {
      const supplier = escapeHtml(item?.supplier || "—")
      const plant = escapeHtml(item?.plant || "—")
      const plantNumber = escapeHtml(item?.plantNumber || "—")
      const operatorName = escapeHtml(item?.operatorName || "—")
      const presentDays = escapeHtml(String(item?.presentDays ?? 0))
      const absentDays = escapeHtml(String(item?.absentDays ?? 0))

      return `
        <tr>
          <td ${CELL}>${supplier}</td>
          <td ${CELL}>${plant}</td>
          <td ${CELL}>${plantNumber}</td>
          <td ${CELL}>${operatorName}</td>
          <td ${CELL_RIGHT}>${presentDays}</td>
          <td ${CELL_RIGHT}>${absentDays}</td>
        </tr>`
    })
    .join("")

  const presentCount = operatorRegister.presentCount ?? 0
  const absentCount = operatorRegister.absentCount ?? 0

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Supplier</th>
          <th ${HEAD}>Plant</th>
          <th ${HEAD}>Plant number</th>
          <th ${HEAD}>Operator's name</th>
          <th ${HEAD_RIGHT}>Days present</th>
          <th ${HEAD_RIGHT}>Days absent</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td ${FOOT}>Total</td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT_RIGHT}>${escapeHtml(String(presentCount))}</td>
          <td ${FOOT_RIGHT}>${escapeHtml(String(absentCount))}</td>
        </tr>
      </tfoot>
    </table>
    <p>${OPERATOR_REGISTER_FOOTER}</p>`
}

export function buildOperatorRegisterProgressContent(
  operatorRegister,
  label = OPERATOR_REGISTER_HEADING
) {
  if (operatorRegister?.period === "weekly") {
    return buildWeeklyOperatorRegisterProgressContent(operatorRegister, label)
  }

  return buildDailyOperatorRegisterProgressContent(operatorRegister, label)
}

export function buildDailyOperatorRegisterProgressContent(
  operatorRegister,
  label = OPERATOR_REGISTER_HEADING
) {
  if (!operatorRegister || !Array.isArray(operatorRegister.operators) || operatorRegister.operators.length === 0) {
    return ""
  }

  const rowsHtml = operatorRegister.operators
    .map((item) => {
      const supplier = escapeHtml(item?.supplier || "—")
      const plant = escapeHtml(item?.plant || "—")
      const plantNumber = escapeHtml(item?.plantNumber || "—")
      const operatorName = escapeHtml(item?.operatorName || "—")
      const attendance = escapeHtml(formatAttendance(item?.attendance))

      return `
        <tr>
          <td ${CELL}>${supplier}</td>
          <td ${CELL}>${plant}</td>
          <td ${CELL}>${plantNumber}</td>
          <td ${CELL}>${operatorName}</td>
          <td ${CELL}>${attendance}</td>
        </tr>`
    })
    .join("")

  const presentCount = operatorRegister.presentCount ?? 0
  const absentCount = operatorRegister.absentCount ?? 0

  return `
    <p><strong>${escapeHtml(label)}</strong></p>
    <table style="width:100%; border-collapse:collapse; margin:12px 0;">
      <thead>
        <tr>
          <th ${HEAD}>Supplier</th>
          <th ${HEAD}>Plant</th>
          <th ${HEAD}>Plant number</th>
          <th ${HEAD}>Operator's name</th>
          <th ${HEAD}>Attendance</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr>
          <td ${FOOT}>Total</td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT}></td>
          <td ${FOOT}>${escapeHtml(`${presentCount} present · ${absentCount} absent`)}</td>
        </tr>
      </tfoot>
    </table>
    <p>${OPERATOR_REGISTER_FOOTER}</p>`
}

export function mergeValuationNotesContent(
  savedContent,
  summary,
  equipmentReport = null,
  operatorRegister = null,
  options = {}
) {
  if (options.userEdited) {
    return savedContent || ""
  }

  const valuationHtml = buildDailyValuationProgressContent(summary, VALUATION_NOTES_HEADING)
  const operatorHtml = buildOperatorRegisterProgressContent(operatorRegister)
  const equipmentHtml = buildEquipmentProgressContent(equipmentReport)
  const snapshot = [valuationHtml, operatorHtml, equipmentHtml].filter(Boolean).join("")

  if (isEmptyHtml(savedContent)) {
    return snapshot || savedContent || ""
  }

  if (hasExistingProgressTables(savedContent)) {
    let next = savedContent
    if (valuationHtml && !/<(?:p|h[1-3])[^>]*>\s*<strong>\s*(NOTES|Daily Valuation Progress Report)\s*<\/strong>/i.test(next)) {
      next = `${valuationHtml}${next}`
    }
    if (operatorHtml && !/<(?:p|h[1-3])[^>]*>\s*<strong>\s*OPERATOR REGISTER\s*<\/strong>/i.test(next)) {
      next = `${next}${operatorHtml}`
    }
    if (equipmentHtml && !/<(?:p|h[1-3])[^>]*>\s*<strong>\s*EQUIPMENT IN USE\s*<\/strong>/i.test(next)) {
      next = `${next}${equipmentHtml}`
    }
    return next
  }

  return savedContent
}

/**
 * Empty documents are seeded once from valuations, operator register, and
 * equipment in use. After that the Word document is the user's to edit.
 */
export function resolveActualProgressUpdateContent(
  report,
  summary = null,
  equipmentReport = null,
  operatorRegister = null
) {
  const savedContent = report?.progressUpdate?.content || ""
  if (report?.progressUpdate?.userEdited) {
    return savedContent
  }

  const seeded = mergeValuationNotesContent(
    savedContent,
    summary,
    equipmentReport,
    operatorRegister
  )

  if (seeded) {
    return seeded
  }

  return report.progressSummary || ""
}

export function seedActualProgressFromTargetPlan(targetPlanHtml, { weekNumber, weekRange } = {}) {
  const plainTargetPlan = (targetPlanHtml || "").replace(/<[^>]*>/g, "").trim()

  if (!plainTargetPlan) {
    return weekNumber ? buildDemoActualProgressUpdate({ weekNumber, weekRange }) : ""
  }

  const milestone = ACTUAL_MILESTONES[(Math.max(weekNumber, 1) - 1) % ACTUAL_MILESTONES.length]

  return targetPlanHtml
    .replace(/Target Plan/g, "Actual Progress Update")
    .replace(
      /programme target for this week focuses on/gi,
      "actual progress this week against the target plan focused on"
    )
    .concat(
      `<p><strong>Recorded outcome</strong></p><ul><li>${milestone}</li><li>Health &amp; safety: zero reportable incidents this week</li></ul>`
    )
}

export function carryForwardProgressReportContent(report, previousReport) {
  if (!previousReport) return report

  return {
    ...report,
    progressSummary: previousReport.progressSummary || report.progressSummary,
    progressUpdate: {
      ...report.progressUpdate,
      content: "",
      attachments: report.progressUpdate?.attachments || [],
      photos: report.progressUpdate?.photos || [],
      updatedAt: new Date().toISOString(),
    },
  }
}

export function fillDemoProgressReportContent(report) {
  const weekNumber = report.weekNumber ?? 1
  const weekRange = report.weekRange ?? report.label?.replace("Progress Report - ", "") ?? ""
  const targetPlan = buildDemoTargetPlan({ weekNumber, weekRange })

  return {
    ...report,
    progressSummary: targetPlan,
    progressUpdate: {
      ...report.progressUpdate,
      content: seedActualProgressFromTargetPlan(targetPlan, { weekNumber, weekRange }),
      attachments: report.progressUpdate?.attachments || [],
      photos: report.progressUpdate?.photos || [],
      updatedAt: new Date().toISOString(),
    },
  }
}
