"use client"

import { useMemo } from "react"
import Link from "next/link"
import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  formatQsOverviewCell,
  getQsOverviewBackHref,
  getQsOverviewHref,
  getQsOverviewRowsForPeriod,
  marginToneClass,
  summarizeQsOverviewRows,
} from "@/lib/qsOverview"
import { getRateAnalysisHubHref } from "@/lib/rateAnalysis"
import {
  getMaterialAnalysisHref,
  getMaterialSchedulesHref,
} from "@/lib/projectRoutes"
import {
  getVariationReviewHref,
  listPendingValuationVariations,
} from "@/lib/valuationVariations"

export default function QsOverviewView({ projectId, projectName }) {
  const { version } = useProjectData()

  const pending = useMemo(() => {
    void version
    return listPendingValuationVariations(projectId)
  }, [projectId, version])

  const projectTotals = useMemo(() => {
    void version
    return summarizeQsOverviewRows(
      getQsOverviewRowsForPeriod(projectId, "project-to-date", "project")
    )
  }, [projectId, version])

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsOverviewBackHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Quantity Survey
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Head QS Overview</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {projectName}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Planned and actual margins roll from valuations entry after Save (project to date from 13
          November). Open Rate Analysis or BOQ analysis below.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Planned Margin</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${marginToneClass(projectTotals.plannedMargin)}`}>
            {formatQsOverviewCell("plannedMargin", projectTotals.plannedMargin)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Bill cost − Allowed cost</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm font-medium text-zinc-500">Actual Margin</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${marginToneClass(projectTotals.actualMargin)}`}>
            {formatQsOverviewCell("actualMargin", projectTotals.actualMargin)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Bill cost − Actual cost</p>
        </div>
      </div>

      {pending.length > 0 ? (
        <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <h2 className="text-sm font-semibold text-amber-900">Variation notifications</h2>
          <ul className="space-y-2">
            {pending.map((item) => (
              <li key={item.id}>
                <Link
                  href={getVariationReviewHref(projectId, item.id)}
                  className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white px-4 py-3 text-sm transition hover:bg-amber-50"
                >
                  <span className="font-medium text-zinc-900">
                    Variation submitted for {item.dayId}
                  </span>
                  <span className="text-amber-800">Review</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="app-choice-grid">
        <ChoiceCard
          href={`${getQsOverviewHref(projectId)}/margin-table`}
          icon="table"
          title="Rate Analysis"
          description="Daily, weekly, monthly, and project-to-date margin dashboards"
        />
        <ChoiceCard
          href={getRateAnalysisHubHref(projectId)}
          icon="chart-bar"
          title="BOQ analysis"
          description="Upload a BOQ and build actual cost from its descriptions"
        />
        <ChoiceCard
          href={getMaterialAnalysisHref(projectId)}
          icon="package"
          title="Material analysis"
          description="Material analysis rolled from material schedule entries"
        />
        <ChoiceCard
          href={`${getMaterialSchedulesHref(projectId)}/project-to-date`}
          icon="hard-hat"
          title="Project to date fuel consumed"
          description="Cumulative fuel consumed for the whole project"
        />
      </div>
    </div>
  )
}
