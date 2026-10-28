"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { useProjects } from "@/components/project/ProjectsProvider"
import { getGoodsAcquiredWeeklyFiles } from "@/lib/goodsAcquired"
import { isWeeklyFileInProgress } from "@/lib/periodFiles"
import { getGoodsAcquiredHref, getGoodsAcquiredWeeklyFileHref } from "@/lib/projectRoutes"

export default function GoodsAcquiredWeeklyListView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjects()
  void version
  const files = hasHydrated ? getGoodsAcquiredWeeklyFiles(projectId) : []
  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getGoodsAcquiredHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Bulk fuel inserted in tank
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Weekly bulk fuel inserted in tank
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          A weekly file is created for every new week from the project start. Open a file to see
          that week&apos;s bulk fuel inserted in tank dashboard.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Weekly files
            {hasHydrated
              ? ` (${displayFiles.length}${search.activeQuery ? ` of ${files.length}` : ""})`
              : ""}
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getGoodsAcquiredWeeklyFileHref}
          projectId={projectId}
          placeholder="Search weekly files by week…"
        />

        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading weekly files…</p>
        ) : displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => {
              const inProgress = isWeeklyFileInProgress(file)
              return (
                <li key={file.id}>
                  <Link
                    href={getGoodsAcquiredWeeklyFileHref(projectId, file.id)}
                    prefetch={false}
                    className="app-file-row group transition hover:bg-zinc-50"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="app-icon-tile app-icon-tile--emerald">
                        <Icon name="calendar-range" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-zinc-900">{file.label}</p>
                        <p className="text-sm text-zinc-500">
                          {inProgress
                            ? "In progress · daily bulk fuel inserted in tank rolls into this week"
                            : "Completed · weekly bulk fuel inserted in tank dashboard"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                        inProgress
                          ? "bg-amber-50 text-amber-800 ring-amber-200"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      }`}
                    >
                      {inProgress ? "In progress" : "Completed"}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            {search.activeQuery
              ? "No weekly files match your search."
              : "No weekly files yet. They are created from the project start date."}
          </p>
        )}
      </section>
    </div>
  )
}
