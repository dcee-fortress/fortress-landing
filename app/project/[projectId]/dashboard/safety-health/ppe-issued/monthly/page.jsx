import { notFound, redirect } from "next/navigation"
import { isActiveProject } from "@/lib/projectList"
import { getPpeIssuedHref } from "@/lib/projectRoutes"

export default async function MonthlyPpeIssuedPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  redirect(getPpeIssuedHref(projectId))
}
