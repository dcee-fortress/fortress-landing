import GoodsAcquiredRollupPageClient from "@/components/project/GoodsAcquiredRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredprojecttodatePage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return (
    <GoodsAcquiredRollupPageClient
      projectId={projectId}
      title="Project to date goods acquired"
      description="Project-to-date table of description, unit, quantity, and total cost rolled up from all daily goods acquired entries."
      mode="project-to-date"
    />
  )
}
