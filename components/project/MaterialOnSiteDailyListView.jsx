"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { useHasHydrated } from "@/hooks/useHasHydrated"
import { getMaterialOnSiteStockDayIds } from "@/lib/materialOnSite"
import { getDailyFiles } from "@/lib/projectFiles"
import { getMaterialOnSiteDailyFileHref, getMaterialOnSiteHref } from "@/lib/projectRoutes"

export default function MaterialOnSiteDailyListView({ projectId, projectName }) {
  const hasHydrated = useHasHydrated()
  const { version } = useProjectData()
  void version
  const files = hasHydrated ? getDailyFiles(projectId) : []
  const stockDayIds = new Set(hasHydrated ? getMaterialOnSiteStockDayIds(projectId) : [])
  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getMaterialOnSiteHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Fuel on site
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Daily fuel on site
        </p>
        <h1
          suppressHydrationWarning
          className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl lg:text-4xl"
        >
          {projectName || "Project"}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-500 sm:text-base">
          Open a daily report. Goods on site is what was left the previous day plus goods received
          that day.
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Daily files
            {hasHydrated
              ? ` (${displayFiles.length}${search.activeQuery ? ` of ${files.length}` : ""})`
              : ""}
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, dayId) => getMaterialOnSiteDailyFileHref(id, dayId)}
          projectId={projectId}
          placeholder="Search daily files by date…"
        />

        {!hasHydrated ? (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">Loading daily files…</p>
        ) : displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => {
              const hasGoods = stockDayIds.has(file.id)
              return (
                <li key={`${file.id}-${version}`}>
                  <Link
                    href={getMaterialOnSiteDailyFileHref(projectId, file.id)}
                    prefetch={false}
                    className="app-file-row group transition hover:bg-zinc-50"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="app-icon-tile app-icon-tile--amber">
                        <Icon name="table" size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-semibold text-zinc-900">{file.label}</p>
                        <p className="text-sm text-zinc-500">
                          {hasGoods ? "Goods on site" : "No goods on site"}
                        </p>
                      </div>
                    </div>
                    <Icon
                      name="chevron-right"
                      size={18}
                      className="text-zinc-400 transition group-hover:text-zinc-600"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            {search.activeQuery
              ? "No daily files match your search."
              : "No daily files yet. They are created from the project calendar."}
          </p>
        )}
      </section>
    </div>
  )
}
