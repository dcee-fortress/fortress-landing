"use client"

import { useMemo } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import RatesBoqReportTable from "@/components/project/RatesBoqReportTable"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  compareValuationRatesWithBoq,
  formatBoqRateAnalysisHeading,
  getProjectBoqs,
} from "@/lib/boqData"
import { formatDailyRate } from "@/lib/plantCostData"
import { getRateAnalysisHubHref, getRateAnalysisPeriodHref, RATE_ANALYSIS_PERIODS } from "@/lib/rateAnalysis"
import { getValuationRatesPeriodSummary } from "@/lib/valuationRatesData"

function BoqRateAnalysisSection({ boq, projectId, summary, period, periodLabel }) {
  const reportRows = compareValuationRatesWithBoq(
    projectId,
    summary.dayIds,
    summary.rows,
    boq.items,
    period
  )

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          {formatBoqRateAnalysisHeading(boq.name)}
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Reference BOQ: {boq.fileName || boq.name} · {boq.items.length} item
          {boq.items.length === 1 ? "" : "s"} · Valuations actual rates for this {periodLabel}{" "}
          compared to BOQ · Actual rate = dashboard cost ÷ dashboard production
        </p>
      </div>
      <div className="px-4 py-6 sm:px-6">
        <RatesBoqReportTable
          rows={reportRows}
          period={period}
          emptyMessage={`No actual rates from valuations for this ${periodLabel} yet. Enter actual cost on site material schedules in daily valuations first.`}
        />
      </div>
    </article>
  )
}

export default function RateAnalysisDetailView({
  projectName,
  projectId,
  period,
  file,
}) {
  const { version } = useProjectData()

  const periodOption = RATE_ANALYSIS_PERIODS.find((item) => item.period === period)
  const summary = useMemo(
    () => getValuationRatesPeriodSummary(projectId, period, file.id),
    [projectId, period, file.id, version] // eslint-disable-line react-hooks/exhaustive-deps -- version refreshes live valuation data
  )
  const projectBoqs = getProjectBoqs(projectId)

  const periodLabel =
    period === "project-to-date"
      ? "project"
      : period === "weekly"
        ? "week"
        : period === "monthly"
          ? "month"
          : "day"

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={
            period === "project-to-date"
              ? getRateAnalysisHubHref(projectId)
              : getRateAnalysisPeriodHref(projectId, period)
          }
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          {period === "project-to-date"
            ? "Back to Rate Analysis"
            : `Back to ${periodOption?.shortLabel.toLowerCase()} rates`}
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {periodOption?.label}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{file.label}</h1>
          <p className="text-zinc-500">{projectName}</p>
          <p className="max-w-3xl text-sm text-zinc-600">
            {summary.daysWithEntries} daily file{summary.daysWithEntries === 1 ? "" : "s"} with
            valuations entries · Period actual rate{" "}
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatDailyRate(summary.totals.actualRate)}
            </span>{" "}
            (dashboard cost ÷ dashboard production)
          </p>
        </header>
      </div>

      {projectBoqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zinc-700">No BOQ uploaded yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Upload and name your BOQ from the{" "}
            <Link href={getRateAnalysisHubHref(projectId)} className="font-medium text-zinc-800 underline">
              Rate Analysis home page
            </Link>
            . Each BOQ you add gets its own comparison report here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {projectBoqs.map((boq) => (
            <BoqRateAnalysisSection
              key={`${boq.id}-${version}`}
              boq={boq}
              projectId={projectId}
              summary={summary}
              period={period}
              periodLabel={periodLabel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
