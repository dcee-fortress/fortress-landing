import GoodsAcquiredRollupPageClient from "@/components/project/GoodsAcquiredRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function GoodsAcquiredweeklyPage({ params }) {
  const { projectId } = await params
  if (!isActiveProject(projectId)) notFound()
  return (
    <GoodsAcquiredRollupPageClient
      projectId={projectId}
      title="Weekly goods acquired"
      description="Weekly table of description, unit, quantity, and total cost rolled up from daily goods acquired entries."
      mode="weekly"
    />
  )
}
