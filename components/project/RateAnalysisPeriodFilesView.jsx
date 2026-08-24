"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import BoqUploadPanel from "@/components/project/BoqUploadPanel"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import {
  formatRateAnalysisFileLabel,
  getRateAnalysisDetailHref,
  getRateAnalysisHubHref,
  getRateAnalysisPeriodFiles,
  getRateAnalysisPeriodHref,
  RATE_ANALYSIS_PERIODS,
} from "@/lib/rateAnalysis"

function RateAnalysisFileRow({ file, projectId, period }) {
  return (
    <li>
      <Link
        href={getRateAnalysisDetailHref(projectId, period, file.id)}
        className="group flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-100">
            <Icon name="chart-bar" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">
              {formatRateAnalysisFileLabel(file)}
            </p>
            <p className="text-sm text-zinc-500">Open rates and BOQ comparison for this period</p>
          </div>
        </div>
        <Icon name="chevron-right" size={18} className="text-zinc-400 transition group-hover:text-zinc-600" />
      </Link>
    </li>
  )
}

export default function RateAnalysisPeriodFilesView({ projectName, projectId, period }) {
  const { version, refresh } = useProjectData()
  const periodOption = RATE_ANALYSIS_PERIODS.find((item) => item.period === period)
  const files = getRateAnalysisPeriodFiles(projectId, period)
  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files

  return (
    <div className="space-y-6">
      <BoqUploadPanel projectId={projectId} projectName={projectName} onUploaded={refresh} version={version} />

      <header className="space-y-2">
        <Link
          href={getRateAnalysisHubHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Rate Analysis
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {periodOption?.label}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">{periodOption?.listDescription}</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {RATE_ANALYSIS_PERIODS.map((item) => (
          <Link
            key={item.period}
            href={getRateAnalysisPeriodHref(projectId, item.period)}
            className={`rounded-full px-4 py-2 text-sm font-medium ring-1 transition ${
              item.period === period
                ? "bg-emerald-700 text-white ring-emerald-700"
                : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50"
            }`}
          >
            {item.shortLabel}
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {periodOption?.listTitle} ({displayFiles.length}
            {search.activeQuery ? ` of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, fileId) => getRateAnalysisDetailHref(id, period, fileId)}
          projectId={projectId}
          placeholder={periodOption?.searchPlaceholder}
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => (
              <RateAnalysisFileRow
                key={`${file.id}-${version}`}
                file={file}
                projectId={projectId}
                period={period}
              />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery ? periodOption?.emptySearch : periodOption?.emptyList}
          </div>
        )}
      </section>
    </div>
  )
}
