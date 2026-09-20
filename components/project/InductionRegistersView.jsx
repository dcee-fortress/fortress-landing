"use client"

import { useEffect } from "react"
import Icon from "@/components/icon/icon"
import Link from "next/link"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getPpeRegistersHref } from "@/lib/projectRoutes"
import { ensureInductionRegistersExist } from "@/lib/inductionRegisterData"
import {
  formatInductionRegisterLabel,
  getInductionRegisterFiles,
  getInductionRegisterHref,
} from "@/lib/inductionRegisters"
import { isMonthlyFileInProgress } from "@/lib/periodFiles"

function RegisterFileRow({ file, projectId }) {
  const inProgress = isMonthlyFileInProgress(file)

  return (
    <li>
      <Link
        href={getInductionRegisterHref(projectId, file.id)}
        className="app-file-row group transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="app-icon-tile app-icon-tile--blue">
            <Icon name="file-text" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">
              {formatInductionRegisterLabel(file)}
            </p>
            <p className="text-sm text-zinc-500">
              {inProgress
                ? "In progress · Induction register open for the month"
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

export default function InductionRegistersView({ projectName, projectId }) {
  const { version, refresh } = useProjectData()

  useEffect(() => {
    if (!projectId) return
    if (ensureInductionRegistersExist(projectId)) refresh()
  }, [projectId, refresh, version])

  const registerFiles = getInductionRegisterFiles(projectId)
  const search = useReportFileSearch(registerFiles)
  const displayFiles = search.activeQuery ? search.filteredFiles : registerFiles

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPpeRegistersHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to PPE registers
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Induction register
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">
          Monthly induction registers are created automatically each month. Open a file to enter
          Name, ID Number, Phone number, Position, and Company name.
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
          getFileHref={getInductionRegisterHref}
          projectId={projectId}
          placeholder="Search induction register files…"
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
              ? "No induction register files match your search."
              : "No monthly induction register files yet."}
          </div>
        )}
      </section>
    </div>
  )
}
