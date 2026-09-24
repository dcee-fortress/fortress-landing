import { isActiveProject } from "@/lib/projectList"
import { getSheqWeeklyReportFileHref } from "@/lib/projectRoutes"
import { notFound, redirect } from "next/navigation"

/** Legacy week URL → Actual Progress Report week. */
export default async function SheqWeeklyReportLegacyWeekRedirect({ params }) {
  const { projectId, weekId } = await params

  if (!isActiveProject(projectId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(weekId || ""))) {
    notFound()
  }

  redirect(getSheqWeeklyReportFileHref(projectId, weekId, "actual"))
}
