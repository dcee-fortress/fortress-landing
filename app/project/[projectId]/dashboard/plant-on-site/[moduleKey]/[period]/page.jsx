import PlantOnSitePeriodPageClient from "@/components/project/PlantOnSitePeriodPageClient"
import { PLANT_ON_SITE_PERIOD_MODULE_KEYS } from "@/lib/plantOnSiteModules"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

const PERIODS = ["daily", "weekly", "monthly"]

export default async function PlantOnSitePeriodPage({ params }) {
  const { projectId, moduleKey, period } = await params

  if (!isActiveProject(projectId) || !PERIODS.includes(period)) {
    notFound()
  }

  if (!PLANT_ON_SITE_PERIOD_MODULE_KEYS.includes(moduleKey)) {
    notFound()
  }

  return (
    <PlantOnSitePeriodPageClient projectId={projectId} moduleKey={moduleKey} period={period} />
  )
}
