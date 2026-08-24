"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import PlantHoursTotalCard from "@/components/project/PlantHoursTotalCard"
import ReportFileSearchBar, { useReportFileSearch } from "@/components/project/ReportFileSearch"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getDailyFileEntryStatus } from "@/lib/dailyFileSync"
import {
  formatPlantOnSiteFileLabel,
  getModulePeriodListDescription,
  getPeriodFiles,
  getPeriodOption,
  getPlantOnSiteModuleHref,
  getPlantOnSitePeriodFileHref,
} from "@/lib/plantOnSiteModules"
import {
  isMonthlyFileInProgress,
  isWeeklyFileInProgress,
} from "@/lib/periodFiles"
import {
  getEquipmentInUseDailyFileStatus,
  getEquipmentInUsePeriodFileStatus,
} from "@/lib/equipmentInUse"
import { getPlantCostDailyFileStatus } from "@/lib/plantCostData"
import { getPlantHoursProjectToDateSummary } from "@/lib/plantHoursData"
import { getPlantHoursDailyFileStatus } from "@/lib/plantHoursDemo"

function getFileStatus(projectId, period, file, module) {
  if (period === "daily") {
    const status =
      module.key === "plant-hours"
        ? getPlantHoursDailyFileStatus(projectId, file)
        : module.key === "plant-cost" || module.key === "fuel-cost"
          ? getPlantCostDailyFileStatus(projectId, file)
          : module.key === "equipment-in-use"
            ? getEquipmentInUseDailyFileStatus(projectId, file)
            : getDailyFileEntryStatus(projectId, file)
    if (status.key === "in-progress") {
      return { label: "In progress", description: `In progress · ${module.inProgressText}` }
    }
    if (status.key === "awaiting") {
      return { label: "Awaiting entry", description: status.description }
    }
    return { label: "Completed", description: `Completed ${file.completedAt}` }
  }

  if (period === "weekly") {
    if (module.key === "equipment-in-use") {
      return getEquipmentInUsePeriodFileStatus(projectId, period, file)
    }
    const inProgress = isWeeklyFileInProgress(file)
    return inProgress
      ? { label: "In progress", description: `In progress · ${module.inProgressText}` }
      : { label: "Completed", description: `Completed ${file.completedAt}` }
  }

  if (module.key === "equipment-in-use") {
    return getEquipmentInUsePeriodFileStatus(projectId, period, file)
  }

  const inProgress = isMonthlyFileInProgress(file)
  return inProgress
    ? { label: "In progress", description: `In progress · ${module.inProgressText}` }
    : { label: "Completed", description: `Completed ${file.completedAt}` }
}

function statusBadgeClass(label) {
  if (label === "In progress") return "bg-amber-50 text-amber-800 ring-amber-200"
  if (label === "Awaiting entry") return "bg-sky-50 text-sky-800 ring-sky-200"
  return "bg-emerald-50 text-emerald-700 ring-emerald-200"
}

function PeriodFileRow({ file, projectId, module, period }) {
  const status = getFileStatus(projectId, period, file, module)

  return (
    <li>
      <Link
        href={getPlantOnSitePeriodFileHref(projectId, module.key, period, file.id)}
        className="group flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition hover:bg-zinc-50"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${module.accentIconClass}`}
          >
            <Icon name={module.rowIcon} size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-zinc-900">
              {formatPlantOnSiteFileLabel(module, file)}
            </p>
            <p className="text-sm text-zinc-500">{status.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusBadgeClass(status.label)}`}
          >
            {status.label}
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

export default function PlantOnSitePeriodFilesView({ projectName, projectId, module, period }) {
  const { version } = useProjectData()
  const periodOption = getPeriodOption(period, module)
  const files = getPeriodFiles(projectId, period)
  const search = useReportFileSearch(files)
  const displayFiles = search.activeQuery ? search.filteredFiles : files
  const isPlantHours = module.key === "plant-hours"
  const projectToDateSummary = isPlantHours ? getPlantHoursProjectToDateSummary(projectId) : null
  const hoursSummaryCard = projectToDateSummary
    ? {
        title: "Cumulative plant hours · Project to date",
        totalHours: projectToDateSummary.totalHours,
        description:
          period === "daily"
            ? "Total plant hours across all daily files. Open a daily file to enter hours — totals cumulate into weekly and monthly reports."
            : `Total plant hours across ${projectToDateSummary.daysWithEntries} daily file${projectToDateSummary.daysWithEntries === 1 ? "" : "s"}. Open a ${period} file to view rolled-up totals for that period.`,
      }
    : null

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPlantOnSiteModuleHref(projectId, module.key)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {module.title}
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {periodOption.shortLabel} {module.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">{getModulePeriodListDescription(module, period)}</p>
      </header>

      {hoursSummaryCard ? (
        <PlantHoursTotalCard
          title={hoursSummaryCard.title}
          totalHours={hoursSummaryCard.totalHours}
          description={hoursSummaryCard.description}
        />
      ) : null}

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {periodOption.listTitle} ({displayFiles.length}
            {search.activeQuery ? ` of ${files.length}` : ""})
          </h2>
        </div>

        <ReportFileSearchBar
          {...search}
          getFileHref={(id, fileId) => getPlantOnSitePeriodFileHref(id, module.key, period, fileId)}
          projectId={projectId}
          placeholder={periodOption.searchPlaceholder}
        />

        {displayFiles.length > 0 ? (
          <ul className="divide-y divide-zinc-200">
            {displayFiles.map((file) => (
              <PeriodFileRow
                key={`${file.id}-${version}`}
                file={file}
                projectId={projectId}
                module={module}
                period={period}
              />
            ))}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center text-zinc-500">
            {search.activeQuery ? periodOption.emptySearch : periodOption.emptyList}
          </div>
        )}
      </section>
    </div>
  )
}
