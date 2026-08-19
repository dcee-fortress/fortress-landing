import { isActiveProject } from "@/lib/projectList"
import { getPlantCostHref } from "@/lib/projectRoutes"
import { redirect } from "next/navigation"

export default async function LegacyFuelCostRedirectPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    redirect("/")
  }

  redirect(getPlantCostHref(projectId))
}
