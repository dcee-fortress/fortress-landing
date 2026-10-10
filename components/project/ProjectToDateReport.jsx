"use client"

import DashboardSearch, { useDashboardSearch } from "@/components/project/DashboardSearch"
import EarnedValueReportTable from "@/components/project/EarnedValueReportTable"
import ExportPdfButton from "@/components/project/ExportPdfButton"
import ProjectToDateCostCard from "@/components/project/ProjectToDateCostCard"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  ACTUAL_COST_ON_SITE_LABEL,
  PRODUCTION_LABEL,
  RATE_LABEL,
  formatEarnedValueProduction,
  formatEarnedValueRate,
  resolveEarnedValueRowRate,
} from "@/lib/earnedValueTable"
import CumulativePeriodNote from "@/components/project/CumulativePeriodNote"
import { formatCurrency } from "@/lib/formatCurrency"

const ROW_ID_PREFIX = "project-to-date-row"

function getActivitySearchText(row) {
  return [
    row.description,
    formatCurrency(row.valueEarned),
    formatEarnedValueProduction(row.production),
    String(row.production ?? ""),
    formatEarnedValueRate(resolveEarnedValueRowRate(row)),
  ].join(" ")
}

function getActivityDetails(row) {
  return [
    { label: ACTUAL_COST_ON_SITE_LABEL, value: formatCurrency(row.valueEarned) },
    { label: PRODUCTION_LABEL, value: formatEarnedValueProduction(row.production) },
    { label: RATE_LABEL, value: formatEarnedValueRate(resolveEarnedValueRowRate(row)) },
  ]
}

export default function ProjectToDateReport({
  projectName,
  projectId = "",
  headerExport = false,
  children,
}) {
  const { getProjectSummary, version } = useProjectData()
  void version
  const summary = getProjectSummary()
  const search = useDashboardSearch({
    rows: summary.rows,
    getSearchText: getActivitySearchText,
    rowIdPrefix: ROW_ID_PREFIX,
    panelId: "project-to-date-search",
  })

  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  const exportToPdf = async () => {
    const { exportProjectToDatePdf } = await import("@/lib/earnedValuePdf")
    exportProjectToDatePdf({ projectName, summary, reportDate })
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Project to Date Report
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
          <CumulativePeriodNote projectId={projectId} />
        </div>
        {headerExport ? <ExportPdfButton onClick={exportToPdf} /> : null}
      </header>

      {children ? <div className="no-print">{children}</div> : null}

      <article
        id="project-to-date-report"
        className="project-report overflow-clip rounded-xl border border-zinc-300 bg-white shadow-sm"
      >
        <div className="border-b border-zinc-200 bg-zinc-50 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Project to Date Report
          </p>
          <h2 className="mt-1 text-2xl font-bold text-zinc-900">{projectName}</h2>
          <p className="mt-1 text-sm text-zinc-500">Report date: {reportDate}</p>
        </div>

        <div className="space-y-6 px-8 py-6">
          <ProjectToDateCostCard summary={summary} />

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Activities Completed on Site
            </h3>
            <p className="mb-4 text-sm text-zinc-500">
              Cumulative from project start to date. Activities with the same or similar narrative
              are grouped under one narrative.
            </p>
            <DashboardSearch
              search={search}
              rows={summary.rows}
              placeholder="Search activity description or quantity…"
              ariaLabel="Search the project to date dashboard"
              noMatchLabel="No activity matches"
              getDetails={getActivityDetails}
            />
            <EarnedValueReportTable
              summary={summary}
              onExportPdf={headerExport ? undefined : exportToPdf}
              rowIdPrefix={ROW_ID_PREFIX}
              highlightedRowIndex={search.highlightedIndex}
            />
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-zinc-50 px-8 py-4 text-xs text-zinc-500">
          Generated for {projectName} · All amounts in USD
        </div>
      </article>
    </div>
  )
}
