"use client"

import { useEffect } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getSafetyHealthHref } from "@/lib/projectRoutes"
import { ensureSiteStaffRegistersExist } from "@/lib/siteStaffRegisterData"
import {
  formatSiteStaffRegisterLabel,
  getSiteStaffRegisterFiles,
  getSiteStaffRegisterHref,
} from "@/lib/siteStaffRegisters"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"

function RegisterFileRow({ file, projectId }) {
  const inProgress = isMonthlyFileInProgress(file)

  return (
    <li>
      <Link
        href={getSiteStaffRegisterHref(projectId, file.id)}
        className="app-file-row group transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="app-icon-tile app-icon-tile--blue">
            <Icon name="users" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">
              {formatSiteStaffRegisterLabel(file)}
            </p>
            <p className="text-sm text-zinc-500">
              {inProgress
                ? "In progress · Site staff attendance open for the month"
                : `Completed ${file.completedAt}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
              inProgress
                ? "bg-amber-50 text-amber-800 ring-amber-200"
                : "bg-emerald-50 text-emerald-700 ring-emerald-200"
            }`}
          >
            {inProgress ? "In progress" : "Completed"}
          </span>
          <Icon
            name="chevron-right"
            size={18}
            className="text-zinc-400 transition group-hover:text-zinc-600"
          />
        </div>
      </Link>
    </li>
  )
}

export default function SiteStaffRegistersView({ projectName, projectId }) {
  const { version, refresh } = useProjectData()

  useEffect(() => {
    if (!projectId) return
    if (ensureSiteStaffRegistersExist(projectId)) refresh()
  }, [projectId, refresh])

  const registerFiles = getSiteStaffRegisterFiles(projectId)
  const search = useReportFileSearch(registerFiles)
  const displayFiles = search.activeQuery ? search.filteredFiles : registerFiles

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getSafetyHealthHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Safety & Health
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Site Staff attendance register
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Monthly site staff registers are created automatically each month. Open a register to
          enter name and role, then click a day box for present or double-click for absent (X).
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Monthly Register Files ({displayFiles.length}
            {search.activeQuery ? ` of ${registerFiles.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={getSiteStaffRegisterHref}
          projectId={projectId}
          placeholder="Search register files by month, year, or id…"
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => (
              <RegisterFileRow key={`${file.id}-${version}`} file={file} projectId={projectId} />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery
              ? "No register files match your search."
              : "No register files yet. They will be created automatically each month from project start."}
          </div>
        )}
      </section>
    </div>
  )
}
