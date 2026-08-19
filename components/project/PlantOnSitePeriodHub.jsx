"use client"

import Icon from "@/components/icon/icon"
import Link from "next/link"
import PlantHoursTotalCard from "@/components/project/PlantHoursTotalCard"
import { useProjectData } from "@/components/project/ProjectDataProvider"
import { getPlantHoursProjectToDateSummary } from "@/lib/plantHoursData"
import {
  getModulePeriodHref,
  getModulePeriodOptions,
} from "@/lib/plantOnSiteModules"
import { getPlantOnSiteHref } from "@/lib/projectRoutes"

export default function PlantOnSitePeriodHub({ projectId, projectName, module }) {
  const { version } = useProjectData()
  void version

  const periodOptions = getModulePeriodOptions(module)
  const isPlantHours = module.key === "plant-hours"
  const projectToDateSummary = isPlantHours ? getPlantHoursProjectToDateSummary(projectId) : null

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href={getPlantOnSiteHref(projectId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-500 transition hover:text-zinc-800"
        >
          <Icon name="arrow-left" size={16} />
          Back to Plant on Site
        </Link>
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {module.title}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{projectName}</h1>
        <p className="max-w-2xl text-zinc-500">{module.hubDescription}</p>
      </header>

      {isPlantHours && projectToDateSummary ? (
        <PlantHoursTotalCard
          title="Cumulative plant hours · Project to date"
          totalHours={projectToDateSummary.totalHours}
          description={`Total plant hours recorded across ${projectToDateSummary.daysWithEntries} daily file${projectToDateSummary.daysWithEntries === 1 ? "" : "s"} from project start. Daily entries cumulate automatically into weekly and monthly totals.`}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {periodOptions.map((item) => (
          <Link
            key={item.period}
            href={getModulePeriodHref(projectId, module, item.period)}
            className="group flex items-start gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition ${module.accentIconClass}`}
            >
              <Icon name={item.icon} size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold text-zinc-900">
                {item.period === "project-to-date"
                  ? item.shortLabel
                  : `${item.shortLabel} ${module.title}`}
              </h2>
              <p className="text-sm leading-relaxed text-zinc-500">
                {module.periodListDescriptions?.[item.period] ?? item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
