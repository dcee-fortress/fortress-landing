"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { getDailyFiles, getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { formatDayLabelFromId } from "@/lib/progressReportGenerator"
import {
  getQsEngineeringHref,
  getSiteReportFileHref,
  getSiteReportsHref,
  getSiteReportsPeriodHref,
} from "@/lib/projectRoutes"

const PERIODS = [
  {
    id: "daily",
    label: "Daily",
    title: "Daily site reports",
    description: "One page for each day: today's weather, then valuations, materials, equipment, fuel, and incidents.",
    icon: "clock",
  },
  {
    id: "weekly",
    label: "Weekly",
    title: "Weekly site reports",
    description: "One page for each week, rolled from that week's daily entries.",
    icon: "calendar-range",
  },
  {
    id: "monthly",
    label: "Monthly",
    title: "Monthly site reports",
    description: "One page for each month, rolled from that month's daily entries.",
    icon: "calendar-days",
  },
]

function filesForPeriod(projectId, period) {
  if (period === "weekly") return getWeeklyFiles(projectId)
  if (period === "monthly") return getMonthlyFiles(projectId)
  return getDailyFiles(projectId)
}

function fileTitle(period, file) {
  if (period === "daily") return `Daily site report — ${formatDayLabelFromId(file.id)}`
  if (period === "weekly") return file.label || `Weekly site report — ${file.id}`
  return file.label || `Monthly site report — ${file.id}`
}

export function SiteReportsHub({ projectName, projectId }) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getQsEngineeringHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Quantity Survey
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Site reports</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{projectName}</h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open a daily, weekly, or monthly site report. Each report is one page and fills itself from the entries already saved on site.
        </p>
      </header>

      <div className="app-choice-grid">
        {PERIODS.map((period) => (
          <ChoiceCard
            key={period.id}
            href={getSiteReportsPeriodHref(projectId, period.id)}
            icon={period.icon}
            title={period.label}
            description={period.description}
          />
        ))}
      </div>
    </div>
  )
}

export function SiteReportsFiles({ projectName, projectId, period }) {
  const { version } = useProjectData()
  const meta = PERIODS.find((item) => item.id === period) || PERIODS[0]

  useEffect(() => {
    ensureDailyFilesThroughToday(projectId)
  }, [projectId])

  const files = useMemo(() => {
    return [...filesForPeriod(projectId, period)].sort((left, right) =>
      String(right.id).localeCompare(String(left.id))
    )
  }, [period, projectId, version])

  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSiteReportsHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to site reports
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Site reports</p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">{projectName}</h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">{meta.description}</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {meta.title} ({displayFiles.length}
            {search.activeQuery ? ` of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, fileId) => getSiteReportFileHref(id, period, fileId)}
          projectId={projectId}
          placeholder={`Search ${period} site reports…`}
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => (
              <li key={file.id}>
                <Link
                  href={getSiteReportFileHref(projectId, period, file.id)}
                  prefetch={false}
                  className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-zinc-50"
                >
                  <span className="flex min-w-0 items-center gap-4">
                    <span className="app-icon-tile app-icon-tile--blue">
                      <Icon name="file-text" size={20} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold text-zinc-900">{fileTitle(period, file)}</span>
                      <span className="block text-sm text-zinc-500">
                        Weather, valuations, materials on site, equipment, fuel, and incidents on one page.
                      </span>
                    </span>
                  </span>
                  <Icon name="chevron-right" size={18} className="shrink-0 text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No site reports match your search."
              : "No site report files yet. They appear with the project calendar."}
          </div>
        )}
      </section>
    </div>
  )
}
