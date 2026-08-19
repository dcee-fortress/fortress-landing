"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import DailyPlantRateAnalysis from "@/components/project/DailyPlantRateAnalysis"
import EquipmentInUseTable from "@/components/project/EquipmentInUseTable"
import PlantCostTable from "@/components/project/PlantCostTable"
import PlantHoursTable from "@/components/project/PlantHoursTable"
import {
  formatPlantOnSiteFileLabel,
  getPeriodOption,
  getPlantOnSitePeriodHref,
} from "@/lib/plantOnSiteModules"
import { getEquipmentInUseDetailDescription } from "@/lib/equipmentInUse"
import { getPlantCostDetailDescription } from "@/lib/plantCostData"
import { getPlantHoursDetailDescription } from "@/lib/plantHoursData"
import { getDailyFileEntryStatus } from "@/lib/dailyFileSync"
import {
  isMonthlyFileInProgress,
  isWeeklyFileInProgress,
} from "@/lib/periodFiles"

function getDetailStatus(projectId, period, file) {
  if (period === "daily") {
    return getDailyFileEntryStatus(projectId, file).label
  }
  if (period === "weekly") {
    return isWeeklyFileInProgress(file) ? "In progress" : "Completed"
  }
  return isMonthlyFileInProgress(file) ? "In progress" : "Completed"
}

function statusBadgeClass(label) {
  if (label === "In progress") return "bg-amber-50 text-amber-800 ring-amber-200"
  if (label === "Awaiting entry") return "bg-sky-50 text-sky-800 ring-sky-200"
  return "bg-emerald-50 text-emerald-700 ring-emerald-200"
}

export default function PlantOnSitePeriodDetailView({
  projectName,
  projectId,
  module,
  period,
  file,
}) {
  if ((module.key === "plant-cost" || module.key === "fuel-cost") && period === "daily") {
    return (
      <DailyPlantRateAnalysis
        projectName={projectName}
        projectId={projectId}
        module={module}
        file={file}
      />
    )
  }

  const periodOption = getPeriodOption(period, module)
  const statusLabel = getDetailStatus(projectId, period, file)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getPlantOnSitePeriodHref(projectId, module.key, period)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to {periodOption.shortLabel.toLowerCase()} files
        </Link>
        <header className="space-y-1">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            {periodOption.shortLabel} {module.title}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            {formatPlantOnSiteFileLabel(module, file)}
          </h1>
          <p className="text-zinc-500">{projectName}</p>
        </header>
      </div>

      <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {periodOption.shortLabel} {module.title} Entry
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {module.key === "plant-hours"
                ? getPlantHoursDetailDescription(period)
                : module.key === "plant-cost" || module.key === "fuel-cost"
                  ? getPlantCostDetailDescription(period)
                  : module.key === "equipment-in-use"
                    ? getEquipmentInUseDetailDescription(period)
                    : module.detailDescription}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusBadgeClass(statusLabel)}`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {module.key === "plant-hours" ? (
            <PlantHoursTable projectId={projectId} period={period} fileId={file.id} />
          ) : module.key === "plant-cost" || module.key === "fuel-cost" ? (
            <PlantCostTable projectId={projectId} period={period} fileId={file.id} />
          ) : module.key === "equipment-in-use" ? (
            <EquipmentInUseTable
              projectId={projectId}
              projectName={projectName}
              period={period}
              fileId={file.id}
            />
          ) : (
            <div className="py-12 text-center text-zinc-500">
              <p>
                {module.title} entries for {file.label} will appear here.
              </p>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
