"use client"

import { useProjectData } from "@/components/project/ProjectDataProvider"
import PlantRateAnalysisReportTable from "@/components/project/PlantRateAnalysisReportTable"
import { formatDailyRate, formatPlantCost, getPlantRateAnalysisPeriodSummary } from "@/lib/plantCostData"
import { getPlantOnSitePeriodHref } from "@/lib/plantOnSiteModules"

export default function PlantCostTable({ projectId, period, fileId }) {
  const { version } = useProjectData()
  const summary = getPlantRateAnalysisPeriodSummary(projectId, period, fileId)
  void version

  const periodLabel =
    period === "weekly" ? "week" : period === "monthly" ? "month" : "project"
  const dailyHref = getPlantOnSitePeriodHref(projectId, "plant-cost", "daily")

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        <p>
          This {periodLabel === "project" ? "project to date" : `${periodLabel}ly`} summary is
          read-only and rolls up from hourly plant cost entries saved in daily files. Edit entries
          in the{" "}
          <a
            href={dailyHref}
            className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500"
          >
            daily plant cost files
          </a>
          .
        </p>
        <p className="mt-2">
          {summary.daysWithEntries} daily file{summary.daysWithEntries === 1 ? "" : "s"} with
          entries · Total plant cost:{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatPlantCost(summary.totals.dailyPlantCost)}
          </span>
          {" · "}
          Total production:{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {summary.totals.production || "—"}
          </span>
          {" · "}
          {period === "project-to-date" ? "Project" : "Period"} rate:{" "}
          <span className="font-semibold tabular-nums text-zinc-900">
            {formatDailyRate(summary.totals.dailyRate)}
          </span>
        </p>
      </div>

      <PlantRateAnalysisReportTable
        summary={summary}
        totalLabel={
          period === "project-to-date"
            ? "Project to date total"
            : period === "weekly"
              ? "Weekly total"
              : "Monthly total"
        }
        emptyMessage={`No plant cost entries recorded for this ${periodLabel} yet. Enter plant costs in daily hourly material schedules to build this summary.`}
      />
    </div>
  )
}
