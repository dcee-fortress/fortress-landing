import GoodsReceivedRollupPageClient from "@/components/project/GoodsReceivedRollupPageClient"
import { isActiveProject } from "@/lib/projectList"
import { notFound } from "next/navigation"

export default async function ProjectToDateGoodsReceivedPage({ params }) {
  const { projectId } = await params

  if (!isActiveProject(projectId)) {
    notFound()
  }

  return (
    <GoodsReceivedRollupPageClient
      projectId={projectId}
      title="Project to date goods received"
      description="Project-wide table of description, quantity, and total cost rolled up from all daily goods received entries."
      mode="project-to-date"
    />
  )
}
