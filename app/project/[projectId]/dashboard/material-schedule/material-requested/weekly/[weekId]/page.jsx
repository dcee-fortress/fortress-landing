import { isActiveProject } from "@/lib/projectList"
import { notFound, redirect } from "next/navigation"

export default async function GoodsAcquiredWeekFilePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  redirect(`/project/${projectId}/dashboard/material-schedule/material-requested`)
}
