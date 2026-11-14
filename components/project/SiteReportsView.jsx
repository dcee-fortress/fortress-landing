"use client"

import { useEffect, useMemo } from "react"
import Link from "next/link"
import ChoiceCard from "@/components/project/ChoiceCard"
import Icon from "@/components/icon/icon"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  getQsEngineeringHref,
  getSiteReportFileHref,
  getSiteReportPeriodHref,
  getSiteReportsHref,
} from "@/lib/projectRoutes"
import { ensureDailyFilesThroughToday } from "@/lib/dailyFileSync"
import { getDailyFiles, getMonthlyFiles, getWeeklyFiles } from "@/lib/projectFiles"
import { SITE_REPORT_PERIODS } from "@/lib/siteReports"

function filesForPeriod(projectId, period) {
  if (period === "weekly") return getWeeklyFiles(projectId)
  if (period === "monthly") return getMonthlyFiles(projectId)
  return getDailyFiles(projectId)
}

function SiteReportPeriodSelector({ projectId, projectName }) {
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
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Daily, weekly, and monthly files follow the same project calendar as the progress reports.
          Open a file to see that period on one page.
        </p>
      </header>

      <div className="app-choice-grid">
        {SITE_REPORT_PERIODS.map((item) => (
          <ChoiceCard
            key={item.period}
            href={getSiteReportPeriodHref(projectId, item.period)}
            icon={item.icon}
            title={item.label}
            description={item.description}
          />
        ))}
      </div>
    </div>
  )
}

function SiteReportFiles({ projectId, projectName, period }) {
  const { version } = useProjectData()
  const periodMeta = SITE_REPORT_PERIODS.find((item) => item.period === period)

  useEffect(() => {
    ensureDailyFilesThroughToday(projectId)
  }, [projectId])

  const files = useMemo(() => {
    void version
    return [...filesForPeriod(projectId, period)].sort((left, right) => right.id.localeCompare(left.id))
  }, [projectId, period, version])

  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files
  const heading =
    period === "weekly" ? "Weekly report files" : period === "monthly" ? "Monthly report files" : "Daily report files"

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSiteReportsHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Site reports
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">Site reports</p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">{periodMeta?.description}</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {heading} ({displayFiles.length}
            {search.activeQuery ? ` of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, fileId) => getSiteReportFileHref(id, period, fileId)}
          projectId={projectId}
          placeholder={
            period === "weekly"
              ? "Search weekly reports by range or id…"
              : period === "monthly"
                ? "Search monthly reports by month or id…"
                : "Search daily reports by date or id…"
          }
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
                  <span>
                    <span className="block text-lg font-semibold text-zinc-900">{file.label}</span>
                    <span className="block text-sm text-zinc-500">
                      {file.inProgress || file.isToday ? "In progress" : file.completedAt || "Ready"}
                    </span>
                  </span>
                  <Icon name="chevron-right" size={18} className="text-zinc-400" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No site reports match your search."
              : "No files yet. Daily files are created from the project start through today."}
          </div>
        )}
      </section>
    </div>
  )
}

export default function SiteReportsView({ projectId, projectName, period = null }) {
  if (!period) {
    return <SiteReportPeriodSelector projectId={projectId} projectName={projectName} />
  }

  return <SiteReportFiles projectId={projectId} projectName={projectName} period={period} />
}
