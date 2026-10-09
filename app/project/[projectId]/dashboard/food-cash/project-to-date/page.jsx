import { isActiveProject } from "@/lib/projectList"
import { getCeoCashBookHref } from "@/lib/projectRoutes"
import { notFound, redirect } from "next/navigation"

/** Project to date food cash is CEO EXCLUSIVE only. */
export default async function ProjectToDateFoodCashPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  redirect(getCeoCashBookHref(projectId, "food-cash"))
}
