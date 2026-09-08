"use client"

import ChoiceCard from "@/components/project/ChoiceCard"
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

      <div className="app-choice-grid">
        {periodOptions.map((item) => (
          <ChoiceCard
            key={item.period}
            href={getModulePeriodHref(projectId, module, item.period)}
            icon={item.icon}
            title={
              item.period === "project-to-date"
                ? item.shortLabel
                : `${item.shortLabel} ${module.title}`
            }
            description={module.periodListDescriptions?.[item.period] ?? item.description}
            iconClassName={
              module.accentIconClass?.includes("orange")
                ? "app-icon-tile--orange"
                : module.accentIconClass?.includes("emerald")
                  ? "app-icon-tile--emerald"
                  : "app-icon-tile--neutral"
            }
          />
        ))}
      </div>
    </div>
  )
}
