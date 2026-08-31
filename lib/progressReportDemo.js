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

export function buildDailyValuationProgressContent(summary, label = "Daily Valuation Progress Report") {
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
          <th style="border:1px solid #d4d4d8; padding:8px 10px; text-align:right; background:#f4f4f5;">Actual Cost on Site</th>
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
    <p>These figures are copied from the daily valuations dashboard and can be edited freely if additional commentary is required.</p>`
}

/**
 * Actual progress update shows the saved target plan for this week until the user
 * edits and saves their own actual progress content.
 *
 * For daily reports (isDaily=true), always show the LIVE daily valuation snapshot
 * to ensure current data is always displayed, even if content was previously saved.
 */
export function resolveActualProgressUpdateContent(report, summary = null, isDaily = false) {
  // For daily reports, ALWAYS prioritize live valuation snapshot if available
  if (isDaily && summary) {
    const dailySnapshot = buildDailyValuationProgressContent(summary)
    if (dailySnapshot) {
      return dailySnapshot
    }
  }

  // For weekly reports or if no daily summary, use existing saved content or fallback
  if (!isProgressUpdateEmpty(report)) {
    return report.progressUpdate.content
  }

  if (summary && !isDaily) {
    const snapshot = buildDailyValuationProgressContent(summary)
    if (snapshot) {
      return snapshot
    }
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
