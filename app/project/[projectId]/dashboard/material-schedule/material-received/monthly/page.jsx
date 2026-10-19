import { isActiveProject } from "@/lib/projectList"
import { notFound, redirect } from "next/navigation"

export default async function MonthlyGoodsReceivedPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  redirect(`/project/${projectId}/dashboard/material-schedule/material-received`)
}
