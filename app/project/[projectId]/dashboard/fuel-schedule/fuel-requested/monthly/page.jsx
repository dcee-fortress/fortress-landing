import { isActiveProject } from "@/lib/projectList"
import { notFound, redirect } from "next/navigation"

export default async function GoodsAcquiredmonthlyPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  redirect(`/project/${projectId}/dashboard/fuel-schedule/fuel-requested`)
}
