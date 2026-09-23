import { notFound, redirect } from "next/navigation"
import { isActiveProject } from "@/lib/projectList"
import { getPpeReceivedHref } from "@/lib/projectRoutes"

export default async function WeeklyPpeReceivedPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  redirect(getPpeReceivedHref(projectId))
}
