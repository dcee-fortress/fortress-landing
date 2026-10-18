import GoodsAcquiredWeekPageClient from "@/components/project/GoodsAcquiredWeekPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredWeekFilePage({ params }) {
  const { projectId, weekId } = await params
  if (!isActiveProject(projectId)) notFound()
  return <GoodsAcquiredWeekPageClient projectId={projectId} weekId={weekId} />
}
