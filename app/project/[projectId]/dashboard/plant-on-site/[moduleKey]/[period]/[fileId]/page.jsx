import PlantOnSitePeriodDetailPageClient from "@/components/project/PlantOnSitePeriodDetailPageClient"
import { PLANT_ON_SITE_PERIOD_MODULE_KEYS } from "@/lib/plantOnSiteModules"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = ["daily", "weekly", "monthly"]

export default async function PlantOnSitePeriodDetailPage({ params }) {
  const { projectId, moduleKey, period, fileId } = await params

  if (!isActiveProject(projectId) || !PERIODS.includes(period)) {
    notFound()
  }

  if (!PLANT_ON_SITE_PERIOD_MODULE_KEYS.includes(moduleKey)) {
    notFound()
  }

  return (
    <PlantOnSitePeriodDetailPageClient
      projectId={projectId}
      moduleKey={moduleKey}
      period={period}
      fileId={fileId}
    />
  )
}
