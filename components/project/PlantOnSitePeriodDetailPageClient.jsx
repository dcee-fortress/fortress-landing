"use client"

import { notFound } from "next/navigation"
import PageLoadingShell from "@/components/project/PageLoadingShell"
import { useProjects } from "@/components/project/ProjectsProvider"
import PlantOnSitePeriodDetailView from "@/components/project/PlantOnSitePeriodDetailView"
import { useHydratedProjectRoute } from "@/hooks/useHydratedProjectRoute"
import {
  EQUIPMENT_IN_USE_MODULE,
  PLANT_COST_MODULE,
  getPeriodFile,
  PLANT_HOURS_MODULE,
} from "@/lib/plantOnSiteModules"

const MODULES = {
  "plant-hours": PLANT_HOURS_MODULE,
  "plant-cost": PLANT_COST_MODULE,
  "fuel-cost": PLANT_COST_MODULE,
  "equipment-in-use": EQUIPMENT_IN_USE_MODULE,
}

export default function PlantOnSitePeriodDetailPageClient({
  projectId,
  moduleKey,
  period,
  fileId,
}) {
  const { version } = useProjects()
  const { isReady, project, item } = useHydratedProjectRoute(projectId, () => {
    void version
    return {
      siteModule: MODULES[moduleKey],
      file: getPeriodFile(projectId, period, fileId),
    }
  })

  if (!isReady) {
    return <PageLoadingShell />
  }

  if (!project || !item?.siteModule || !item?.file) {
    notFound()
  }

  return (
    <div className="app-page-frame text-zinc-900">
      <div className="mx-auto max-w-4xl">
        <PlantOnSitePeriodDetailView
          projectName={project.name}
          projectId={projectId}
          module={item.siteModule}
          period={period}
          file={item.file}
        />
      </div>
    </div>
  )
}
